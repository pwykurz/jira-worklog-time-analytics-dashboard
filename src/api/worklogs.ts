import { JiraWorklogItem } from '@/types';
import { apiGet } from '@/api/client';

interface WorklogsResponse {
  worklogs: JiraWorklogItem[];
  from?: string;
  to?: string;
}

export function fetchWorklogs(from: string, to: string, project?: string): Promise<JiraWorklogItem[]> {
  const params = new URLSearchParams({ from, to });
  if (project) {
    params.set('project', project);
  }
  return apiGet<WorklogsResponse>(`/worklogs?${params.toString()}`).then(data => data.worklogs ?? []);
}
