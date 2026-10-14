import * as XLSX from 'xlsx';
import { JiraWorklogItem } from '@/types';
import { parseJiraDurationToSeconds } from '@/lib/timeUtils';

export async function parseUploadedFile(file: File): Promise<JiraWorklogItem[]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.json')) {
    const text = await file.text();
    const json = JSON.parse(text);
    if (Array.isArray(json)) {
      return normalizeWorklogArray(json);
    } else if (json.worklogs && Array.isArray(json.worklogs)) {
      return normalizeWorklogArray(json.worklogs);
    } else if (json.issues && Array.isArray(json.issues)) {
      return normalizeWorklogArray(json.issues);
    }
  }

  // Handle Excel (.xlsx, .xls, .ods, .csv, .tsv, .html) via XLSX or HTML DOM
  if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
    const text = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const table = doc.querySelector('table');
    if (table) {
      const wb = XLSX.utils.table_to_book(table);
      const sheetName = wb.SheetNames[0];
      const rawData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
      return normalizeWorklogArray(rawData);
    }
  }

  // Standard SheetJS arrayBuffer reading
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true, raw: false });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  return normalizeWorklogArray(rawRows);
}

function normalizeWorklogArray(rows: any[]): JiraWorklogItem[] {
  return rows.map((row, index) => {
    // Look for column names case-insensitively
    const findVal = (...keys: string[]) => {
      for (const key of keys) {
        const lowerKey = key.toLowerCase();
        for (const rowKey of Object.keys(row)) {
          if (rowKey.toLowerCase().replace(/[\s_]+/g, '') === lowerKey.replace(/[\s_]+/g, '')) {
            const val = row[rowKey];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              return String(val).trim();
            }
          }
        }
      }
      return '';
    };

    // Some aliases are Polish: they let the importer read Jira exports from Polish-localised instances.
    const issue_key = findVal('issue_key', 'issuekey', 'key', 'klucz', 'id') || `TASK-${index + 1}`;
    const issue_summary = findVal('issue_summary', 'issuesummary', 'summary', 'podsumowanie', 'temat', 'name') || 'No summary';
    const issue_type = findVal('issue_type', 'issuetype', 'type', 'typ') || 'Task';
    const status = findVal('status', 'stan') || 'In Progress';
    const sprint = findVal('sprint', 'sprinty');
    const fix_versions = findVal('fix_versions', 'fixversions', 'version', 'wersja');
    const labels = findVal('labels', 'label', 'etykiety');
    const author = findVal('author', 'user', 'username', 'uzytkownik', 'autor', 'full_name', 'person') || 'Unassigned';
    const author_email = findVal('author_email', 'email', 'mail');
    const author_account_id = findVal('author_account_id', 'account_id');
    const started = findVal('started', 'date', 'data', 'created', 'started_date') || new Date().toISOString();
    const comment = findVal('comment', 'komentarz', 'worklog_comment', 'description');

    // Time spent parsing
    const rawTimeSpentSeconds = findVal('time_spent_seconds', 'time_spent_sec', 'seconds', 'sekundy');
    const rawTimeSpent = findVal('time_spent', 'timespent', 'duration', 'czas', 'godziny');

    let seconds = 0;
    if (rawTimeSpentSeconds && !isNaN(Number(rawTimeSpentSeconds))) {
      seconds = Number(rawTimeSpentSeconds);
    } else if (rawTimeSpent) {
      seconds = parseJiraDurationToSeconds(rawTimeSpent);
    } else {
      seconds = 3600; // default 1h if missing
    }

    const time_spent = rawTimeSpent || `${Math.round(seconds / 3600)}h`;

    const parent_1_key = findVal('parent_1_key', 'parent_key', 'epic_key', 'epic');
    const parent_1_summary = findVal('parent_1_summary', 'parent_summary', 'epic_name', 'epic_link', 'projekt');
    const parent_1_type = findVal('parent_1_type', 'parent_type');
    const parent_2_key = findVal('parent_2_key');
    const parent_2_summary = findVal('parent_2_summary');
    const parent_2_type = findVal('parent_2_type');

    return {
      id: `imported-${index}-${Date.now()}`,
      issue_key,
      issue_summary,
      issue_type,
      status,
      sprint,
      fix_versions,
      labels,
      author,
      author_email,
      author_account_id,
      time_spent,
      time_spent_seconds: seconds,
      started,
      comment,
      has_worklog: true,
      parent_1_key,
      parent_1_summary,
      parent_1_type,
      parent_2_key,
      parent_2_summary,
      parent_2_type
    };
  }).filter(item => item.time_spent_seconds > 0 || item.issue_key);
}
