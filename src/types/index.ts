export interface JiraWorklogItem {
  id: string;
  issue_key: string;
  issue_summary: string;
  issue_type: string;
  status: string;
  sprint?: string;
  fix_versions?: string;
  labels?: string;
  author: string;
  author_email?: string;
  author_account_id?: string;
  time_spent: string; // e.g. "7h", "15m"
  time_spent_seconds: number;
  started: string; // ISO date string
  comment?: string;
  has_worklog?: boolean | string;
  parent_1_key?: string;
  parent_1_summary?: string;
  parent_1_type?: string;
  parent_1_sprint?: string;
  parent_2_key?: string;
  parent_2_summary?: string;
  parent_2_type?: string;
  parent_2_sprint?: string;
  [key: string]: any;
}

export interface FilterState {
  authors: string[];
  issueTypes: string[];
  statuses: string[];
  sprints: string[];
  epics: string[];
  dateFrom: string;
  dateTo: string;
  presetDateRange: string; // 'all' | 'this_month' | 'last_month' | 'last_30_days' | 'q1_2026'
  hourlyRate: number;
  currency: string;
}

export const DEFAULT_FILTERS: FilterState = {
  authors: [],
  issueTypes: [],
  statuses: [],
  sprints: [],
  epics: [],
  dateFrom: '',
  dateTo: '',
  presetDateRange: 'all',
  hourlyRate: 100,
  currency: 'USD'
};

export interface GroupedWorklog {
  groupName: string;
  totalSeconds: number;
  totalHours: number;
  itemCount: number;
  items: JiraWorklogItem[];
}

export interface ReportConfig {
  clientName: string;
  reportTitle: string;
  preparedBy: string;
  hourlyRate: number;
  currency: string;
  notes: string;
  showAuthorBreakdown: boolean;
  showTypeBreakdown: boolean;
  showEpicBreakdown: boolean;
  showDetailedTable: boolean;
  themeColor: 'navy' | 'emerald' | 'slate';
}
