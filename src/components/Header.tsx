import React from 'react';
import { LogOut, Upload, FileText } from 'lucide-react';
import { JiraWorklogItem } from '@/types';
import { secondsToFormattedTime, formatCurrency, secondsToDecimalHours } from '@/lib/timeUtils';

interface HeaderProps {
  worklogs: JiraWorklogItem[];
  hourlyRate: number;
  currency: string;
  userName?: string;
  onLogout?: () => void;
  onOpenUpload: () => void;
  onOpenPdfReport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  worklogs,
  hourlyRate,
  currency,
  userName,
  onLogout,
  onOpenUpload,
  onOpenPdfReport
}) => {
  const totalSeconds = worklogs.reduce((acc, curr) => acc + curr.time_spent_seconds, 0);
  const totalHoursDecimal = secondsToDecimalHours(totalSeconds);
  const totalCost = totalHoursDecimal * hourlyRate;
  const uniqueAuthors = new Set(worklogs.map(w => w.author)).size;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-xs sticky top-0 z-30 shrink-0">
      
      {/* Left Breadcrumb & View Title */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 shrink-0">
        <span>Analytics</span>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-900">Time Tracking Summary</span>
        <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-md border border-slate-200 ml-2">
          {worklogs.length} entries ({secondsToFormattedTime(totalSeconds)})
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {userName ? (
          <span className="hidden sm:inline text-xs font-medium text-slate-600 max-w-[180px] truncate" title={userName}>
            {userName}
          </span>
        ) : null}
        
        {/* Upload Button */}
        <button
          onClick={onOpenUpload}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          title="Upload an XLSX / CSV file"
        >
          <Upload className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Upload sheet</span>
        </button>

        {/* Export PDF Report Button */}
        <button
          onClick={onOpenPdfReport}
          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-500 transition-all flex items-center gap-2 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-blue-100" />
          <span>Export PDF</span>
        </button>

        {onLogout ? (
          <button
            onClick={onLogout}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        ) : null}

      </div>

    </header>
  );
};

