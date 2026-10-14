import { JiraWorklogItem } from '@/types';
import { matchesAnyLabel } from '@/lib/labels';
import { secondsToDecimalHours, secondsToFormattedTime } from '@/lib/timeUtils';

export interface AggregatedIssue {
  issue_key: string;
  issue_summary: string;
  issue_type: string;
  status: string;
  labels: string;
  epic: string;
  authors: string[];
  last_author: string;
  last_started: string;
  time_spent_seconds: number;
  time_spent: string;
  time_spent_hours: number;
  comment: string;
  worklog_count: number;
  timeByAuthor: Record<string, number>;
}

function epicOf(item: JiraWorklogItem): string {
  return item.parent_1_summary || item.parent_2_summary || '';
}

export function filterWorklogsByScope(
  worklogs: JiraWorklogItem[],
  options: {
    labels?: string[];
    epics?: string[];
    issueTypes?: string[];
    authors?: string[];
  }
): JiraWorklogItem[] {
  return worklogs.filter(item => {
    if (!matchesAnyLabel(item.labels, options.labels || [])) {
      return false;
    }
    if ((options.epics || []).length > 0 && !options.epics!.includes(epicOf(item))) {
      return false;
    }
    if ((options.issueTypes || []).length > 0 && !options.issueTypes!.includes(item.issue_type)) {
      return false;
    }
    if ((options.authors || []).length > 0 && !options.authors!.includes(item.author)) {
      return false;
    }
    return true;
  });
}

export function aggregateWorklogsByIssue(worklogs: JiraWorklogItem[]): AggregatedIssue[] {
  const groups = new Map<string, JiraWorklogItem[]>();
  for (const item of worklogs) {
    const key = item.issue_key || item.id;
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  }

  return [...groups.entries()].map(([issue_key, items]) => {
    const timeByAuthor: Record<string, number> = {};
    let time_spent_seconds = 0;
    const authors: string[] = [];
    for (const item of items) {
      const seconds = item.time_spent_seconds || 0;
      time_spent_seconds += seconds;
      if (item.author) {
        timeByAuthor[item.author] = (timeByAuthor[item.author] || 0) + seconds;
        if (!authors.includes(item.author)) {
          authors.push(item.author);
        }
      }
    }
    const latest = [...items].sort((a, b) => String(b.started).localeCompare(String(a.started)))[0];
    return {
      issue_key,
      issue_summary: latest?.issue_summary || '',
      issue_type: latest?.issue_type || '',
      status: latest?.status || '',
      labels: latest?.labels || '',
      epic: epicOf(latest || items[0]),
      authors,
      last_author: latest?.author || '',
      last_started: latest?.started || '',
      time_spent_seconds,
      time_spent: secondsToFormattedTime(time_spent_seconds),
      time_spent_hours: secondsToDecimalHours(time_spent_seconds),
      comment: items.map(item => item.comment).filter(Boolean).join(' | '),
      worklog_count: items.length,
      timeByAuthor
    };
  });
}

export function sortIssuesByTime(issues: AggregatedIssue[]): AggregatedIssue[] {
  return [...issues].sort((a, b) => b.time_spent_seconds - a.time_spent_seconds);
}

export function sortIssuesByLastDate(issues: AggregatedIssue[]): AggregatedIssue[] {
  return [...issues].sort((a, b) => String(b.last_started).localeCompare(String(a.last_started)));
}

export function filterIssuesByAuthors(issues: AggregatedIssue[], authors: string[]): AggregatedIssue[] {
  if (authors.length === 0) {
    return issues;
  }
  return issues
    .map(issue => {
      const seconds = authors.reduce((sum, author) => sum + (issue.timeByAuthor[author] || 0), 0);
      const keptAuthors = issue.authors.filter(author => authors.includes(author));
      return {
        ...issue,
        authors: keptAuthors,
        time_spent_seconds: seconds,
        time_spent: secondsToFormattedTime(seconds),
        time_spent_hours: secondsToDecimalHours(seconds)
      };
    })
    .filter(issue => issue.time_spent_seconds > 0 || issue.authors.length > 0);
}
