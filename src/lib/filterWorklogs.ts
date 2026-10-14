import { FilterState, JiraWorklogItem } from '@/types';

export function filterWorklogs(worklogs: JiraWorklogItem[], filters: FilterState): JiraWorklogItem[] {
  return worklogs.filter(w => {
    if (filters.authors.length > 0 && !filters.authors.includes(w.author)) {
      return false;
    }

    if (filters.issueTypes.length > 0 && !filters.issueTypes.includes(w.issue_type)) {
      return false;
    }

    if (filters.statuses.length > 0 && !filters.statuses.includes(w.status)) {
      return false;
    }

    if (filters.epics.length > 0) {
      const epicName = w.parent_1_summary || w.parent_2_summary || '';
      if (!filters.epics.includes(epicName)) {
        return false;
      }
    }

    if (filters.sprints.length > 0) {
      const sp = w.fix_versions || w.sprint || '';
      if (!filters.sprints.includes(sp)) {
        return false;
      }
    }

    if (w.started) {
      const itemDateStr = w.started.split('T')[0];
      if (filters.dateFrom && itemDateStr < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && itemDateStr > filters.dateTo) {
        return false;
      }
    }

    return true;
  });
}
