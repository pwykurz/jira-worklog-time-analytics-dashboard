import React from 'react';
import { loginUrl } from '@/api/client';

interface LoginScreenProps {
  error?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ error }) => {
  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-2">JiraMetrics</p>
        <h1 className="text-xl font-semibold text-slate-900">Worklog Analytics</h1>
        <p className="text-sm text-slate-500 mt-2 mb-6">
          Sign in with your Atlassian account to fetch worklogs using your own Jira permissions.
        </p>
        {error ? (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm text-left">
            {error}
          </div>
        ) : null}
        <a
          href={loginUrl()}
          className="inline-flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
        >
          Sign in with Jira
        </a>
      </div>
    </div>
  );
};
