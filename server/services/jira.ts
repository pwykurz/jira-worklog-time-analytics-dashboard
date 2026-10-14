import { JiraSession } from '../auth/config';
import { dateStartMs } from '../lib/dates';
import { WorklogRecord } from '../types';
import { jiraApiBase, jiraRequest } from './jiraClient';

interface JiraConfig {
  session: JiraSession;
  projectKey?: string;
  includeIssuesWithoutWorklogs: boolean;
}

interface ParentRef {
  id: string;
  key: string;
  summary: string;
  type: string;
}

interface ParentChainItem {
  key: string;
  summary: string;
  type: string;
  sprint: string;
}

interface CachedIssue {
  key: string;
  summary: string;
  issue_type: string;
  labels: string[];
  status: string;
  sprint: string;
  fix_versions: string;
  parent_ref: ParentRef | null;
  parent_chain: ParentChainItem[];
}

interface JiraWorklog {
  id: string;
  issueId: string;
  started: string;
  timeSpent: string;
  timeSpentSeconds: number;
  comment?: unknown;
  author?: {
    displayName?: string;
    emailAddress?: string;
    accountId?: string;
  };
}

class JiraTimeExtractor {
  private config: JiraConfig;
  private issueCache = new Map<string, CachedIssue>();
  private requestCount = 0;

  constructor(config: JiraConfig) {
    this.config = config;
  }

  private async request(method: string, path: string, options: RequestInit = {}): Promise<any> {
    this.requestCount += 1;
    return jiraRequest(this.config.session, path, { method, ...options });
  }

  async getWorklogsForRange(from: string, to: string): Promise<WorklogRecord[]> {
    const since = dateStartMs(from);
    console.log(`Fetching worklogs from ${from} to ${to}...`);

    const worklogIds = await this.getUpdatedWorklogIds(since);
    console.log(`Found ${worklogIds.length} worklog IDs to check...`);

    const batchSize = 1000;
    const worklogsToProcess: JiraWorklog[] = [];

    for (let i = 0; i < worklogIds.length; i += batchSize) {
      const batch = worklogIds.slice(i, i + batchSize);
      const worklogsData = await this.getWorklogsByIds(batch);

      for (const worklog of worklogsData) {
        const startedDate = String(worklog.started || '').slice(0, 10);
        if (startedDate >= from && startedDate < to) {
          worklogsToProcess.push(worklog);
        }
      }
    }

    console.log(`  ${worklogsToProcess.length} worklogs in date range. Fetching issue details...`);

    const uniqueIssueIds = [...new Set(worklogsToProcess.map(worklog => String(worklog.issueId)))];
    await this.bulkFetchIssues(uniqueIssueIds);

    const allWorklogs: WorklogRecord[] = [];
    for (const worklog of worklogsToProcess) {
      const entry = this.buildWorklogEntry(worklog);
      if (entry) {
        allWorklogs.push(entry);
      }
    }

    if (this.config.includeIssuesWithoutWorklogs) {
      const scopeIssueIds = await this.fetchIssueIdsForScope(from, to);
      this.appendIssuesWithoutWorklogs(allWorklogs, scopeIssueIds);
    }

    console.log(`  Done. ${this.requestCount} API requests made.`);
    return allWorklogs;
  }

  private buildWorklogEntry(worklog: JiraWorklog): WorklogRecord | null {
    const issueInfo = this.issueCache.get(String(worklog.issueId));
    if (!issueInfo) {
      return null;
    }

    if (this.config.projectKey && !issueInfo.key.startsWith(this.config.projectKey)) {
      return null;
    }

    const parentData = this.parentFields(issueInfo.parent_chain);

    return {
      id: String(worklog.id),
      issue_key: issueInfo.key,
      issue_summary: issueInfo.summary,
      issue_type: issueInfo.issue_type,
      status: issueInfo.status,
      sprint: issueInfo.sprint,
      fix_versions: issueInfo.fix_versions,
      labels: issueInfo.labels.join(', '),
      author: worklog.author?.displayName || 'Unassigned',
      author_email: worklog.author?.emailAddress || '',
      author_account_id: worklog.author?.accountId || '',
      time_spent: worklog.timeSpent,
      time_spent_seconds: Number(worklog.timeSpentSeconds) || 0,
      started: worklog.started,
      comment: this.extractCommentText(worklog.comment),
      has_worklog: true,
      ...parentData
    };
  }

  private parentFields(chain: ParentChainItem[]): Record<string, string> {
    const parentData: Record<string, string> = {};
    chain.forEach((parent, index) => {
      const idx = index + 1;
      parentData[`parent_${idx}_key`] = parent.key;
      parentData[`parent_${idx}_summary`] = parent.summary;
      parentData[`parent_${idx}_type`] = parent.type;
      parentData[`parent_${idx}_sprint`] = parent.sprint;
    });
    return parentData;
  }

  private async getUpdatedWorklogIds(sinceTimestamp: number): Promise<string[]> {
    const worklogIds: string[] = [];
    let url: string | null = `${jiraApiBase(this.config.session)}/rest/api/3/worklog/updated?since=${sinceTimestamp}`;

    while (url) {
      const data = await this.request('GET', url);
      for (const item of data.values || []) {
        worklogIds.push(String(item.worklogId));
      }

      if (data.lastPage !== false) {
        break;
      }

      url = data.nextPage || null;
      if (url && url.startsWith('http') && !url.includes('api.atlassian.com')) {
        const parsed = new URL(url);
        url = `${jiraApiBase(this.config.session)}${parsed.pathname}${parsed.search}`;
      }
    }

    return worklogIds;
  }

  private async getWorklogsByIds(worklogIds: string[]): Promise<JiraWorklog[]> {
    if (worklogIds.length === 0) {
      return [];
    }

    const url = `/rest/api/3/worklog/list`;
    const numericIds = worklogIds.map(id => Number(id)).filter(id => !Number.isNaN(id));
    const data = await this.request('POST', url, {
      body: JSON.stringify({ ids: numericIds.length ? numericIds : worklogIds })
    });

    return Array.isArray(data) ? data : [];
  }

  private async jqlSearch(jql: string, fields: string[]): Promise<any[]> {
    const url = `/rest/api/3/search/jql`;
    const allIssues: any[] = [];
    let nextPageToken: string | undefined;

    while (true) {
      const payload: Record<string, unknown> = {
        jql,
        fields,
        maxResults: 100
      };
      if (nextPageToken) {
        payload.nextPageToken = nextPageToken;
      }

      const data = await this.request('POST', url, { body: JSON.stringify(payload) });
      allIssues.push(...(data.issues || []));

      if (data.isLast !== false) {
        break;
      }

      nextPageToken = data.nextPageToken;
      if (!nextPageToken) {
        break;
      }
    }

    return allIssues;
  }

  private async bulkFetchIssues(issueIds: string[]): Promise<void> {
    const uncachedIds = issueIds.filter(id => !this.issueCache.has(id));
    if (uncachedIds.length === 0) {
      return;
    }

    console.log(`  Fetching ${uncachedIds.length} unique issues...`);
    const fields = ['key', 'summary', 'labels', 'status', 'sprint', 'fixVersions', 'parent', 'issuetype'];
    const batchSize = 100;
    let fetched = 0;

    for (let i = 0; i < uncachedIds.length; i += batchSize) {
      const batch = uncachedIds.slice(i, i + batchSize);
      const jql = `id in (${batch.join(',')})`;

      try {
        const issues = await this.jqlSearch(jql, fields);
        for (const issueData of issues) {
          this.processIssueToCache(issueData);
        }
        fetched += issues.length;
        console.log(`    Progress: ${fetched}/${uncachedIds.length} issues fetched`);
      } catch (error) {
        console.log(`    Warning: JQL search failed for batch: ${error}`);
        for (const issueId of batch) {
          try {
            const url = `/rest/api/3/issue/${issueId}?fields=${fields.join(',')}`;
            const data = await this.request('GET', url);
            this.processIssueToCache(data);
            fetched += 1;
          } catch (innerError) {
            console.log(`    Warning: Could not fetch issue ${issueId}: ${innerError}`);
          }
        }
      }
    }

    await this.resolveAllParentChains();
  }

  private async fetchIssueIdsForScope(from: string, to: string): Promise<string[]> {
    const conditions: string[] = [];
    if (this.config.projectKey) {
      conditions.push(`project = "${this.config.projectKey}"`);
    }
    conditions.push(`updated >= "${from}"`);
    conditions.push(`updated < "${to}"`);

    const jql = conditions.join(' AND ');
    const fields = ['key', 'summary', 'labels', 'status', 'sprint', 'fixVersions', 'parent', 'issuetype'];
    const issues = await this.jqlSearch(jql, fields);
    const scopeIssueIds: string[] = [];

    for (const issueData of issues) {
      this.processIssueToCache(issueData);
      scopeIssueIds.push(String(issueData.id));
    }

    await this.resolveAllParentChains();
    return scopeIssueIds;
  }

  private appendIssuesWithoutWorklogs(entries: WorklogRecord[], scopeIssueIds: string[]): void {
    const issueKeysWithWorklogs = new Set(entries.map(entry => entry.issue_key));
    let addedCount = 0;

    for (const issueId of scopeIssueIds) {
      const issueInfo = this.issueCache.get(issueId);
      if (!issueInfo || issueKeysWithWorklogs.has(issueInfo.key)) {
        continue;
      }

      if (this.config.projectKey && !issueInfo.key.startsWith(this.config.projectKey)) {
        continue;
      }

      entries.push({
        id: `issue-${issueInfo.key}`,
        issue_key: issueInfo.key,
        issue_summary: issueInfo.summary,
        issue_type: issueInfo.issue_type,
        status: issueInfo.status,
        sprint: issueInfo.sprint,
        fix_versions: issueInfo.fix_versions,
        labels: issueInfo.labels.join(', '),
        author: '',
        author_email: '',
        author_account_id: '',
        time_spent: '0h 0m',
        time_spent_seconds: 0,
        started: '',
        comment: '',
        has_worklog: false,
        ...this.parentFields(issueInfo.parent_chain)
      });
      addedCount += 1;
    }

    if (addedCount) {
      console.log(`  Added ${addedCount} issues without worklogs.`);
    }
  }

  private processIssueToCache(issueData: any): void {
    const issueId = String(issueData.id);
    const fields = issueData.fields || {};
    let sprintName = '';
    const sprintData = fields.sprint;
    if (sprintData && typeof sprintData === 'object') {
      sprintName = sprintData.name || '';
    }

    const fixVersions = (fields.fixVersions || []).map((version: { name?: string }) => version.name || '');
    const parent = fields.parent;
    let parentRef: ParentRef | null = null;
    if (parent) {
      parentRef = {
        id: String(parent.id || ''),
        key: parent.key || '',
        summary: parent.fields?.summary || '',
        type: parent.fields?.issuetype?.name || ''
      };
    }

    this.issueCache.set(issueId, {
      key: issueData.key,
      summary: fields.summary || '',
      issue_type: fields.issuetype?.name || '',
      labels: fields.labels || [],
      status: fields.status?.name || '',
      sprint: sprintName,
      fix_versions: fixVersions.join(', '),
      parent_ref: parentRef,
      parent_chain: []
    });
  }

  private async resolveAllParentChains(): Promise<void> {
    const fields = ['key', 'summary', 'labels', 'status', 'sprint', 'fixVersions', 'parent', 'issuetype'];
    let missingParentIds = new Set<string>();

    for (const issue of this.issueCache.values()) {
      const ref = issue.parent_ref;
      if (ref?.id && !this.issueCache.has(ref.id)) {
        missingParentIds.add(ref.id);
      }
    }

    const maxDepth = 10;
    let depth = 0;
    while (missingParentIds.size > 0 && depth < maxDepth) {
      depth += 1;
      const uncached = [...missingParentIds].filter(id => !this.issueCache.has(id));
      if (uncached.length === 0) {
        break;
      }

      console.log(`  Fetching ${uncached.length} parent issues (depth ${depth})...`);
      const newMissing = new Set<string>();
      const batchSize = 100;

      for (let i = 0; i < uncached.length; i += batchSize) {
        const batch = uncached.slice(i, i + batchSize);
        const jql = `id in (${batch.join(',')})`;

        try {
          const issues = await this.jqlSearch(jql, fields);
          for (const issueData of issues) {
            this.processIssueToCache(issueData);
            const ref = this.issueCache.get(String(issueData.id))?.parent_ref;
            if (ref?.id && !this.issueCache.has(ref.id)) {
              newMissing.add(ref.id);
            }
          }
        } catch (error) {
          console.log(`    Warning: JQL search failed for parents: ${error}`);
          for (const parentId of batch) {
            try {
              const url = `/rest/api/3/issue/${parentId}?fields=${fields.join(',')}`;
              const data = await this.request('GET', url);
              this.processIssueToCache(data);
              const ref = this.issueCache.get(String(data.id))?.parent_ref;
              if (ref?.id && !this.issueCache.has(ref.id)) {
                newMissing.add(ref.id);
              }
            } catch (innerError) {
              console.log(`    Warning: Could not fetch parent issue ${parentId}: ${innerError}`);
            }
          }
        }
      }

      missingParentIds = newMissing;
    }

    for (const issue of this.issueCache.values()) {
      if (issue.parent_chain.length === 0) {
        issue.parent_chain = this.buildParentChainFromCache(issue);
      }
    }
  }

  private buildParentChainFromCache(issue: CachedIssue): ParentChainItem[] {
    const chain: ParentChainItem[] = [];
    const visited = new Set<string>();
    let current: CachedIssue | undefined = issue;

    while (current) {
      const ref = current.parent_ref;
      if (!ref?.id) {
        break;
      }
      if (visited.has(ref.id)) {
        break;
      }
      visited.add(ref.id);

      const parentCached = this.issueCache.get(ref.id);
      if (parentCached) {
        chain.push({
          key: parentCached.key,
          summary: parentCached.summary,
          type: parentCached.issue_type,
          sprint: parentCached.sprint
        });
        current = parentCached;
      } else {
        chain.push({
          key: ref.key,
          summary: ref.summary,
          type: ref.type,
          sprint: ''
        });
        break;
      }
    }

    return chain;
  }

  private extractCommentText(comment: unknown): string {
    if (!comment) {
      return '';
    }
    if (typeof comment === 'string') {
      return comment;
    }
    if (typeof comment === 'object' && comment !== null && (comment as { type?: string }).type === 'doc') {
      const texts: string[] = [];
      for (const content of (comment as { content?: unknown[] }).content || []) {
        texts.push(...this.extractAdfText(content));
      }
      return texts.join(' ');
    }
    return String(comment);
  }

  private extractAdfText(node: unknown): string[] {
    const texts: string[] = [];
    if (node && typeof node === 'object') {
      const record = node as { type?: string; text?: string; content?: unknown[] };
      if (record.type === 'text') {
        texts.push(record.text || '');
      }
      for (const child of record.content || []) {
        texts.push(...this.extractAdfText(child));
      }
    }
    return texts;
  }
}

const rangeCache = new Map<string, WorklogRecord[]>();
const inflight = new Map<string, Promise<WorklogRecord[]>>();

export async function fetchJiraWorklogs(
  session: JiraSession,
  from: string,
  to: string,
  projectKey?: string
): Promise<WorklogRecord[]> {
  const config: JiraConfig = {
    session,
    projectKey,
    includeIssuesWithoutWorklogs: process.env.JIRA_INCLUDE_ISSUES_WITHOUT_WORKLOGS === 'true'
  };
  const cacheKey = `${session.accountId}|${session.cloudId}|${from}|${to}|${config.projectKey || '*'}|${config.includeIssuesWithoutWorklogs}`;
  const cached = rangeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pending = inflight.get(cacheKey);
  if (pending) {
    return pending;
  }

  const extractor = new JiraTimeExtractor(config);
  const promise = extractor
    .getWorklogsForRange(from, to)
    .then(worklogs => {
      rangeCache.set(cacheKey, worklogs);
      return worklogs;
    })
    .finally(() => {
      inflight.delete(cacheKey);
    });

  inflight.set(cacheKey, promise);
  return promise;
}
