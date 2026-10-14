import React, { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { fetchMissingIssues, MissingIssue } from '@/api/issues';
import { JiraProject } from '@/api/projects';
import {
  TABLE,
  TABLE_BODY,
  TABLE_EMPTY_CELL,
  TABLE_HEAD_ROW,
  TABLE_ROW,
  TABLE_TD,
  TABLE_TD_DATE,
  TABLE_TD_KEY,
  TABLE_TD_MUTED,
  TABLE_TH,
  TableCard
} from '@/components/DataTable';
import { IssueKeyLink } from '@/components/IssueKeyLink';
import { JiraPreloader } from '@/components/JiraPreloader';
import { MissingIssuesCharts } from '@/components/MissingIssuesCharts';
import { PeriodPicker } from '@/components/PeriodPicker';
import { ReportPdfModal } from '@/components/ReportPdfModal';
import { ScopeBar } from '@/components/ScopeBar';
import { useReportScope } from '@/hooks/useReportScope';
import { AggregatedIssue } from '@/lib/aggregateIssues';
import { formatPeriodLabel } from '@/lib/period';
import { formatScopeChips } from '@/lib/reportScope';
import { formatDateShort } from '@/lib/timeUtils';

interface MissingWorklogsPageProps {
  enabled: boolean;
  projects: JiraProject[];
}

function toAggregated(issue: MissingIssue): AggregatedIssue {
  return {
    issue_key: issue.key,
    issue_summary: issue.summary,
    issue_type: issue.issueType,
    status: issue.status,
    labels: issue.labels,
    epic: issue.epic,
    authors: issue.assignee ? [issue.assignee] : [],
    last_author: issue.assignee,
    last_started: issue.updated,
    time_spent_seconds: 0,
    time_spent: '0m',
    time_spent_hours: 0,
    comment: '',
    worklog_count: 0,
    timeByAuthor: {}
  };
}

export const MissingWorklogsPage: React.FC<MissingWorklogsPageProps> = ({ enabled, projects }) => {
  const { scope, setScope } = useReportScope('missing');
  const range = { from: scope.period.from, to: scope.period.to };
  const [issues, setIssues] = useState<MissingIssue[]>([]);
  /** Issues without the label filter — only used to build the filter bar options. */
  const [optionIssues, setOptionIssues] = useState<MissingIssue[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchMissingIssues({
      from: range.from,
      to: range.to,
      projectKeys: scope.projectKeys,
      labels: scope.labels,
      excludedStatuses: scope.excludedStatuses
    })
      .then(items => {
        if (!cancelled) {
          setIssues(items);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch issues.');
          setIssues([]);
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
  }, [
    enabled,
    range.from,
    range.to,
    scope.excludedStatuses.join('|'),
    scope.labels.join('|'),
    scope.projectKeys.join('|')
  ]);

  useEffect(() => {
    if (!enabled || scope.labels.length === 0) {
      setOptionIssues([]);
      return;
    }
    let cancelled = false;
    fetchMissingIssues({
      from: range.from,
      to: range.to,
      projectKeys: scope.projectKeys,
      labels: [],
      excludedStatuses: scope.excludedStatuses
    })
      .then(items => {
        if (!cancelled) {
          setOptionIssues(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOptionIssues([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    range.from,
    range.to,
    scope.excludedStatuses.join('|'),
    scope.labels.length === 0,
    scope.projectKeys.join('|')
  ]);

  // People, epics and types are filtered locally — JQL only narrows by project, label, status and date.
  const visibleIssues = useMemo(
    () =>
      issues.filter(issue => {
        if (scope.authors.length && !scope.authors.includes(issue.assignee)) {
          return false;
        }
        if (scope.epics.length && !scope.epics.includes(issue.epic)) {
          return false;
        }
        if (scope.issueTypes.length && !scope.issueTypes.includes(issue.issueType)) {
          return false;
        }
        return true;
      }),
    [issues, scope.authors, scope.epics, scope.issueTypes]
  );
  const aggregated = useMemo(() => visibleIssues.map(toAggregated), [visibleIssues]);
  const optionSource = useMemo(() => [...issues, ...optionIssues], [issues, optionIssues]);
  const periodLabel = formatPeriodLabel(scope.period);
  const subtitle = [...formatScopeChips(scope), periodLabel].join(' · ');

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Missing worklogs</h1>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setPdfOpen(true)}
          className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg flex items-center gap-2 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          PDF export
        </button>
      </div>

      <PeriodPicker
        period={scope.period}
        disabled={loading}
        onChange={period => setScope({ ...scope, period })}
      />

      <ScopeBar
        kind="missing"
        scope={scope}
        projects={projects}
        worklogs={[]}
        extraStatuses={optionSource.map(issue => issue.status)}
        extraLabels={optionSource.map(issue => issue.labels)}
        extraAuthors={optionSource.map(issue => issue.assignee)}
        extraEpics={optionSource.map(issue => issue.epic)}
        extraTypes={optionSource.map(issue => issue.issueType)}
        onChange={setScope}
      />

      {loading ? (
        <JiraPreloader label={periodLabel} />
      ) : error ? (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">{error}</div>
      ) : (
        <>
          <MissingIssuesCharts issues={visibleIssues} />
          <TableCard
            title={`Issues without worklogs (${visibleIssues.length})`}
            subtitle="Issues with no time logged in the selected range"
          >
            <table className={TABLE}>
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className={`${TABLE_TH} w-28`}>Key</th>
                  <th className={`${TABLE_TH} min-w-[220px]`}>Issue Summary / Module</th>
                  <th className={`${TABLE_TH} w-28`}>Status</th>
                  <th className={`${TABLE_TH} w-36`}>Updated</th>
                  <th className={`${TABLE_TH} w-40`}>Assignee</th>
                </tr>
              </thead>
              <tbody className={TABLE_BODY}>
                {visibleIssues.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={TABLE_EMPTY_CELL}>
                      No issues without worklogs in this range.
                    </td>
                  </tr>
                ) : (
                  visibleIssues.map(issue => (
                    <tr key={issue.key} className={TABLE_ROW}>
                      <td className={TABLE_TD_KEY}>
                        <IssueKeyLink issueKey={issue.key} />
                      </td>
                      <td className={`${TABLE_TD} max-w-md`}>
                        <div className="font-medium text-slate-900 truncate">{issue.summary}</div>
                        {issue.labels ? (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">{issue.labels}</div>
                        ) : null}
                      </td>
                      <td className={TABLE_TD_MUTED}>{issue.status}</td>
                      <td className={TABLE_TD_DATE}>{formatDateShort(issue.updated)}</td>
                      <td className={`${TABLE_TD} font-medium text-slate-800`}>
                        {issue.assignee || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableCard>
        </>
      )}

      <ReportPdfModal
        open={pdfOpen}
        title="Issues without worklogs"
        subtitle={subtitle}
        issues={aggregated}
        scope={scope}
        availableAuthors={[]}
        onClose={() => setPdfOpen(false)}
      />
    </div>
  );
};
