import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWorklogs } from '@/api/worklogs';
import { parseUploadedFile } from '@/lib/fileParser';
import { defaultPeriod, PeriodState } from '@/lib/period';
import { JiraWorklogItem } from '@/types';

export function useWorklogs(enabled: boolean, projectKey: string) {
  const [period, setPeriodState] = useState<PeriodState>(defaultPeriod);
  const [worklogs, setWorklogs] = useState<JiraWorklogItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const periodRef = useRef(period);
  periodRef.current = period;

  const loadFromFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) {
      return [];
    }

    const parsedBatches = await Promise.all(files.map(file => parseUploadedFile(file)));
    const items = parsedBatches.flat();

    if (items.length === 0) {
      throw new Error('No valid time entries were found in the selected file.');
    }

    setWorklogs(items);
    setError(null);
    return items;
  }, []);

  const loadFromApi = useCallback(async (nextPeriod: PeriodState, nextProject = projectKey) => {
    setLoading(true);
    setError(null);

    try {
      const items = await fetchWorklogs(nextPeriod.from, nextPeriod.to, nextProject || undefined);
      setWorklogs(items);
      setPeriodState(nextPeriod);
      return items;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch worklogs from Jira.';
      setError(message);
      setWorklogs([]);
      setPeriodState(nextPeriod);
      return [];
    } finally {
      setLoading(false);
    }
  }, [projectKey]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void loadFromApi(periodRef.current, projectKey);
  }, [enabled, projectKey, loadFromApi]);

  return {
    period,
    worklogs,
    loading,
    error,
    setWorklogs,
    loadFromFiles,
    loadFromApi
  };
}
