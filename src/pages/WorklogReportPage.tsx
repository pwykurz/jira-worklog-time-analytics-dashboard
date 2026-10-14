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
  sortIssuesByLastDate
} from '@/lib/aggregateIssues';
import { formatPeriodLabel } from '@/lib/period';
import { formatScopeChips } from '@/lib/reportScope';

interface WorklogReportPageProps {
  enabled: boolean;
  projects: JiraProject[];
}

export const WorklogReportPage: React.FC<WorklogReportPageProps> = ({ enabled, projects }) => {
  const { scope, setScope } = useReportScope('worklog');
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
    () => sortIssuesByLastDate(aggregateWorklogsByIssue(scopedWorklogs)),
    [scopedWorklogs]
  );

  const authors = [...new Set(issues.flatMap(issue => issue.authors))];
  const periodLabel = formatPeriodLabel(scope.period);
  const subtitle = [...formatScopeChips(scope), periodLabel].join(' · ');

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Worklog</h1>
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
        kind="worklog"
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
          <AnalyticsCharts worklogs={scopedWorklogs} />
          <IssueReportTable issues={issues} showDate />
        </>
      )}

      <ReportPdfModal
        open={pdfOpen}
        title="Worklog"
        subtitle={subtitle}
        issues={issues}
        scope={scope}
        availableAuthors={authors}
        onClose={() => setPdfOpen(false)}
      />
    </div>
  );
};
