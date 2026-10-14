import { JiraSession } from '../auth/config';

export function jiraApiBase(session: JiraSession): string {
  if (!session.cloudId) {
    throw new Error('No Jira site selected.');
  }
  return `https://api.atlassian.com/ex/jira/${session.cloudId}`;
}

export async function jiraRequest<T = any>(
  session: JiraSession,
  path: string,
  options: RequestInit = {},
  maxRetries = 5
): Promise<T> {
  const url = path.startsWith('http') ? path : `${jiraApiBase(session)}${path}`;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        ...(options.headers || {})
      }
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('Retry-After') || 2 ** attempt);
      const waitTime = Math.max(retryAfter, 2 ** attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Jira ${response.status}: ${body.slice(0, 400) || response.statusText}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json() as Promise<T>;
  }

  throw new Error('Jira rate limit: exceeded retry budget');
}
