import { Router } from 'express';
import { requireJiraAuth, requireJiraSite } from '../auth/middleware';
import { jiraRequest } from '../services/jiraClient';

interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export const projectsRouter = Router();

projectsRouter.get('/', requireJiraAuth, requireJiraSite, async (req, res) => {
  try {
    const projects: JiraProject[] = [];
    let startAt = 0;
    const maxResults = 50;
    let pages = 0;

    while (pages < 40) {
      pages += 1;
      const data = await jiraRequest<{
        values?: JiraProject[];
        isLast?: boolean;
        total?: number;
      }>(req.jira!, `/rest/api/3/project/search?maxResults=${maxResults}&startAt=${startAt}&action=view`);

      projects.push(...(data.values || []));
      startAt += maxResults;
      if (data.isLast === true || !(data.values || []).length) {
        break;
      }
    }

    res.json({
      projects: projects.map(project => ({
        id: project.id,
        key: project.key,
        name: project.name
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch projects.';
    console.error('GET /api/projects failed:', message);
    res.status(502).json({ error: message });
  }
});
