import { apiGet } from '@/api/client';

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export function fetchProjects(): Promise<JiraProject[]> {
  return apiGet<{ projects: JiraProject[] }>('/projects').then(data => data.projects ?? []);
}
