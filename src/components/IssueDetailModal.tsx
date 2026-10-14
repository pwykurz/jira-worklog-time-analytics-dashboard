import React from 'react';
import { X, Clock, User, Calendar, Layers, Tag, CheckCircle2 } from 'lucide-react';
import { CurrencyGlyph } from '@/components/CurrencyGlyph';
import { IssueKeyLink } from '@/components/IssueKeyLink';
import { JiraWorklogItem } from '@/types';
import { formatCurrency, formatDate, secondsToDecimalHours, secondsToFormattedTime } from '@/lib/timeUtils';

interface IssueDetailModalProps {
  issue: JiraWorklogItem | null;
  onClose: () => void;
  hourlyRate: number;
  currency: string;
}

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({
  issue,
  onClose,
  hourlyRate,
  currency
}) => {
  if (!issue) return null;

  const hoursDecimal = secondsToDecimalHours(issue.time_spent_seconds);
  const calculatedCost = hoursDecimal * hourlyRate;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 font-mono font-bold text-sm">
            <IssueKeyLink issueKey={issue.issue_key} />
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
            {issue.issue_type}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-medium text-xs">
            {issue.status}
          </span>
        </div>

        <h2 className="text-lg font-bold text-slate-900 mb-4">
          {issue.issue_summary}
        </h2>

        {/* Key Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 text-xs">
          
          <div>
            <span className="text-slate-400 block mb-0.5">Author</span>
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>{issue.author}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Time Spent</span>
            <div className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{secondsToFormattedTime(issue.time_spent_seconds)}</span>
              <span className="text-slate-400 text-[10px]">({hoursDecimal}h)</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Work Value</span>
            <div className="font-bold text-emerald-700 font-mono flex items-center gap-1.5">
              <CurrencyGlyph currency={currency} className="w-3.5 h-3.5 text-emerald-600" />
              <span>{formatCurrency(calculatedCost, currency)}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Started</span>
            <div className="font-medium text-slate-700 font-mono flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatDate(issue.started)}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Version / Sprint</span>
            <div className="font-medium text-slate-700">
              {issue.fix_versions || issue.sprint || '-'}
            </div>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Labels</span>
            <div className="font-medium text-slate-700 flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-400" />
              <span>{issue.labels || '-'}</span>
            </div>
          </div>

        </div>

        {/* Parent / Epic hierarchy */}
        {(issue.parent_1_summary || issue.parent_2_summary) && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Related Epic / Project
            </h4>
            <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl text-xs space-y-1">
              {issue.parent_1_summary && (
                <div className="flex items-center gap-2 text-slate-800">
                  <span className="font-mono font-bold text-blue-700">{issue.parent_1_key}</span>
                  <span>{issue.parent_1_summary}</span>
                  {issue.parent_1_type && (
                    <span className="text-[10px] bg-blue-200/80 px-1.5 py-0.5 rounded text-blue-900 font-medium">
                      {issue.parent_1_type}
                    </span>
                  )}
                </div>
              )}
              {issue.parent_2_summary && (
                <div className="flex items-center gap-2 text-slate-600 pl-4 border-l-2 border-blue-300">
                  <span className="font-mono font-bold text-slate-700">{issue.parent_2_key}</span>
                  <span>{issue.parent_2_summary}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Comments if any */}
        {issue.comment && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Worklog Comment
            </h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 italic whitespace-pre-wrap">
              "{issue.comment}"
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
