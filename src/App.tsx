/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { JiraSiteUrlProvider } from '@/components/JiraSiteContext';
import { Sidebar } from '@/components/Sidebar';
import { LoginScreen } from '@/components/LoginScreen';
import { SitePicker } from '@/components/SitePicker';
import { JiraPreloader } from '@/components/JiraPreloader';
import { ExplorePage } from '@/pages/ExplorePage';
import { TimeByIssuePage } from '@/pages/TimeByIssuePage';
import { WorklogReportPage } from '@/pages/WorklogReportPage';
import { MissingWorklogsPage } from '@/pages/MissingWorklogsPage';

const EMPTY_TOOLS = {
  onOpenUpload: () => undefined,
  onOpenPdfReport: () => undefined,
  onFilesSelected: async () => undefined
};

export default function App() {
  const { user, loading: authLoading, error: authError, chooseSite, logout } = useAuth();
  const ready = Boolean(user?.cloudId);
  const { projects, projectKey, setProjectKey, loading: projectsLoading } = useProjects(ready);
  const location = useLocation();
  const [exploreTools, setExploreTools] = useState(EMPTY_TOOLS);

  const registerExploreTools = useCallback((tools: typeof EMPTY_TOOLS) => {
    setExploreTools(tools);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center">
        <JiraPreloader title="Signing in" label="Checking your Jira session" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen error={authError} />;
  }

  if (!user.cloudId) {
    return (
      <SitePicker
        sites={user.sites}
        onSelect={cloudId => {
          void chooseSite(cloudId);
        }}
      />
    );
  }

  return (
    <JiraSiteUrlProvider value={user.site?.url || ''}>
      <div className="min-h-screen md:h-screen w-full bg-[#F8FAFC] flex flex-col md:flex-row overflow-x-hidden md:overflow-hidden font-sans text-[#1E293B]">
      <Sidebar
        path={location.pathname}
        onOpenUpload={exploreTools.onOpenUpload}
        onOpenPdfReport={exploreTools.onOpenPdfReport}
        onFilesSelected={exploreTools.onFilesSelected}
      />

      <main className="flex-1 flex flex-col min-w-0 md:overflow-y-auto">
        <Routes>
          <Route
            path="/"
            element={
              <ExplorePage
                userName={user.displayName}
                projects={projects}
                projectKey={projectKey}
                projectsLoading={projectsLoading}
                onProjectChange={setProjectKey}
                onLogout={() => {
                  void logout();
                }}
                ready={ready}
                onRegisterTools={registerExploreTools}
              />
            }
          />
          <Route
            path="/reports/time"
            element={
              <div className="p-4 sm:p-6 lg:p-8 flex-1">
                <TimeByIssuePage enabled={ready} projects={projects} />
              </div>
            }
          />
          <Route
            path="/reports/worklog"
            element={
              <div className="p-4 sm:p-6 lg:p-8 flex-1">
                <WorklogReportPage enabled={ready} projects={projects} />
              </div>
            }
          />
          <Route
            path="/reports/missing"
            element={
              <div className="p-4 sm:p-6 lg:p-8 flex-1">
                <MissingWorklogsPage enabled={ready} projects={projects} />
              </div>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <footer className="bg-white border-t border-slate-200 py-3 px-8 text-xs text-slate-400 flex items-center justify-between">
          <span>JiraMetrics Worklog Analytics</span>
          <span>Scoped reports • v2.0</span>
        </footer>
      </main>
      </div>
    </JiraSiteUrlProvider>
  );
}
