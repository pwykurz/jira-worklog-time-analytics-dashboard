import { Router } from 'express';
import { getOAuthConfig } from '../auth/config';
import { clearSessionCookie, readSessionId, setSessionCookie } from '../auth/cookies';
import { randomId } from '../auth/crypto';
import { requireJiraAuth } from '../auth/middleware';
import {
  createAuthorizeUrl,
  exchangeCode,
  fetchAccessibleSites,
  fetchIdentity,
  sessionFromTokens
} from '../auth/oauth';
import { deleteSession, loadSession, saveSession } from '../auth/sessionStore';

export const authRouter = Router();

function publicUser(session: NonNullable<ReturnType<typeof loadSession>>) {
  const site = session.sites.find(item => item.cloudId === session.cloudId) || null;
  return {
    accountId: session.accountId,
    displayName: session.displayName,
    email: session.email,
    cloudId: session.cloudId,
    site,
    sites: session.sites,
    needsSite: !session.cloudId && session.sites.length > 1
  };
}

authRouter.get('/jira', (_req, res) => {
  try {
    res.redirect(createAuthorizeUrl());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start the sign-in flow.';
    res.status(500).json({ error: message });
  }
});

authRouter.get('/jira/callback', async (req, res) => {
  const { appUrl } = getOAuthConfig();
  const fail = (reason: string) => {
    res.redirect(`${appUrl}/?authError=${encodeURIComponent(reason)}`);
  };

  try {
    const errorParam = typeof req.query.error === 'string' ? req.query.error : '';
    if (errorParam) {
      fail(errorParam);
      return;
    }

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !state) {
      fail('Missing OAuth code.');
      return;
    }

    const tokens = await exchangeCode(code, state);
    const [identity, sites] = await Promise.all([
      fetchIdentity(tokens.access_token),
      fetchAccessibleSites(tokens.access_token)
    ]);

    if (sites.length === 0) {
      fail('This account has no access to any Jira site.');
      return;
    }

    const session = sessionFromTokens(tokens, identity, sites);
    const sessionId = randomId();
    saveSession(sessionId, session);
    setSessionCookie(res, sessionId);
    res.redirect(appUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sign-in failed.';
    console.error('OAuth callback failed:', message);
    fail(message);
  }
});

authRouter.get('/me', requireJiraAuth, (req, res) => {
  res.json(publicUser(req.jira!));
});

authRouter.get('/sites', requireJiraAuth, (req, res) => {
  res.json({
    sites: req.jira!.sites,
    cloudId: req.jira!.cloudId
  });
});

authRouter.post('/sites', requireJiraAuth, (req, res) => {
  const cloudId = typeof req.body?.cloudId === 'string' ? req.body.cloudId : '';
  const site = req.jira!.sites.find(item => item.cloudId === cloudId);
  if (!site) {
    res.status(400).json({ error: 'Unknown Jira site.' });
    return;
  }

  const next = { ...req.jira!, cloudId };
  saveSession(req.sessionId!, next);
  res.json(publicUser(next));
});

authRouter.post('/logout', (req, res) => {
  const sessionId = readSessionId(req);
  if (sessionId) {
    deleteSession(sessionId);
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});
