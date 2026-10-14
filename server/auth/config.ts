export interface JiraSite {
  cloudId: string;
  name: string;
  url: string;
}

export interface JiraSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  accountId: string;
  displayName: string;
  email: string;
  sites: JiraSite[];
  cloudId: string | null;
}

export function getOAuthConfig() {
  const clientId = (process.env.CLIENT_ID || process.env.ATLASSIAN_CLIENT_ID || '').trim();
  const clientSecret = (process.env.SECRET || process.env.ATLASSIAN_CLIENT_SECRET || '').trim();
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const sessionSecret = (process.env.SESSION_SECRET || '').trim();
  const preferredBaseUrl = (process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
  const redirectUri = `${appUrl}/api/auth/jira/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('CLIENT_ID or SECRET is missing in .env (Atlassian OAuth).');
  }
  if (!sessionSecret) {
    throw new Error('SESSION_SECRET is missing in .env. Generate one with: openssl rand -hex 32');
  }

  return { clientId, clientSecret, appUrl, sessionSecret, preferredBaseUrl, redirectUri };
}

export const OAUTH_SCOPES = ['read:jira-work', 'read:jira-user', 'read:me', 'offline_access'];
export const SESSION_COOKIE = 'jira_sid';
