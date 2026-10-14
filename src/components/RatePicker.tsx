import React from 'react';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PLN'];

interface RatePickerProps {
  hourlyRate: number;
  currency: string;
  disabled?: boolean;
  onChange: (next: { hourlyRate: number; currency: string }) => void;
}

export const RatePicker: React.FC<RatePickerProps> = ({ hourlyRate, currency, disabled, onChange }) => {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <span className="font-semibold shrink-0">Rate</span>
      <input
        type="number"
        min={0}
        value={hourlyRate}
        disabled={disabled}
        onChange={event => onChange({ hourlyRate: Number(event.target.value) || 0, currency })}
        className="w-20 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm bg-white font-mono disabled:opacity-50"
      />
      <select
        value={currency}
        disabled={disabled}
        onChange={event => onChange({ hourlyRate, currency: event.target.value })}
        className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white font-semibold disabled:opacity-50"
      >
        {CURRENCIES.map(code => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </label>
  );
};
