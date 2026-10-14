import React from 'react';

interface CheckOptionProps {
  checked: boolean;
  onToggle: () => void;
  label: React.ReactNode;
  hint?: string;
  title?: string;
}

/** The whole row is clickable — a bare checkbox is too small a target. */
export const CheckOption: React.FC<CheckOptionProps> = ({ checked, onToggle, label, hint, title }) => (
  <label
    title={title}
    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer select-none transition-colors ${
      checked ? 'bg-blue-50 text-blue-900 font-medium' : 'text-slate-700 hover:bg-slate-100'
    }`}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onToggle}
      className="h-[18px] w-[18px] shrink-0 accent-blue-600 cursor-pointer"
    />
    <span className="min-w-0 flex-1 truncate text-[13px] leading-5">{label}</span>
    {hint ? <span className="shrink-0 text-[11px] text-slate-400">{hint}</span> : null}
  </label>
);

export const CheckOptionList: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => <div className={`max-h-56 overflow-y-auto space-y-0.5 ${className}`}>{children}</div>;
