import React from 'react';
import { Clock, Bug, Layers, TrendingUp } from 'lucide-react';
import { CurrencyGlyph } from '@/components/CurrencyGlyph';
import { JiraWorklogItem } from '@/types';
import { secondsToFormattedTime, secondsToDecimalHours, formatCurrency } from '@/lib/timeUtils';

interface KpiCardsProps {
  filteredWorklogs: JiraWorklogItem[];
  allWorklogsCount: number;
  hourlyRate: number;
  currency: string;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  filteredWorklogs,
  allWorklogsCount,
  hourlyRate,
  currency
}) => {
  const totalSeconds = filteredWorklogs.reduce((acc, w) => acc + w.time_spent_seconds, 0);
  const totalHoursDecimal = secondsToDecimalHours(totalSeconds);
  const totalCost = totalHoursDecimal * hourlyRate;

  const bugSeconds = filteredWorklogs
    .filter(w => (w.issue_type || '').toLowerCase().includes('bug'))
    .reduce((acc, w) => acc + w.time_spent_seconds, 0);

  const bugRatio = totalSeconds > 0 ? ((bugSeconds / totalSeconds) * 100).toFixed(1) : '0';

  const uniqueIssues = new Set(filteredWorklogs.map(w => w.issue_key)).size;
  const uniqueEpics = new Set(
    filteredWorklogs
      .map(w => w.parent_1_summary || w.parent_2_summary)
      .filter(Boolean)
  ).size;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      
      {/* Card 1: Total Logged Time */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Total Logged Time</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-light text-slate-900 tracking-tight">
            {totalHoursDecimal.toFixed(1)} <span className="text-sm font-medium text-slate-400">hrs</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-emerald-600 font-medium flex items-center gap-1">
          <span>{secondsToFormattedTime(totalSeconds)}</span>
          {filteredWorklogs.length !== allWorklogsCount && (
            <span className="text-slate-400 font-normal">({filteredWorklogs.length}/{allWorklogsCount} entries)</span>
          )}
        </div>
      </div>

      {/* Card 2: Active Projects / Issues */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Unique Issues</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-light text-slate-900 tracking-tight">
            {uniqueIssues} <span className="text-sm font-medium text-slate-400">tasks</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          Across {uniqueEpics || 1} modules / epics
        </div>
      </div>

      {/* Card 3: Billing Efficiency / Value */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Billable Value</span>
            <CurrencyGlyph currency={currency} className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-light text-slate-900 tracking-tight">
            {formatCurrency(totalCost, currency)}
          </div>
        </div>
        <div className="mt-3 text-xs text-blue-600 font-medium flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Rate: {hourlyRate} {currency}/h</span>
        </div>
      </div>

      {/* Card 4: Bugs vs Features */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Time on Bugs</span>
            <Bug className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-light text-slate-900 tracking-tight">
            {bugRatio} <span className="text-sm font-medium text-slate-400">%</span>
          </div>
        </div>
        <div className="mt-3">
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-1">
            <div 
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Number(bugRatio))}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400">
            {secondsToFormattedTime(bugSeconds)} spent on fixes
          </div>
        </div>
      </div>

    </section>
  );
};

