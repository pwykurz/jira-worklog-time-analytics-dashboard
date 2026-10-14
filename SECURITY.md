# Security Policy

## Supported versions

Only the latest commit on the `main` branch receives security fixes.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report vulnerabilities privately through GitHub:
[**Security → Report a vulnerability**](https://github.com/pwykurz/jira-worklog-time-analytics-dashboard/security/advisories/new)
(GitHub private vulnerability reporting).

Please include:

- a description of the problem and its impact,
- steps to reproduce (a minimal proof of concept is ideal),
- the affected commit or version,
- whether you have already disclosed it elsewhere.

**Never include real credentials, tokens or customer data in a report.** If you accidentally exposed a secret, rotate it
first (see below).

You can expect an acknowledgement within a few days. This is a small, volunteer-maintained project, so fix timelines
are best-effort; coordinated disclosure is appreciated.

> **Maintainer note:** private vulnerability reporting must be enabled in the repository settings
> (*Settings → Code security → Private vulnerability reporting*). Also enable *Secret scanning* and *Push protection*
> there — they are free for public repositories and block accidental secret pushes.

## Security model

What the application does to protect your data:

| Area | Behaviour |
|---|---|
| Jira access | OAuth 2.0 (3LO) with **read-only** scopes: `read:jira-work`, `read:jira-user`, `read:me`, `offline_access`. All Jira calls use the signed-in user's own token, so Jira's permission model applies. |
| Token storage | Access and refresh tokens are stored **only on the server**, in `data/jira-sessions.json`, encrypted with AES-256-GCM (random 96-bit IV per write, authentication tag verified on read). The key is the SHA-256 hash of `SESSION_SECRET`. |
| Browser session | A random 256-bit session id in an `HttpOnly`, `SameSite=Lax` cookie (`jira_sid`), plus `Secure` when `APP_URL` starts with `https://`. Tokens are never sent to the browser. |
| OAuth flow | A random one-time `state` value is generated per sign-in, expires after 10 minutes and is consumed on use. |
| Authorisation | Every data endpoint requires a valid session. The only unauthenticated endpoints are the health check and the sign-in / sign-out flow. |
| Network | The API binds to `127.0.0.1` by default and is meant to sit behind a TLS-terminating reverse proxy. `X-Powered-By` is disabled. |
| Secrets in git | Configuration comes from environment variables. `.env`, `data/`, `*.pem`, `*.key` are git-ignored; only `.env.example` (with empty values) is tracked. |
| Privacy | No analytics or telemetry; the only outbound requests are to Atlassian. PDF and Excel files are generated in the browser. Worklog data is held in memory only. |

## Hardening checklist for operators

- Serve the app **only over HTTPS** and keep the Express API on loopback (`HOST=127.0.0.1`, the default).
- Generate `SESSION_SECRET` with `openssl rand -hex 32`. The key is derived with a single SHA-256, so a weak secret is
  guessable if `data/jira-sessions.json` ever leaks.
- Restrict file permissions: `chmod 600 .env`, `chmod 700 data`; run the service as an unprivileged user.
- Never run the Vite dev server (`npm run dev`) on a public interface.
- Keep dependencies current (Dependabot is configured) and run `npm audit` regularly.
- Use a dedicated Atlassian OAuth app per environment.

## If a secret was exposed

1. **Rotate it immediately.** For the Atlassian client secret use the developer console (*Settings → Secret*); for
   `SESSION_SECRET` generate a new value (this signs every user out).
2. Delete `data/jira-sessions.json` if it may have leaked together with the old `SESSION_SECRET`.
3. Remove the secret from the repository history, but treat it as compromised regardless — deleting a commit does not
   un-leak a value that was public.
4. Users can additionally revoke the app's access at <https://id.atlassian.com/manage-profile/apps>.

## Known limitations

These are known and documented rather than hidden; contributions that address them are welcome.

1. **`xlsx` (SheetJS) 0.18.5 has known vulnerabilities** (prototype pollution
   [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) and ReDoS
   [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)); the fixed versions are not published on
   npm. The library runs in the **browser** to parse spreadsheets you choose to upload and to write Excel exports.
   Only upload files you trust. Migrating to a maintained build is a good first contribution.
2. **The OAuth `state` is not bound to the initiating browser.** It is validated against a server-side list, but not
   against a cookie, so a login-CSRF attack is theoretically possible. The impact is limited (read-only scopes, no
   write actions), but binding the state to a short-lived cookie would close the gap.
3. **Sessions have no server-side expiry or cleanup.** The cookie lives 30 days and refresh tokens are renewed on
   use; expired entries stay in `data/jira-sessions.json`. To revoke all sessions, delete that file or rotate
   `SESSION_SECRET`.
4. **No rate limiting** on the API; rely on the reverse proxy if the instance is exposed to untrusted networks.
5. **Single-process design.** Sessions are stored in a local JSON file without locking and the worklog cache is in
   process memory; do not run multiple API instances against the same `data/` directory.
