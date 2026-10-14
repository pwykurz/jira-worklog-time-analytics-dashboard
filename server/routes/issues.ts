import { Request, Response, Router } from 'express';
import { requireJiraAuth, requireJiraSite } from '../auth/middleware';
import { jiraRequest } from '../services/jiraClient';
import { isIsoDate } from '../lib/dates';

export const issuesRouter = Router();

function jqlEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function splitList(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }
  return value.split(',').map(part => part.trim()).filter(Boolean);
}

function expandLabelVariants(labels: string[]): string[] {
  const expanded = new Set<string>();
  for (const label of labels) {
    const trimmed = label.trim();
    if (!trimmed) {
      continue;
    }
    const lower = trimmed.toLowerCase();
    const titled = lower.charAt(0).toUpperCase() + lower.slice(1);
    expanded.add(trimmed);
    expanded.add(lower);
    expanded.add(titled);
    expanded.add(trimmed.toUpperCase());
  }
  return [...expanded];
}

async function searchMissing(req: Request, res: Response): Promise<void> {
  try {
    const from = isIsoDate(req.query.from) ? String(req.query.from) : '';
    const to = isIsoDate(req.query.to) ? String(req.query.to) : '';
    if (!from || !to || from >= to) {
      res.status(400).json({ error: 'Provide a valid from/to date range.' });
      return;
    }

    const projects = splitList(req.query.projects);
    const labels = expandLabelVariants(splitList(req.query.labels));
    const excludedStatuses = splitList(req.query.excludeStatuses);

    const clauses = [
      '(timespent is EMPTY OR timespent = 0)',
      'statusCategory != Done',
      `updated >= "${from}"`,
      `updated < "${to}"`
    ];
    if (projects.length) {
      clauses.push(`project in (${projects.map(key => `"${jqlEscape(key)}"`).join(', ')})`);
    }
    if (labels.length) {
      clauses.push(`labels in (${labels.map(label => `"${jqlEscape(label)}"`).join(', ')})`);
    }
    if (excludedStatuses.length) {
      clauses.push(`status not in (${excludedStatuses.map(status => `"${jqlEscape(status)}"`).join(', ')})`);
    }

    const jql = clauses.join(' AND ');
    const issues: Array<Record<string, unknown>> = [];
    let nextPageToken: string | undefined;

    while (true) {
      const payload: Record<string, unknown> = {
        jql,
        fields: ['summary', 'status', 'updated', 'assignee', 'labels', 'project', 'parent', 'issuetype'],
        maxResults: 100
      };
      if (nextPageToken) {
        payload.nextPageToken = nextPageToken;
      }
      const data = await jiraRequest<{
        issues?: any[];
        isLast?: boolean;
        nextPageToken?: string;
      }>(req.jira!, '/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      issues.push(...(data.issues || []));
      if (data.isLast !== false || !data.nextPageToken) {
        break;
      }
      nextPageToken = data.nextPageToken;
    }

    res.json({
      jql,
      issues: issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields?.summary || '',
        status: issue.fields?.status?.name || '',
        updated: issue.fields?.updated || '',
        assignee: issue.fields?.assignee?.displayName || '',
        labels: (issue.fields?.labels || []).join(', '),
        projectKey: issue.fields?.project?.key || String(issue.key || '').split('-')[0],
        epic: issue.fields?.parent?.fields?.summary || '',
        epicKey: issue.fields?.parent?.key || '',
        issueType: issue.fields?.issuetype?.name || ''
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search issues.';
    console.error('GET /api/issues/missing-worklogs failed:', message);
    res.status(502).json({ error: message });
  }
}

issuesRouter.get('/missing-worklogs', requireJiraAuth, requireJiraSite, searchMissing);
issuesRouter.get('/search', requireJiraAuth, requireJiraSite, searchMissing);
