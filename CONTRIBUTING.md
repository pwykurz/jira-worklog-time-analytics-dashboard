# Contributing

Thanks for your interest in improving the Jira Worklog & Time Analytics Dashboard! Bug reports, ideas and pull requests
are all welcome.

## Ground rules

- **Never commit or post secrets or real company data.** That includes `.env` contents, OAuth client secrets, session
  files, access tokens, real issue keys, customer or employee names, and screenshots that show them. Use made-up data
  in examples, tests and screenshots.
- **English only.** Code, comments, commit messages, documentation and user-facing text are written in English.
- Be kind and constructive in discussions.
- By contributing you agree that your work is released under the project's [MIT License](LICENSE).

## Reporting bugs and suggesting features

Use the [issue templates](https://github.com/pwykurz/jira-worklog-time-analytics-dashboard/issues/new/choose).
For **security problems**, do not open an issue — follow [SECURITY.md](SECURITY.md).

## Development setup

You need Node.js 22 or newer.

```bash
git clone https://github.com/pwykurz/jira-worklog-time-analytics-dashboard.git
cd jira-worklog-time-analytics-dashboard
npm ci
cp .env.example .env      # then fill in your own Atlassian OAuth app credentials, see README
npm run dev:all
```

Use a **dedicated Atlassian OAuth app and, if possible, a test Jira site** for development. See the
[README](README.md#quick-start) for the full setup.

## Making a change

1. Fork the repository and create a branch from `main` (`feature/short-description` or `fix/short-description`).
2. Keep the change focused; unrelated refactors belong in separate pull requests.
3. Match the style of the surrounding code (TypeScript, 2-space indentation, single quotes, functional React
   components with hooks). Comment *why*, not *what*.
4. Make sure the checks pass:

   ```bash
   npm run lint     # type-checks the frontend and the server
   npm run build    # production build of the frontend
   ```

   There is no automated test suite yet — if you add logic that can be tested in isolation (for example in
   `src/lib/`), adding tests along with it is very welcome.
5. Update the documentation (`README.md`, `.env.example`) when behaviour or configuration changes.
6. Open a pull request using the template and describe *what* changed and *how you tested it*.

CI runs the same `lint` and `build` steps on every pull request.

## Project layout

See the [project structure](README.md#project-structure) section of the README. In short: `server/` is the Express API,
`src/` is the React application.

## Dependencies

Prefer the existing stack. Please justify new dependencies in the pull request (maintenance status, size, licence) and
avoid packages with known unpatched vulnerabilities.
