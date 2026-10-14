import type { NextFunction, Request, Response } from 'express';
import { JiraSession } from './config';
import { readSessionId } from './cookies';
import { refreshAccessToken } from './oauth';
import { loadSession, saveSession } from './sessionStore';

declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
      jira?: JiraSession;
    }
  }
}

const REFRESH_SKEW_MS = 60_000;

export async function requireJiraAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessionId = readSessionId(req);
    if (!sessionId) {
      res.status(401).json({ error: 'Jira login required.' });
      return;
    }

    let session = loadSession(sessionId);
    if (!session) {
      res.status(401).json({ error: 'Session expired. Please sign in again.' });
      return;
    }

    if (session.expiresAt - REFRESH_SKEW_MS <= Date.now()) {
      if (!session.refreshToken) {
        res.status(401).json({ error: 'Session expired. Please sign in again.' });
        return;
      }
      const tokens = await refreshAccessToken(session.refreshToken);
      session = {
        ...session,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || session.refreshToken,
        expiresAt: Date.now() + tokens.expires_in * 1000
      };
      saveSession(sessionId, session);
    }

    req.sessionId = sessionId;
    req.jira = session;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to refresh the Jira session.';
    console.error('requireJiraAuth failed:', message);
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

export function requireJiraSite(req: Request, res: Response, next: NextFunction): void {
  if (!req.jira?.cloudId) {
    res.status(409).json({ error: 'Select a Jira site.', code: 'SITE_REQUIRED' });
    return;
  }
  next();
}
