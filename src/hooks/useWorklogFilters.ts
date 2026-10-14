import { useMemo, useState } from 'react';
import { filterWorklogs } from '@/lib/filterWorklogs';
import { DEFAULT_FILTERS, FilterState, JiraWorklogItem } from '@/types';

export function useWorklogFilters(worklogs: JiraWorklogItem[]) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const filteredWorklogs = useMemo(
    () => filterWorklogs(worklogs, filters),
    [worklogs, filters]
  );

  return {
    filters,
    setFilters,
    filteredWorklogs
  };
}
