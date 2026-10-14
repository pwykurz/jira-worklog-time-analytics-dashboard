import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getOAuthConfig, JiraSession } from './config';
import { decryptJson, encryptJson } from './crypto';

const dataFile = join(dirname(fileURLToPath(import.meta.url)), '../../data/jira-sessions.json');

interface StoreFile {
  sessions: Record<string, string>;
}

function readStore(): StoreFile {
  try {
    return JSON.parse(readFileSync(dataFile, 'utf8')) as StoreFile;
  } catch {
    return { sessions: {} };
  }
}

function writeStore(store: StoreFile): void {
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, JSON.stringify(store, null, 2), 'utf8');
}

export function saveSession(sessionId: string, session: JiraSession): void {
  const { sessionSecret } = getOAuthConfig();
  const store = readStore();
  store.sessions[sessionId] = encryptJson(session, sessionSecret);
  writeStore(store);
}

export function loadSession(sessionId: string): JiraSession | null {
  const { sessionSecret } = getOAuthConfig();
  const encrypted = readStore().sessions[sessionId];
  if (!encrypted) {
    return null;
  }
  try {
    return decryptJson<JiraSession>(encrypted, sessionSecret);
  } catch {
    return null;
  }
}

export function deleteSession(sessionId: string): void {
  const store = readStore();
  delete store.sessions[sessionId];
  writeStore(store);
}
