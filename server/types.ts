export interface WorklogRecord {
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
  time_spent: string;
  time_spent_seconds: number;
  started: string;
  comment?: string;
  has_worklog?: boolean;
  parent_1_key?: string;
  parent_1_summary?: string;
  parent_1_type?: string;
  parent_1_sprint?: string;
  parent_2_key?: string;
  parent_2_summary?: string;
  parent_2_type?: string;
  parent_2_sprint?: string;
  [key: string]: unknown;
}
