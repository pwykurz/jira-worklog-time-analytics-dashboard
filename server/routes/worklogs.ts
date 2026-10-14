import { Router } from 'express';
import { requireJiraAuth, requireJiraSite } from '../auth/middleware';
import { currentMonthRange, isIsoDate } from '../lib/dates';
import { fetchJiraWorklogs } from '../services/jira';

export const worklogsRouter = Router();

worklogsRouter.get('/', requireJiraAuth, requireJiraSite, async (req, res) => {
  try {
    const defaults = currentMonthRange();
    const from = isIsoDate(req.query.from) ? req.query.from : defaults.from;
    const to = isIsoDate(req.query.to) ? req.query.to : defaults.to;
    const project = typeof req.query.project === 'string' ? req.query.project.trim() : '';

    if (from >= to) {
      res.status(400).json({ error: 'The "from" parameter must be earlier than "to".' });
      return;
    }

    const worklogs = await fetchJiraWorklogs(req.jira!, from, to, project || undefined);
    res.json({ worklogs, from, to, project: project || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch worklogs from Jira.';
    console.error('GET /api/worklogs failed:', message);
    res.status(502).json({ error: message });
  }
});
