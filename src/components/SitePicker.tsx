import React from 'react';
import { JiraSite } from '@/api/auth';

interface SitePickerProps {
  sites: JiraSite[];
  onSelect: (cloudId: string) => void;
}

export const SitePicker: React.FC<SitePickerProps> = ({ sites, onSelect }) => {
  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <h1 className="text-xl font-semibold text-slate-900">Select a Jira site</h1>
        <p className="text-sm text-slate-500 mt-2 mb-4">
          This account has access to several sites. Choose the one to fetch worklogs from.
        </p>
        <div className="space-y-2">
          {sites.map(site => (
            <button
              key={site.cloudId}
              type="button"
              onClick={() => onSelect(site.cloudId)}
              className="w-full text-left px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              <div className="text-sm font-semibold text-slate-900">{site.name}</div>
              <div className="text-xs text-slate-500">{site.url}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
