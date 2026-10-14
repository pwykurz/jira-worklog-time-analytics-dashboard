import React from 'react';
import { ListFilter } from 'lucide-react';

/** Shared table styles: the dashboard and the reports should look identical. */
export const TABLE_CARD = 'bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8';
export const TABLE_SCROLL = 'overflow-x-auto';
export const TABLE = 'w-full text-left text-xs border-collapse';
export const TABLE_HEAD_ROW =
  'bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100';
export const TABLE_TH = 'py-3 px-4';
export const TABLE_TH_RIGHT = 'py-3 px-4 text-right';
export const TABLE_TH_SORTABLE = 'py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors';
export const TABLE_BODY = 'divide-y divide-slate-50 text-slate-600';
export const TABLE_ROW = 'hover:bg-blue-50/40 transition-colors';
export const TABLE_TD = 'py-2.5 px-4';
export const TABLE_TD_KEY = 'py-2.5 px-4 font-mono font-semibold text-blue-600 whitespace-nowrap';
export const TABLE_TD_MUTED = 'py-2.5 px-4 whitespace-nowrap text-slate-600';
export const TABLE_TD_DATE = 'py-2.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]';
export const TABLE_TD_TIME = 'py-2.5 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-900';
export const TABLE_TD_MONEY =
  'py-2.5 px-4 text-right whitespace-nowrap font-mono text-emerald-600 font-semibold';
export const TABLE_EMPTY_CELL = 'py-12 text-center text-slate-400';
export const TABLE_FOOTER =
  'p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600';

export function issueTypeBadgeClass(type: string): string {
  const value = (type || '').toLowerCase();
  if (value.includes('bug')) {
    return 'bg-amber-50 text-amber-700 border-amber-200/80';
  }
  if (value.includes('story')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
  }
  if (value.includes('subtask') || value.includes('sub-task')) {
    return 'bg-blue-50 text-blue-700 border-blue-200/80';
  }
  if (value.includes('epic')) {
    return 'bg-purple-50 text-purple-700 border-purple-200/80';
  }
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

export const IssueTypeBadge: React.FC<{ type?: string }> = ({ type }) => {
  if (!type) {
    return <span className="text-slate-300">—</span>;
  }
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${issueTypeBadgeClass(type)}`}
    >
      {type}
    </span>
  );
};

interface TableCardProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const TableCard: React.FC<TableCardProps> = ({ title, subtitle, actions, footer, children }) => (
  <div className={TABLE_CARD}>
    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="flex items-center gap-3">
        <ListFilter className="w-5 h-5 text-blue-600" />
        <div>
          <h3 className="font-semibold text-sm text-slate-900">{title}</h3>
          {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex items-center flex-wrap gap-2 text-xs">{actions}</div> : null}
    </div>
    <div className={TABLE_SCROLL}>{children}</div>
    {footer}
  </div>
);
