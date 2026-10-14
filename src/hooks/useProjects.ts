import { useCallback, useEffect, useState } from 'react';
import { fetchProjects, JiraProject } from '@/api/projects';

const STORAGE_KEY = 'jira-worklog-project-key';

export function useProjects(enabled: boolean) {
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [projectKey, setProjectKeyState] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchProjects()
      .then(items => {
        if (cancelled) {
          return;
        }
        setProjects(items);
        setProjectKeyState(prev => {
          if (prev && items.some(item => item.key === prev)) {
            return prev;
          }
          return '';
        });
        setError(null);
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch projects.');
          setProjects([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const setProjectKey = useCallback((key: string) => {
    setProjectKeyState(key);
    if (key) {
      localStorage.setItem(STORAGE_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return { projects, projectKey, setProjectKey, loading, error };
}
