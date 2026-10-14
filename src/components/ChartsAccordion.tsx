import React, { useState } from 'react';
import { BarChart2, ChevronDown } from 'lucide-react';

interface ChartsAccordionProps {
  subtitle: string;
  children: React.ReactNode;
}

export const ChartsAccordion: React.FC<ChartsAccordionProps> = ({ subtitle, children }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-8">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 mb-4 text-left cursor-pointer group"
      >
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <BarChart2 className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900">Charts &amp; Visual Analytics</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 shrink-0 transition-transform group-hover:text-slate-600 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div className={open ? '' : 'hidden'}>{children}</div>
    </div>
  );
};
