import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      // In development the SPA proxies /api to the Express server (PORT, default 3001).
      // Fetching worklogs from Jira can be slow, hence the long timeouts.
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          timeout: 10 * 60 * 1000,
          proxyTimeout: 10 * 60 * 1000,
        },
      },
    },
  };
});
