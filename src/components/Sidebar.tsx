import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Timer, CalendarClock, AlertCircle, Upload, FileText } from 'lucide-react';

interface SidebarProps {
  path: string;
  onOpenUpload: () => void;
  onOpenPdfReport: () => void;
  onFilesSelected: (files: FileList | File[]) => Promise<unknown> | void;
}

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/reports/time', label: 'Time per issue', icon: Timer },
  { to: '/reports/worklog', label: 'Worklog', icon: CalendarClock },
  { to: '/reports/missing', label: 'Missing worklogs', icon: AlertCircle }
];

export const Sidebar: React.FC<SidebarProps> = ({ path, onOpenPdfReport, onFilesSelected }) => {
  const fileRef = React.useRef<HTMLInputElement>(null);

  return (
    <aside className="w-full md:w-[240px] bg-[#0F172A] flex flex-col shrink-0 text-slate-300 border-r border-slate-800 select-none">
      <div className="p-6 mb-2">
        <div className="flex items-center gap-3 text-white">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold italic text-white shadow-md shadow-blue-500/20">
            J
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg tracking-tight leading-none text-white">JiraMetrics</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Worklog Analytics</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <div className="text-[10px] uppercase font-bold text-slate-500 px-3 py-2 tracking-widest">Navigation</div>
        {NAV.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive ? 'text-white bg-slate-800 font-medium' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 text-blue-400" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {path === '/' ? (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={async e => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
              await onFilesSelected(e.dataTransfer.files);
            }
          }}
          onClick={() => fileRef.current?.click()}
          className="p-4 m-4 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer bg-slate-900/40 hover:bg-slate-800/60 group"
        >
          <input
            type="file"
            ref={fileRef}
            onChange={async e => {
              if (e.target.files && e.target.files.length > 0) {
                await onFilesSelected(e.target.files);
              }
            }}
            accept=".xlsx,.xls,.xlsm,.xlsb,.ods,.csv,.tsv,.json,.html,.htm"
            multiple
            className="hidden"
          />
          <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white flex items-center justify-center transition-all">
            <Upload className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs text-slate-300 font-medium">Drop an XLSX / CSV file</div>
        </div>
      ) : null}

      <div className="p-4 px-6 text-slate-500 text-[11px] border-t border-slate-800">v2.0 • Reports</div>
    </aside>
  );
};
