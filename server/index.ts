import 'dotenv/config';
import express from 'express';
import { authRouter } from './routes/auth';
import { projectsRouter } from './routes/projects';
import { issuesRouter } from './routes/issues';
import { worklogsRouter } from './routes/worklogs';

const app = express();
app.disable('x-powered-by');
const port = Number(process.env.PORT || 3001);
// Loopback by default: put a TLS-terminating reverse proxy in front. Set HOST=0.0.0.0 to listen on all interfaces.
const host = process.env.HOST || '127.0.0.1';

// Request bodies are tiny (site selection only), so keep the default-sized limit.
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/issues', issuesRouter);
app.use('/api/worklogs', worklogsRouter);

const server = app.listen(port, host, () => {
  console.log(`API listening on http://${host}:${port}`);
});

server.timeout = 10 * 60 * 1000;
server.headersTimeout = 11 * 60 * 1000;
