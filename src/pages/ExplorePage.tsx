import React, { useEffect, useState } from 'react';
import { JiraWorklogItem } from '@/types';
import { useWorklogs } from '@/hooks/useWorklogs';
import { useWorklogFilters } from '@/hooks/useWorklogFilters';
import { formatPeriodLabel } from '@/lib/period';
import { Header } from '@/components/Header';
import { KpiCards } from '@/components/KpiCards';
import { AnalyticsCharts } from '@/components/AnalyticsCharts';
import { WorklogTable } from '@/components/WorklogTable';
import { FileDropzone } from '@/components/FileDropzone';
import { FileUploadModal } from '@/components/FileUploadModal';
import { IssueDetailModal } from '@/components/IssueDetailModal';
import { PdfReportModal } from '@/components/PdfReportModal';
import { JiraPreloader } from '@/components/JiraPreloader';
import { PeriodPicker } from '@/components/PeriodPicker';
import { ProjectPicker } from '@/components/ProjectPicker';
import { RatePicker } from '@/components/RatePicker';
import { JiraProject } from '@/api/projects';

interface ExplorePageProps {
  userName?: string;
  projects: JiraProject[];
  projectKey: string;
  projectsLoading: boolean;
  onProjectChange: (key: string) => void;
  onLogout: () => void;
  ready: boolean;
  onRegisterTools?: (tools: {
    onOpenUpload: () => void;
    onOpenPdfReport: () => void;
    onFilesSelected: (files: FileList | File[]) => Promise<unknown> | void;
  }) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  userName,
  projects,
  projectKey,
  projectsLoading,
  onProjectChange,
  onLogout,
  ready,
  onRegisterTools
}) => {
  const { worklogs, loading, error, period, loadFromFiles, loadFromApi } = useWorklogs(ready, projectKey);
  const { filters, setFilters, filteredWorklogs } = useWorklogFilters(worklogs);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPdfReportOpen, setIsPdfReportOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<JiraWorklogItem | null>(null);
  const showFallback = Boolean(error) && worklogs.length === 0 && !loading;

  useEffect(() => {
    onRegisterTools?.({
      onOpenUpload: () => setIsUploadOpen(true),
      onOpenPdfReport: () => setIsPdfReportOpen(true),
      onFilesSelected: loadFromFiles
    });
    return () => {
      onRegisterTools?.({
        onOpenUpload: () => undefined,
        onOpenPdfReport: () => undefined,
        onFilesSelected: async () => undefined
      });
    };
  }, [loadFromFiles, onRegisterTools]);

  return (
    <>
      <Header
        worklogs={filteredWorklogs}
        hourlyRate={filters.hourlyRate}
        currency={filters.currency}
        userName={userName}
        onLogout={onLogout}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenPdfReport={() => setIsPdfReportOpen(true)}
      />

      <div className="p-4 sm:p-6 lg:p-8 flex-1">
        <PeriodPicker
          period={period}
          disabled={loading}
          extra={
            <>
              <RatePicker
                hourlyRate={filters.hourlyRate}
                currency={filters.currency}
                onChange={next => setFilters({ ...filters, ...next })}
              />
              <ProjectPicker
                projects={projects}
                value={projectKey}
                disabled={loading || projectsLoading}
                onChange={onProjectChange}
              />
            </>
          }
          onChange={next => {
            void loadFromApi(next);
          }}
        />

        {loading ? (
          <JiraPreloader label={formatPeriodLabel(period)} />
        ) : showFallback ? (
          <>
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
              {error}
            </div>
            <FileDropzone onFilesSelected={loadFromFiles} />
          </>
        ) : (
          <>
            <KpiCards
              filteredWorklogs={filteredWorklogs}
              allWorklogsCount={worklogs.length}
              hourlyRate={filters.hourlyRate}
              currency={filters.currency}
            />
            <AnalyticsCharts worklogs={filteredWorklogs} />
            <WorklogTable
              worklogs={filteredWorklogs}
              hourlyRate={filters.hourlyRate}
              currency={filters.currency}
              onSelectIssue={setSelectedIssue}
            />
          </>
        )}
      </div>

      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onFilesSelected={loadFromFiles}
      />
      <IssueDetailModal
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
        hourlyRate={filters.hourlyRate}
        currency={filters.currency}
      />
      <PdfReportModal
        isOpen={isPdfReportOpen}
        onClose={() => setIsPdfReportOpen(false)}
        filteredWorklogs={filteredWorklogs}
        defaultHourlyRate={filters.hourlyRate}
        defaultCurrency={filters.currency}
      />
    </>
  );
};
