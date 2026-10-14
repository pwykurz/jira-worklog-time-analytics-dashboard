import { useEffect, useState } from 'react';
import { fetchWorklogs } from '@/api/worklogs';
import { JiraWorklogItem } from '@/types';
import { ReportScope } from '@/lib/reportScope';

export function useReportWorklogs(enabled: boolean, scope: ReportScope) {
  const [worklogs, setWorklogs] = useState<JiraWorklogItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const range = { from: scope.period.from, to: scope.period.to };
  const projectKey = scope.projectKeys.length === 1 ? scope.projectKeys[0] : '';

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchWorklogs(range.from, range.to, projectKey || undefined)
      .then(items => {
        if (cancelled) {
          return;
        }
        const filtered =
          scope.projectKeys.length > 1
            ? items.filter(item => scope.projectKeys.some(key => item.issue_key.startsWith(`${key}-`)))
            : items;
        setWorklogs(filtered);
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch worklogs.');
          setWorklogs([]);
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
  }, [enabled, projectKey, range.from, range.to, scope.projectKeys.join('|')]);

  return { worklogs, loading, error, range };
}
