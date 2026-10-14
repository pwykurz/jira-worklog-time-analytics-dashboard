import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addDays,
  formatPeriodLabel,
  PeriodMode,
  PeriodState,
  periodFromCustom,
  rangeForMode,
  shiftPeriod
} from '@/lib/period';

interface PeriodPickerProps {
  period: PeriodState;
  disabled?: boolean;
  extra?: React.ReactNode;
  onChange: (period: PeriodState) => void;
}

const MODES: { id: Exclude<PeriodMode, 'custom'>; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' }
];

export const PeriodPicker: React.FC<PeriodPickerProps> = ({ period, disabled, extra, onChange }) => {
  const [customFrom, setCustomFrom] = useState(period.customFrom);
  const [customTo, setCustomTo] = useState(period.customTo);

  useEffect(() => {
    setCustomFrom(period.customFrom);
    setCustomTo(period.customTo);
  }, [period.customFrom, period.customTo]);

  const handleMode = (mode: Exclude<PeriodMode, 'custom'>) => {
    const range = rangeForMode(mode);
    onChange({
      mode,
      from: range.from,
      to: range.to,
      customFrom: range.from,
      customTo: addDays(range.to, -1)
    });
  };

  const applyCustom = () => {
    if (!customFrom || !customTo || customFrom > customTo) {
      return;
    }
    onChange(periodFromCustom(customFrom, customTo));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {MODES.map(mode => (
            <button
              key={mode.id}
              type="button"
              disabled={disabled}
              onClick={() => handleMode(mode.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                period.mode === mode.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {mode.label}
            </button>
          ))}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!customFrom || !customTo || customFrom > customTo) {
                return;
              }
              onChange(periodFromCustom(customFrom, customTo));
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
              period.mode === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Range
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {extra}
          <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(shiftPeriod(period, -1))}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            title="Previous period"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-800 min-w-[160px] text-center capitalize">
            {formatPeriodLabel(period)}
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(shiftPeriod(period, 1))}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            title="Next period"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          </div>
        </div>
      </div>

      {period.mode === 'custom' && (
        <div className="mt-3 flex flex-col sm:flex-row sm:items-end gap-2">
          <label className="text-xs text-slate-600">
            From
            <input
              type="date"
              value={customFrom}
              disabled={disabled}
              onChange={e => setCustomFrom(e.target.value)}
              className="mt-1 block w-full sm:w-auto px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm"
            />
          </label>
          <label className="text-xs text-slate-600">
            To
            <input
              type="date"
              value={customTo}
              disabled={disabled}
              onChange={e => setCustomTo(e.target.value)}
              className="mt-1 block w-full sm:w-auto px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm"
            />
          </label>
          <button
            type="button"
            disabled={disabled || !customFrom || !customTo || customFrom > customTo}
            onClick={applyCustom}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
};
