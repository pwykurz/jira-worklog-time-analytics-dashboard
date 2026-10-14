import React, { useState } from 'react';
import { FileText, X, Download, Settings2 } from 'lucide-react';
import { JiraWorklogItem, ReportConfig } from '@/types';
import { generateClientPdfReport } from '@/lib/pdfGenerator';
import { formatCurrency, secondsToDecimalHours, secondsToFormattedTime } from '@/lib/timeUtils';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredWorklogs: JiraWorklogItem[];
  defaultHourlyRate: number;
  defaultCurrency: string;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  filteredWorklogs,
  defaultHourlyRate,
  defaultCurrency
}) => {
  const [config, setConfig] = useState<ReportConfig>({
    clientName: 'Client name',
    reportTitle: 'Time Tracking Report',
    preparedBy: 'Development Team',
    hourlyRate: defaultHourlyRate,
    currency: defaultCurrency,
    notes: 'Summary of the completed development and testing work. Please review and approve.',
    showAuthorBreakdown: true,
    showTypeBreakdown: true,
    showEpicBreakdown: true,
    showDetailedTable: true,
    themeColor: 'navy'
  });

  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  const totalSeconds = filteredWorklogs.reduce((acc, w) => acc + w.time_spent_seconds, 0);
  const totalHoursDecimal = secondsToDecimalHours(totalSeconds);
  const totalCost = totalHoursDecimal * config.hourlyRate;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateClientPdfReport(filteredWorklogs, config);
      onClose();
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Client PDF Report Generator
            </h2>
            <p className="text-xs text-slate-500">
              Customize the report template for the selected {filteredWorklogs.length} entries
            </p>
          </div>
        </div>

        {/* Realtime Summary Banner */}
        <div className="bg-slate-900 text-white p-4 rounded-xl mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Total time and billing in the report:</span>
            <div className="text-base font-bold font-mono text-blue-400 mt-0.5">
              {secondsToFormattedTime(totalSeconds)} ({totalHoursDecimal.toFixed(1)} h)
            </div>
          </div>
          <div className="sm:text-right">
            <span className="text-slate-400 block text-[11px]">Estimated final value:</span>
            <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
              {formatCurrency(totalCost, config.currency)}
            </div>
          </div>
        </div>

        {/* Form Fields Grid */}
        <div className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Client / Company Name
              </label>
              <input
                type="text"
                value={config.clientName}
                onChange={e => setConfig({ ...config, clientName: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. ACME Corp"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Report Title
              </label>
              <input
                type="text"
                value={config.reportTitle}
                onChange={e => setConfig({ ...config, reportTitle: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Time report for January 2026"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Prepared by / Contractor
              </label>
              <input
                type="text"
                value={config.preparedBy}
                onChange={e => setConfig({ ...config, preparedBy: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Hourly rate
              </label>
              <input
                type="number"
                value={config.hourlyRate}
                onChange={e => setConfig({ ...config, hourlyRate: Number(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Currency
              </label>
              <select
                value={config.currency}
                onChange={e => setConfig({ ...config, currency: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:bg-white focus:outline-none"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="PLN">PLN</option>
              </select>
            </div>
          </div>

          {/* Notes / Executive Summary */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Client Notes / Summary
            </label>
            <textarea
              rows={3}
              value={config.notes}
              onChange={e => setConfig({ ...config, notes: e.target.value })}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add your own notes or an introduction to the report..."
            />
          </div>

          {/* Table Sections Checkboxes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Sections included in the PDF report</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showAuthorBreakdown}
                  onChange={e => setConfig({ ...config, showAuthorBreakdown: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Authors / team summary table</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showTypeBreakdown}
                  onChange={e => setConfig({ ...config, showTypeBreakdown: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Bugs vs tasks breakdown (issue types)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showEpicBreakdown}
                  onChange={e => setConfig({ ...config, showEpicBreakdown: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Epics / modules summary</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showDetailedTable}
                  onChange={e => setConfig({ ...config, showDetailedTable: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Detailed list of logged work</span>
              </label>
            </div>
          </div>

        </div>

        {/* Modal Action Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleGenerate}
            disabled={generating || filteredWorklogs.length === 0}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{generating ? 'Generating PDF...' : 'Generate and download PDF report'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
