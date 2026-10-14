import React from 'react';
import { LoaderCircle } from 'lucide-react';

interface JiraPreloaderProps {
  label: string;
  title?: string;
}

export const JiraPreloader: React.FC<JiraPreloaderProps> = ({ label, title = 'Fetching worklogs from Jira' }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[420px] flex flex-col items-center justify-center text-center px-6">
      <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin mb-4" />
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-xs text-slate-500 mt-1.5 max-w-md">
        {label}. The first fetch of a period may take a moment.
      </p>
    </div>
  );
};
