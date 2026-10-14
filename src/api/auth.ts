import { apiGet, apiPost } from '@/api/client';

export interface JiraSite {
  cloudId: string;
  name: string;
  url: string;
}

export interface AuthUser {
  accountId: string;
  displayName: string;
  email: string;
  cloudId: string | null;
  site: JiraSite | null;
  sites: JiraSite[];
  needsSite: boolean;
}

export function fetchMe(): Promise<AuthUser> {
  return apiGet<AuthUser>('/auth/me');
}

export function selectSite(cloudId: string): Promise<AuthUser> {
  return apiPost<AuthUser>('/auth/sites', { cloudId });
}

export function logout(): Promise<{ ok: boolean }> {
  return apiPost<{ ok: boolean }>('/auth/logout', {});
}
