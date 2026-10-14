import React, { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { JiraProject } from '@/api/projects';
import { AnalyticsCharts } from '@/components/AnalyticsCharts';
import { IssueReportTable } from '@/components/IssueReportTable';
import { JiraPreloader } from '@/components/JiraPreloader';
import { PeriodPicker } from '@/components/PeriodPicker';
import { ReportPdfModal } from '@/components/ReportPdfModal';
import { ScopeBar } from '@/components/ScopeBar';
import { useReportScope } from '@/hooks/useReportScope';
import { useReportWorklogs } from '@/hooks/useReportWorklogs';
import {
  aggregateWorklogsByIssue,
  filterWorklogsByScope,
  sortIssuesByTime
} from '@/lib/aggregateIssues';
import { formatPeriodLabel } from '@/lib/period';
import { formatScopeChips } from '@/lib/reportScope';
import { secondsToDecimalHours, secondsToFormattedTime } from '@/lib/timeUtils';

interface TimeByIssuePageProps {
  enabled: boolean;
  projects: JiraProject[];
}

export const TimeByIssuePage: React.FC<TimeByIssuePageProps> = ({ enabled, projects }) => {
  const { scope, setScope } = useReportScope('time');
  const { worklogs, loading, error } = useReportWorklogs(enabled, scope);
  const [pdfOpen, setPdfOpen] = useState(false);

  const scopedWorklogs = useMemo(
    () =>
      filterWorklogsByScope(worklogs, {
        labels: scope.labels,
        epics: scope.epics,
        issueTypes: scope.issueTypes,
        authors: scope.authors
      }),
    [scope.authors, scope.epics, scope.issueTypes, scope.labels, worklogs]
  );
  const issues = useMemo(
    () => sortIssuesByTime(aggregateWorklogsByIssue(scopedWorklogs)),
    [scopedWorklogs]
  );

  const totalSeconds = issues.reduce((sum, issue) => sum + issue.time_spent_seconds, 0);
  const authors = [...new Set(issues.flatMap(issue => issue.authors))];
  const periodLabel = formatPeriodLabel(scope.period);
  const subtitle = [...formatScopeChips(scope), periodLabel].join(' · ');

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Time per issue</h1>
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
        kind="time"
        scope={scope}
        projects={projects}
        worklogs={worklogs}
        onChange={setScope}
      />

      {loading ? (
        <JiraPreloader label={periodLabel} />
      ) : error ? (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-[11px] uppercase text-slate-400 font-semibold">Dev time</div>
              <div className="text-2xl font-light">{secondsToFormattedTime(totalSeconds)}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-[11px] uppercase text-slate-400 font-semibold">Issues</div>
              <div className="text-2xl font-light">{issues.length}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="text-[11px] uppercase text-slate-400 font-semibold">People / with overhead</div>
              <div className="text-2xl font-light">{authors.length}</div>
              <div className="text-xs text-slate-500">
                +{scope.qaPercent}% QA +{scope.poPercent}% PO ={' '}
                {(secondsToDecimalHours(totalSeconds) * (1 + scope.qaPercent / 100 + scope.poPercent / 100)).toFixed(2)} h
              </div>
            </div>
          </div>
          <AnalyticsCharts worklogs={scopedWorklogs} />
          <IssueReportTable issues={issues} />
        </>
      )}

      <ReportPdfModal
        open={pdfOpen}
        title="Time per issue"
        subtitle={subtitle}
        issues={issues}
        scope={scope}
        availableAuthors={authors}
        onClose={() => setPdfOpen(false)}
      />
    </div>
  );
};
