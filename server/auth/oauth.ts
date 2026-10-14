import { randomBytes } from 'crypto';
import { getOAuthConfig, JiraSession, JiraSite, OAUTH_SCOPES } from './config';

interface PendingAuth {
  createdAt: number;
}

const pending = new Map<string, PendingAuth>();
const PENDING_TTL_MS = 10 * 60 * 1000;

function base64Url(buf: Buffer): string {
  return buf.toString('base64url');
}

function prunePending(): void {
  const cutoff = Date.now() - PENDING_TTL_MS;
  for (const [state, value] of pending) {
    if (value.createdAt < cutoff) {
      pending.delete(state);
    }
  }
}

export function createAuthorizeUrl(): string {
  prunePending();
  const { clientId, redirectUri } = getOAuthConfig();
  const state = base64Url(randomBytes(24));
  pending.set(state, { createdAt: Date.now() });

  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: clientId,
    scope: OAUTH_SCOPES.join(' '),
    redirect_uri: redirectUri,
    state,
    response_type: 'code',
    prompt: 'consent'
  });

  return `https://auth.atlassian.com/authorize?${params.toString()}`;
}

function consumePending(state: string): void {
  prunePending();
  const entry = pending.get(state);
  pending.delete(state);
  if (!entry) {
    throw new Error('Invalid or expired OAuth state. Please try signing in again.');
  }
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

async function exchangeToken(body: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OAuth token error ${response.status}: ${text.slice(0, 400)}`);
  }
  return response.json() as Promise<TokenResponse>;
}

export async function exchangeCode(code: string, state: string): Promise<TokenResponse> {
  consumePending(state);
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  return exchangeToken({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri
  });
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = getOAuthConfig();
  return exchangeToken({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken
  });
}

interface Identity {
  account_id?: string;
  email?: string;
  name?: string;
  picture?: string;
}

interface AccessibleResource {
  id: string;
  url: string;
  name: string;
}

export async function fetchIdentity(accessToken: string): Promise<Identity> {
  const response = await fetch('https://api.atlassian.com/me', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Identity error ${response.status}: ${text.slice(0, 400)}`);
  }
  return response.json() as Promise<Identity>;
}

export async function fetchAccessibleSites(accessToken: string): Promise<JiraSite[]> {
  const response = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Accessible resources error ${response.status}: ${text.slice(0, 400)}`);
  }
  const resources = (await response.json()) as AccessibleResource[];
  return (resources || []).map(resource => ({
    cloudId: resource.id,
    name: resource.name,
    url: resource.url
  }));
}

export function pickDefaultCloudId(sites: JiraSite[]): string | null {
  if (sites.length === 0) {
    return null;
  }
  if (sites.length === 1) {
    return sites[0].cloudId;
  }
  const preferred = getOAuthConfig().preferredBaseUrl.toLowerCase();
  if (preferred) {
    const match = sites.find(site => site.url.replace(/\/$/, '').toLowerCase() === preferred);
    if (match) {
      return match.cloudId;
    }
  }
  return null;
}

export function sessionFromTokens(
  tokens: TokenResponse,
  identity: Identity,
  sites: JiraSite[],
  previous?: Partial<JiraSession>
): JiraSession {
  const cloudId = previous?.cloudId && sites.some(site => site.cloudId === previous.cloudId)
    ? previous.cloudId
    : pickDefaultCloudId(sites);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || previous?.refreshToken || '',
    expiresAt: Date.now() + tokens.expires_in * 1000,
    accountId: identity.account_id || previous?.accountId || '',
    displayName: identity.name || previous?.displayName || 'Jira user',
    email: identity.email || previous?.email || '',
    sites,
    cloudId
  };
}
