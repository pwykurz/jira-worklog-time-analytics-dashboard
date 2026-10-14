# Jira Worklog & Time Analytics Dashboard

[![CI](https://github.com/pwykurz/jira-worklog-time-analytics-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/pwykurz/jira-worklog-time-analytics-dashboard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A self-hosted web app that turns the **worklogs in your Jira Cloud site** into time analytics, scoped reports and
client-ready PDF timesheets.

You sign in with your Atlassian account, pick a period (day, week, month, year or a custom range) and the app pulls
every worklog you are allowed to see, enriches it with issue, epic and sprint data, and lets you explore it with KPIs,
charts and sortable tables. From there you can export Excel files or generate PDF reports with hourly-rate billing and
optional QA/PO overhead.

> **Disclaimer:** This is an independent open-source project. It is not affiliated with, endorsed by or sponsored by
> Atlassian. *Jira* and *Atlassian* are trademarks of Atlassian Pty Ltd.

## Table of contents

- [What problem does it solve?](#what-problem-does-it-solve)
- [Features](#features)
- [The pages](#the-pages)
- [How it works](#how-it-works)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Using the app](#using-the-app)
- [API reference](#api-reference)
- [Deployment](#deployment)
- [Security and privacy](#security-and-privacy)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [Tech stack](#tech-stack)
- [Contributing](#contributing)
- [License](#license)

## What problem does it solve?

Jira records *who logged how much time on which issue*, but answering practical questions with its built-in screens is
tedious:

- *How many hours did each person spend in March, and on which epics?*
- *How much of that time went into bugs?*
- *Which issues were touched in this period but have no time logged at all?*
- *What do I put on the monthly timesheet for the client, and how much does it cost at our hourly rate?*

This dashboard answers those questions on one screen, using the permissions of the signed-in user, and produces the
documents you would otherwise assemble by hand in a spreadsheet.

## Features

- **Sign in with Atlassian** (OAuth 2.0 3LO, read-only scopes). Access and refresh tokens never reach the browser.
- **Period navigation**: day / week / month / year / custom range, with previous/next stepping.
- **Dashboard** with KPI cards (total logged time, unique issues, billable value, share of time spent on bugs), four
  charts and a sortable, groupable, paginated worklog table with an issue detail dialog.
- **Three scoped reports** — *Time per issue*, *Worklog* and *Missing worklogs* — each filterable by project, label,
  epic, issue type and person, with the chosen scope remembered in the browser.
- **PDF export**
  - a branded *client report* from the dashboard (client name, title, notes, hourly rate and currency, author / issue
    type / epic breakdowns and a detailed table);
  - a configurable *scoped report* from each report page (choose people, sections and table columns, optionally add a
    QA and PO overhead percentage).
- **Excel export** of the filtered worklog table.
- **Offline analysis**: drop an exported spreadsheet (XLSX, XLS, ODS, CSV, TSV, HTML or JSON) onto the dashboard and
  analyse it without touching Jira.
- **Parent resolution**: the full parent chain of every issue is resolved (sub-task → story → epic), so each worklog
  can be grouped by the epic or module it belongs to.
- **Multi-site aware**: if your Atlassian account has several Jira sites you choose one after signing in.
- **No database**. Worklog data is processed in memory; the only thing persisted is an encrypted session file.

## The pages

| Route | Page | Purpose |
|---|---|---|
| `/` | **Dashboard** | KPIs, charts and the full worklog table for the selected period and project. Upload a spreadsheet, export to Excel, generate the client PDF. |
| `/reports/time` | **Time per issue** | Worklogs aggregated per issue, sorted by time spent, with the people-and-overhead summary (dev time + QA % + PO %). |
| `/reports/worklog` | **Worklog** | The same aggregation sorted by the date of the last worklog, with a date column — a chronological timesheet. |
| `/reports/missing` | **Missing worklogs** | Open issues updated in the period that have **no** time logged. Helps to find forgotten timesheets. |

## How it works

```
Browser (React SPA)
    │   /api/*  (cookie `jira_sid`, HttpOnly)
    ▼
Express API  ── encrypted sessions ──►  data/jira-sessions.json
    │
    ├── auth.atlassian.com   OAuth 2.0 authorisation + token refresh
    └── api.atlassian.com    Jira Cloud REST API v3 (as the signed-in user)
```

In development the Vite dev server (`:3000`) serves the SPA and proxies `/api` to Express (`:3001`). In production a
reverse proxy (nginx, Caddy, …) serves the static `dist/` folder and forwards `/api` to Express — see
[Deployment](#deployment).

### Authentication and sessions

1. The SPA sends the user to `GET /api/auth/jira`, which redirects to Atlassian's consent screen.
2. After consent, Atlassian redirects to `{APP_URL}/api/auth/jira/callback`. The API validates the one-time `state`,
   exchanges the code for tokens, reads the user's identity and the list of accessible Jira sites.
3. The tokens and identity are stored **server-side**, encrypted with AES-256-GCM (key derived from `SESSION_SECRET`)
   in `data/jira-sessions.json`. The browser only receives a random session id in an `HttpOnly`, `SameSite=Lax` cookie
   (`Secure` when `APP_URL` is `https://…`) valid for 30 days.
4. Access tokens are refreshed transparently shortly before they expire.

Requested scopes: `read:jira-work`, `read:jira-user`, `read:me`, `offline_access` — the app can **only read**.

### How worklogs are fetched (`GET /api/worklogs`)

1. List the IDs of worklogs updated since the start of the range (`/rest/api/3/worklog/updated`, paginated).
2. Load the worklogs in batches of 1000 (`/rest/api/3/worklog/list`) and keep those whose `started` date falls in
   `[from, to)`.
3. Load the affected issues in batches of 100 with JQL (`/rest/api/3/search/jql`: key, summary, labels, status, sprint,
   fix versions, parent, issue type); fall back to per-issue requests if a batch fails.
4. Resolve parent chains (up to 10 levels) so each worklog carries `parent_1_*`, `parent_2_*`, … (typically story →
   epic).
5. Optionally (`JIRA_INCLUDE_ISSUES_WITHOUT_WORKLOGS=true`) add issues updated in the range that have no worklog as
   zero-time rows.

HTTP 429 responses are retried with exponential back-off (honouring `Retry-After`). Results are cached in memory per
user, site, range, project and option flags, and concurrent identical requests share a single fetch.

### How "Missing worklogs" is computed (`GET /api/issues/missing-worklogs`)

The API builds a JQL query and returns the matching issues:

```
(timespent is EMPTY OR timespent = 0) AND statusCategory != Done
  AND updated >= "<from>" AND updated < "<to>"
  [AND project in (...)] [AND labels in (...)] [AND status not in (...)]
```

Label filters are expanded to common case variants (`maintenance`, `Maintenance`, `MAINTENANCE`) because JQL label
matching is case-sensitive. By default the statuses `To Do` and `Closed` are excluded in the UI.

## Quick start

### Prerequisites

- **Node.js 22 or newer** and npm
- A **Jira Cloud** site and an Atlassian account that can see the worklogs you want to analyse
- An **Atlassian OAuth 2.0 (3LO) app** — created in the next step; it is free

### 1. Clone and install

```bash
git clone https://github.com/pwykurz/jira-worklog-time-analytics-dashboard.git
cd jira-worklog-time-analytics-dashboard
npm ci
```

### 2. Create an Atlassian OAuth app

1. Open the [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/) and choose
   **Create → OAuth 2.0 integration**.
2. **Authorization** → add **OAuth 2.0 (3LO)** and set the **Callback URL** to
   `http://localhost:3000/api/auth/jira/callback` (for production use `https://<your-host>/api/auth/jira/callback`).
3. **Permissions** → add the **Jira API** and enable the scopes `read:jira-work` and `read:jira-user`; add the
   **User identity API** and enable `read:me`. (`offline_access` is requested at sign-in, nothing to configure.)
4. **Settings** → copy the **Client ID** and **Secret**.

> By default an Atlassian OAuth app can only be authorised by its owner. To let colleagues sign in, adjust the app's
> *Distribution* settings in the console. (Menu names in the console change from time to time.)

### 3. Configure the environment

```bash
cp .env.example .env
openssl rand -hex 32      # use the output as SESSION_SECRET
```

Edit `.env` and fill in `CLIENT_ID`, `SECRET` and `SESSION_SECRET` (see [Configuration](#configuration)).
**`.env` is git-ignored — never commit it.**

### 4. Run

```bash
npm run dev:all
```

This starts the API on `http://127.0.0.1:3001` and the web app on `http://localhost:3000`. Alternatively run the two
processes in separate terminals:

```bash
npm run dev:server   # Express API with auto-reload
npm run dev          # Vite dev server
```

Open <http://localhost:3000>, click **Sign in with Jira**, approve the consent screen and you are in. The API health
check is at <http://localhost:3001/api/health>.

## Configuration

All settings are environment variables, loaded from `.env` in the directory where the API is started
(via [`dotenv`](https://github.com/motdotla/dotenv)). The template is [`.env.example`](.env.example).

| Variable | Required | Default | Description |
|---|---|---|---|
| `CLIENT_ID` | yes | – | OAuth Client ID of your Atlassian app. Alias: `ATLASSIAN_CLIENT_ID`. |
| `SECRET` | yes | – | OAuth Client Secret. Alias: `ATLASSIAN_CLIENT_SECRET`. |
| `SESSION_SECRET` | yes | – | Random string used to encrypt stored sessions, e.g. `openssl rand -hex 32`. Changing it signs everyone out. |
| `APP_URL` | yes | `http://localhost:3000` | Public URL of the web app, **no trailing slash**. The OAuth callback is `{APP_URL}/api/auth/jira/callback`. `https://` enables the `Secure` cookie flag. |
| `PORT` | no | `3001` | Port of the Express API. |
| `HOST` | no | `127.0.0.1` | Bind address of the Express API. Use `0.0.0.0` only if you really need to listen on all interfaces. |
| `VITE_API_BASE_URL` | no | `/api` | API base path as seen by the browser. Baked into the bundle at build time. |
| `JIRA_BASE_URL` | no | – | Preferred site (e.g. `https://your-site.atlassian.net`) when the account has several; skips the site picker. |
| `JIRA_INCLUDE_ISSUES_WITHOUT_WORKLOGS` | no | `false` | `true` adds issues without worklogs to the worklog results as zero-time rows. |

Never put real credentials in `.env.example` or anywhere else that is committed.

## Using the app

### Dashboard

- **Period** — use the *Day / Week / Month / Year* buttons, *Range* for a custom interval, and the arrows to step to
  the previous or next period. The default is the current month. The upper bound is exclusive internally; the UI shows
  inclusive dates.
- **Project** — restrict the data to one Jira project (remembered in the browser).
- **Rate** — hourly rate and currency (USD, EUR, GBP, PLN) used for all monetary values on the dashboard.
- **KPI cards** — total logged time, unique issues (and how many epics/modules they span), billable value
  (`decimal hours × rate`) and the share of time spent on issues whose type contains "bug".
- **Charts** — time by author, activity per day, breakdown by issue type, top five epics.
- **Worklog table** — sort by any column, group by author / epic / issue type / date, change the page size, click a row
  for the issue detail dialog, issue keys link back to Jira, and **Export .XLSX** downloads the table.
- **Upload sheet / drop zone** — load an exported file instead of (or when you cannot reach) Jira. See
  [File import](#file-import).
- **Export PDF** — opens the client report generator: client name, report title, "prepared by", rate and currency,
  free-text notes and switches for the author, issue-type, epic and detail sections.

### Reports

The three report pages share a **filter bar** (collapsed by default, with a summary of the active filters):

| Filter | Notes |
|---|---|
| Projects | *Time per issue* / *Worklog*: one project is filtered on the server, several in the browser by issue-key prefix. *Missing worklogs* always filters on the server (JQL). Empty = all projects. |
| Labels | Case-insensitive. You can type a label that is not present in the data. |
| Authors / People | On *Missing worklogs* this filters by assignee. |
| Excluded statuses | *Missing worklogs* only. Defaults to `To Do` and `Closed`. |
| Epics, Issue types | Chosen by name. |
| PDF overhead | *Time per issue* only — QA % (default 10) and PO % (default 15) added on top of the dev time in the PDF summary. |
| PDF columns | Which columns the PDF issue table contains. |

Your scope per report is stored in the browser's `localStorage`, so it is restored on your next visit.

**Exporting a report** — *PDF export* lets you choose the people to include, the sections (KPI, issue table, author
breakdown, QA/PO overhead, final summary) and the table columns, then downloads the PDF. When the overhead section is
on, the summary shows `Dev`, `QA (x%)`, `PO (y%)` and `Total = dev × (1 + QA% + PO%)`.

### File import

You can drop or upload `.xlsx`, `.xls`, `.xlsm`, `.xlsb`, `.ods`, `.csv`, `.tsv`, `.html`/`.htm` (the first table is
used) or `.json` (an array, `{ "worklogs": [...] }` or `{ "issues": [...] }`). Columns are matched by name,
case-insensitively and ignoring spaces and underscores:

| Field | Accepted column names |
|---|---|
| Issue key | `issue_key`, `issuekey`, `key`, `id` |
| Summary | `issue_summary`, `issuesummary`, `summary`, `name` |
| Issue type | `issue_type`, `issuetype`, `type` |
| Status | `status` |
| Sprint / version | `sprint`; `fix_versions`, `fixversions`, `version` |
| Labels | `labels`, `label` |
| Author | `author`, `user`, `username`, `full_name`, `person` |
| Author e-mail / account id | `author_email`, `email`, `mail`; `author_account_id`, `account_id` |
| Started | `started`, `date`, `created`, `started_date` |
| Comment | `comment`, `worklog_comment`, `description` |
| Time spent (seconds) | `time_spent_seconds`, `time_spent_sec`, `seconds` |
| Time spent (duration) | `time_spent`, `timespent`, `duration` — Jira notation such as `1w 2d 4h 30m` (1 w = 5 d, 1 d = 8 h) or a plain number of seconds |
| Epic / parent | `parent_1_key`, `parent_key`, `epic_key`, `epic`; `parent_1_summary`, `parent_summary`, `epic_name`, `epic_link` |

A few Polish column names (for example `klucz`, `autor`, `czas`) are also recognised so that exports from
Polish-localised Jira instances import without renaming. If a row has neither a seconds nor a duration column it is
counted as **1 hour**. Imported data replaces what is shown on the dashboard; it is processed entirely in your browser
and is never sent to the server.

### Data semantics worth knowing

- A worklog belongs to the date part of its Jira `started` timestamp. The range is `from` inclusive, `to` exclusive.
- Hours are shown as decimals rounded to two places; money is `decimal hours × hourly rate`.
- The *epic / module* shown for an issue is its nearest parent (`parent_1`), falling back to the next one up
  (`parent_2`) when the first has no summary. For a sub-task that is its story; for a story it is the epic.
- *Unique issues* counts distinct issue keys among the filtered worklogs.

## API reference

All endpoints live under `/api`. Everything except the health check and the OAuth redirect/callback requires a valid
session cookie (otherwise `401`); data endpoints additionally require that a Jira site is selected (otherwise `409`
with `code: "SITE_REQUIRED"`).

| Method & path | Auth | Description |
|---|---|---|
| `GET /api/health` | no | Returns `{ "ok": true }`. |
| `GET /api/auth/jira` | no | Redirects to the Atlassian consent screen. |
| `GET /api/auth/jira/callback` | no | OAuth callback; creates the session and redirects to `APP_URL` (or to `APP_URL/?authError=…` on failure). |
| `GET /api/auth/me` | yes | Current user, selected site, available sites, `needsSite`. |
| `GET /api/auth/sites` | yes | Available Jira sites and the selected `cloudId`. |
| `POST /api/auth/sites` | yes | Body `{ "cloudId": "…" }` — select the Jira site to use. |
| `POST /api/auth/logout` | no | Deletes the session and clears the cookie. |
| `GET /api/projects` | yes + site | `{ projects: [{ id, key, name }] }` (up to 2000 projects). |
| `GET /api/worklogs?from=YYYY-MM-DD&to=YYYY-MM-DD&project=KEY` | yes + site | Worklogs in `[from, to)`; defaults to the current month; `project` optional. `400` if `from >= to`, `502` on upstream errors. |
| `GET /api/issues/missing-worklogs?from&to&projects=A,B&labels=x,y&excludeStatuses=To Do,Closed` | yes + site | Issues without time logged (see above). `/api/issues/search` is an alias. Returns `{ jql, issues: [...] }`. |

A worklog record contains: `id`, `issue_key`, `issue_summary`, `issue_type`, `status`, `sprint`, `fix_versions`,
`labels`, `author`, `author_email`, `author_account_id`, `time_spent`, `time_spent_seconds`, `started`, `comment`,
`has_worklog` and the parent chain as `parent_N_key`, `parent_N_summary`, `parent_N_type`, `parent_N_sprint`.

## Deployment

Run it on **one host with one origin** (the session cookie and the OAuth callback depend on it). You need Node.js for
the API and a reverse proxy with TLS for the static files and `/api`. There is no Docker image in this repository.

```
Browser ──443──► nginx / Caddy ──┬── /      → dist/   (output of `npm run build`)
                                 └── /api/  → 127.0.0.1:3001  (Express)
```

### 1. Build and install

```bash
npm ci
npm run build          # produces dist/
```

The server runs TypeScript through `tsx` (a dev dependency), so install dependencies with plain `npm ci` on the host.
Start it with `npm start` (equivalent to `tsx server/index.ts`).

You need on the server: `server/`, `package.json`, `node_modules/`, `dist/`, your `.env` (created on the server, never
copied from a repository) and a writable, persistent `data/` directory.

### 2. Run the API with systemd

```ini
[Unit]
Description=Jira worklog dashboard API
After=network.target

[Service]
User=jira-dashboard
WorkingDirectory=/opt/jira-worklog-dashboard
EnvironmentFile=/opt/jira-worklog-dashboard/.env
ExecStart=/usr/bin/node --import tsx server/index.ts
Restart=on-failure

# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/jira-worklog-dashboard/data

[Install]
WantedBy=multi-user.target
```

Set `APP_URL=https://reports.example.com`, keep `HOST` at its default (`127.0.0.1`) and restrict the files:
`chmod 600 .env` and `chmod 700 data`.

### 3. Reverse proxy (nginx example)

```nginx
server {
    listen 443 ssl;
    server_name reports.example.com;

    # ssl_certificate     ...;
    # ssl_certificate_key ...;

    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "same-origin" always;

    root /opt/jira-worklog-dashboard/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;     # fetching a large period from Jira can take minutes
        client_max_body_size 1m;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. Atlassian settings for production

In the developer console add the production callback `https://reports.example.com/api/auth/jira/callback` to the same
OAuth app. `APP_URL` must match the public URL exactly (HTTPS, no trailing slash).

### 5. Go-live checklist

- [ ] `https://…/api/health` returns `{"ok":true}`
- [ ] The SPA loads over HTTPS and sign-in returns to the same host
- [ ] The API is reachable only through the proxy (firewall: public 443, nothing else)
- [ ] `data/` survives restarts and deployments
- [ ] `.env` and `data/` are readable only by the service user
- [ ] `SESSION_SECRET` is unique to this environment
- [ ] You did **not** expose the Vite dev server (`npm run dev`) to the internet

## Security and privacy

- **Read-only access.** Only read scopes are requested; the app cannot modify anything in Jira.
- **Your permissions apply.** Every Jira call is made with the signed-in user's own token.
- **No secrets in the repository.** Credentials come from environment variables; `.env`, `data/` and key files are in
  `.gitignore`. Run `git status` before committing and use GitHub secret scanning with push protection.
- **Tokens stay on the server**, AES-256-GCM encrypted at rest. The browser holds only an opaque, `HttpOnly` session id.
- **No telemetry, no third-party requests.** The app talks only to Atlassian. Fonts and scripts are bundled; PDFs and
  Excel files are generated in your browser.
- **Browser storage** holds UI preferences only (selected project, per-report filter scope, filter panel state).

Read [SECURITY.md](SECURITY.md) for the full security model, known limitations and how to report a vulnerability.

## Known limitations

- **The worklog cache never expires.** Results are cached in the API process until it restarts, so time logged in Jira
  after a period was first loaded does not appear until the API is restarted. (The cache is keyed per user, site and
  range.)
- **Fetching is driven by Jira's "worklogs updated since" feed.** Worklogs last modified *before* the start of the
  range (for example time logged in advance for a future date) are not picked up. Old ranges on large sites are slow
  because everything updated since then has to be scanned.
- **Single instance.** Sessions live in a local JSON file and the cache is in process memory, so run exactly one API
  process.
- **No automated tests yet**; CI runs the type-checks and the production build.
- **Large bundle.** The frontend ships as a single ~2.4 MB chunk (charts + PDF libraries).
- The UI is English only.

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Atlassian shows an error before the consent screen | The Callback URL registered in the developer console must equal `{APP_URL}/api/auth/jira/callback` exactly. |
| `CLIENT_ID or SECRET is missing in .env` | `.env` is missing or not in the directory you start the API from; check the variable names. |
| `SESSION_SECRET is missing in .env` | Generate one: `openssl rand -hex 32`. |
| Redirected to the login screen with an error text | The reason is passed in `?authError=…` and shown on the login screen (expired `state`, consent denied, no accessible site, …). |
| Signed out after a restart or deployment | `SESSION_SECRET` changed, or `data/` was not persisted. |
| "Select a Jira site" screen | Your account can access several sites. Pick one, or set `JIRA_BASE_URL` to skip the picker. |
| Empty data although you logged time | You only see what your Jira permissions allow, and the cache may be stale — restart the API (see [Known limitations](#known-limitations)). |
| First load of a period takes a long time | Jira rate limits and large result sets; the API retries on HTTP 429. Subsequent loads of the same range are served from the cache. |
| Browser shows a proxy error in development | The API is not running on `PORT` (default 3001). Start it with `npm run dev:server`. |

## Project structure

```
.
├── server/                    Express API (TypeScript, run with tsx)
│   ├── index.ts               App bootstrap, routes, timeouts
│   ├── auth/                  OAuth flow, cookies, AES-GCM crypto, session store, auth middleware
│   ├── routes/                auth, projects, worklogs, issues
│   ├── services/              Jira REST client (retry/back-off) and the worklog extractor
│   └── lib/dates.ts           ISO date helpers
├── src/                       React single-page app
│   ├── pages/                 Dashboard, Time per issue, Worklog, Missing worklogs
│   ├── components/            KPI cards, charts, tables, filter bar, pickers, PDF dialogs
│   ├── hooks/                 Auth, projects, worklogs and report-scope state
│   ├── lib/                   Aggregation, period maths, scope persistence, PDF generators, file parser
│   └── api/                   Typed fetch wrappers for the API
├── .github/                   CI workflow, Dependabot, issue and PR templates
├── .env.example               Configuration template (copy to .env)
├── SECURITY.md  CONTRIBUTING.md  LICENSE
└── vite.config.ts  tsconfig*.json  package.json
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on `:3000`, proxying `/api` to `:3001` |
| `npm run dev:server` | Express API with file watching |
| `npm run dev:all` | Both of the above in one terminal |
| `npm start` | Run the API once (production) |
| `npm run build` | Production frontend build into `dist/` |
| `npm run preview` | Serve the built frontend locally |
| `npm run lint` | Type-check the frontend and the server with `tsc` |
| `npm run clean` | Remove `dist/` |

## Tech stack

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS 4, React Router 7, Recharts, lucide-react
- **Reports:** jsPDF + jspdf-autotable (PDF, Roboto font from pdfmake's bundled fonts), SheetJS `xlsx` (Excel import and export)
- **Backend:** Node.js 22, Express 4, TypeScript (via tsx), dotenv — Node's built-in `fetch` and `crypto`, no database

## Contributing

Contributions are welcome — please read [CONTRIBUTING.md](CONTRIBUTING.md) first. In short: keep secrets and real Jira
data out of issues and pull requests, run `npm run lint && npm run build`, and write code, comments and UI text in
English.

## License

Released under the [MIT License](LICENSE).
