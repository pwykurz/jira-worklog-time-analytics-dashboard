import React from 'react';
import { Layers } from 'lucide-react';
import {
  IssueTypeBadge,
  TABLE,
  TABLE_BODY,
  TABLE_EMPTY_CELL,
  TABLE_HEAD_ROW,
  TABLE_ROW,
  TABLE_TD,
  TABLE_TD_DATE,
  TABLE_TD_KEY,
  TABLE_TD_MUTED,
  TABLE_TD_TIME,
  TABLE_TH,
  TABLE_TH_RIGHT,
  TableCard
} from '@/components/DataTable';
import { IssueKeyLink } from '@/components/IssueKeyLink';
import { AggregatedIssue } from '@/lib/aggregateIssues';
import { formatDateShort } from '@/lib/timeUtils';

interface IssueReportTableProps {
  issues: AggregatedIssue[];
  showTime?: boolean;
  showDate?: boolean;
  title?: string;
  subtitle?: string;
  emptyText?: string;
}

export const IssueReportTable: React.FC<IssueReportTableProps> = ({
  issues,
  showTime = true,
  showDate = false,
  title = 'Issues',
  subtitle = 'Aggregated issues in the selected range',
  emptyText = 'No issues in the selected range.'
}) => {
  const columnCount = 5 + (showDate ? 1 : 0) + (showTime ? 1 : 0);

  return (
    <TableCard title={`${title} (${issues.length})`} subtitle={subtitle}>
      <table className={TABLE}>
        <thead>
          <tr className={TABLE_HEAD_ROW}>
            <th className={`${TABLE_TH} w-28`}>Key</th>
            <th className={`${TABLE_TH} min-w-[220px]`}>Issue Summary / Module</th>
            <th className={`${TABLE_TH} w-24`}>Type</th>
            <th className={`${TABLE_TH} w-28`}>Status</th>
            <th className={`${TABLE_TH} w-40`}>Authors</th>
            {showDate ? <th className={`${TABLE_TH} w-36`}>Entry date</th> : null}
            {showTime ? <th className={`${TABLE_TH_RIGHT} w-28`}>Time</th> : null}
          </tr>
        </thead>
        <tbody className={TABLE_BODY}>
          {issues.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className={TABLE_EMPTY_CELL}>
                {emptyText}
              </td>
            </tr>
          ) : (
            issues.map(issue => (
              <tr key={issue.issue_key} className={TABLE_ROW}>
                <td className={TABLE_TD_KEY}>
                  <IssueKeyLink issueKey={issue.issue_key} />
                </td>
                <td className={`${TABLE_TD} max-w-md`}>
                  <div className="font-medium text-slate-900 truncate">{issue.issue_summary}</div>
                  {issue.epic ? (
                    <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                      <Layers className="w-3 h-3 text-slate-400" />
                      <span>{issue.epic}</span>
                    </div>
                  ) : null}
                </td>
                <td className={`${TABLE_TD} whitespace-nowrap`}>
                  <IssueTypeBadge type={issue.issue_type} />
                </td>
                <td className={TABLE_TD_MUTED}>{issue.status}</td>
                <td className={`${TABLE_TD} font-medium text-slate-800`}>
                  {issue.authors.join(', ') || issue.last_author || '—'}
                </td>
                {showDate ? (
                  <td className={TABLE_TD_DATE}>{formatDateShort(issue.last_started)}</td>
                ) : null}
                {showTime ? <td className={TABLE_TD_TIME}>{issue.time_spent}</td> : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </TableCard>
  );
};
