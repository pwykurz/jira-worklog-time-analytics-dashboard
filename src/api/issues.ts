import { apiGet } from '@/api/client';
import { labelVariants } from '@/lib/labels';

export interface MissingIssue {
  key: string;
  summary: string;
  status: string;
  updated: string;
  assignee: string;
  labels: string;
  projectKey: string;
  epic: string;
  epicKey: string;
  issueType: string;
}

export function fetchMissingIssues(params: {
  from: string;
  to: string;
  projectKeys: string[];
  labels: string[];
  excludedStatuses: string[];
}): Promise<MissingIssue[]> {
  const search = new URLSearchParams({ from: params.from, to: params.to });
  if (params.projectKeys.length) {
    search.set('projects', params.projectKeys.join(','));
  }
  if (params.labels.length) {
    const expanded = [...new Set(params.labels.flatMap(label => labelVariants(label)))];
    search.set('labels', expanded.join(','));
  }
  if (params.excludedStatuses.length) {
    search.set('excludeStatuses', params.excludedStatuses.join(','));
  }
  return apiGet<{ issues: MissingIssue[] }>(`/issues/missing-worklogs?${search.toString()}`).then(
    data => data.issues ?? []
  );
}
