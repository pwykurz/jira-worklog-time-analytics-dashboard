import { defaultPeriod, PeriodState } from '@/lib/period';

export type ReportKind = 'time' | 'worklog' | 'missing';

export type PdfColumnId =
  | 'issue_key'
  | 'issue_summary'
  | 'status'
  | 'issue_type'
  | 'labels'
  | 'epic'
  | 'authors'
  | 'last_started'
  | 'time_spent'
  | 'assignee'
  | 'updated'
  | 'comment';

export interface PdfSections {
  kpi: boolean;
  table: boolean;
  authors: boolean;
  overhead: boolean;
  summary: boolean;
}

export interface ReportScope {
  projectKeys: string[];
  labels: string[];
  epics: string[];
  issueTypes: string[];
  authors: string[];
  period: PeriodState;
  excludedStatuses: string[];
  qaPercent: number;
  poPercent: number;
  columns: PdfColumnId[];
  sections: PdfSections;
}

export const PDF_COLUMN_LABELS: Record<PdfColumnId, string> = {
  issue_key: 'Key',
  issue_summary: 'Summary',
  status: 'Status',
  issue_type: 'Type',
  labels: 'Labels',
  epic: 'Epic',
  authors: 'Authors',
  last_started: 'Last worklog',
  time_spent: 'Time',
  assignee: 'Assignee',
  updated: 'Updated',
  comment: 'Comment'
};

const DEFAULT_SECTIONS: PdfSections = {
  kpi: true,
  table: true,
  authors: true,
  overhead: false,
  summary: true
};

export function defaultScope(kind: ReportKind): ReportScope {
  if (kind === 'time') {
    return {
      projectKeys: [],
      labels: [],
      epics: [],
      issueTypes: [],
      authors: [],
      period: defaultPeriod(),
      excludedStatuses: [],
      qaPercent: 10,
      poPercent: 15,
      columns: ['issue_key', 'issue_summary', 'authors', 'time_spent', 'labels'],
      sections: { ...DEFAULT_SECTIONS, overhead: true }
    };
  }
  if (kind === 'worklog') {
    return {
      projectKeys: [],
      labels: [],
      epics: [],
      issueTypes: [],
      authors: [],
      period: defaultPeriod(),
      excludedStatuses: [],
      qaPercent: 0,
      poPercent: 0,
      columns: ['last_started', 'issue_key', 'issue_summary', 'authors', 'time_spent'],
      sections: { ...DEFAULT_SECTIONS, overhead: false }
    };
  }
  return {
    projectKeys: [],
    labels: [],
    epics: [],
    issueTypes: [],
    authors: [],
    period: defaultPeriod(),
    excludedStatuses: ['To Do', 'Closed'],
    qaPercent: 0,
    poPercent: 0,
    columns: ['issue_key', 'issue_summary', 'status', 'updated', 'assignee'],
    sections: { kpi: true, table: true, authors: false, overhead: false, summary: true }
  };
}

function storageKey(kind: ReportKind): string {
  return `jira-report-scope-${kind}`;
}

const ISSUE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9]*-\d+$/;

export function loadScope(kind: ReportKind): ReportScope {
  const fallback = defaultScope(kind);
  try {
    const raw = localStorage.getItem(storageKey(kind));
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<ReportScope>;
    return {
      ...fallback,
      ...parsed,
      // Older saved scopes stored a preset ("last_month") instead of a full period.
      period: parsed.period?.from && parsed.period?.to ? parsed.period : fallback.period,
      sections: { ...fallback.sections, ...(parsed.sections || {}) },
      columns: parsed.columns?.length ? parsed.columns : fallback.columns,
      projectKeys: parsed.projectKeys || fallback.projectKeys,
      labels: parsed.labels || fallback.labels,
      // The "missing worklogs" report used to store parent keys; epics are now picked by name like in the other reports.
      epics: (parsed.epics || fallback.epics).filter(
        value => kind !== 'missing' || !ISSUE_KEY_PATTERN.test(value)
      )
    };
  } catch {
    return fallback;
  }
}

export function saveScope(kind: ReportKind, scope: ReportScope): void {
  try {
    localStorage.setItem(storageKey(kind), JSON.stringify(scope));
  } catch {
    // Storage can be unavailable (private mode, quota); the scope just won't persist.
  }
}

export function formatScopeChips(scope: ReportScope): string[] {
  const chips: string[] = [];
  chips.push(scope.projectKeys.length ? scope.projectKeys.join(', ') : 'All projects');
  if (scope.labels.length) {
    chips.push(scope.labels.join(', '));
  }
  if (scope.epics.length) {
    chips.push(scope.epics.join(', '));
  }
  if (scope.authors.length) {
    chips.push(scope.authors.join(', '));
  }
  return chips;
}
