import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { CheckOption, CheckOptionList } from '@/components/CheckOption';
import { AggregatedIssue, filterIssuesByAuthors } from '@/lib/aggregateIssues';
import { generateScopedReportPdf } from '@/lib/reportPdf';
import { PDF_COLUMN_LABELS, PdfColumnId, ReportScope } from '@/lib/reportScope';

interface ReportPdfModalProps {
  open: boolean;
  title: string;
  subtitle: string;
  issues: AggregatedIssue[];
  scope: ReportScope;
  availableAuthors: string[];
  onClose: () => void;
}

export const ReportPdfModal: React.FC<ReportPdfModalProps> = ({
  open,
  title,
  subtitle,
  issues,
  scope,
  availableAuthors,
  onClose
}) => {
  const [authors, setAuthors] = useState<string[]>(scope.authors);
  const [columns, setColumns] = useState<PdfColumnId[]>(scope.columns);
  const [sections, setSections] = useState(scope.sections);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setAuthors(scope.authors);
      setColumns(scope.columns);
      setSections(scope.sections);
    }
  }, [open, scope.authors, scope.columns, scope.sections]);

  if (!open) {
    return null;
  }

  const exportIssues = filterIssuesByAuthors(issues, authors);

  const toggleAuthor = (author: string) => {
    setAuthors(current =>
      current.includes(author) ? current.filter(item => item !== author) : [...current, author]
    );
  };

  const toggleColumn = (column: PdfColumnId) => {
    setColumns(current =>
      current.includes(column) ? current.filter(item => item !== column) : [...current, column]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">PDF export</h2>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <p className="font-semibold text-slate-700 mb-2">People in the PDF</p>
            <CheckOptionList>
              <CheckOption checked={authors.length === 0} onToggle={() => setAuthors([])} label="Everyone" />
              {availableAuthors.map(author => (
                <CheckOption
                  key={author}
                  checked={authors.includes(author)}
                  onToggle={() => toggleAuthor(author)}
                  label={author}
                  title={author}
                />
              ))}
            </CheckOptionList>
          </div>

          <div>
            <p className="font-semibold text-slate-700 mb-2">Sections</p>
            <div className="space-y-0.5">
              {([
                ['kpi', 'KPI'],
                ['table', 'Issue table'],
                ['authors', 'Author breakdown'],
                ['overhead', 'QA / PO overhead'],
                ['summary', 'Final summary']
              ] as const).map(([key, label]) => (
                <CheckOption
                  key={key}
                  checked={sections[key]}
                  onToggle={() => setSections({ ...sections, [key]: !sections[key] })}
                  label={label}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="font-semibold text-slate-700 mb-2">Table columns</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
              {(Object.keys(PDF_COLUMN_LABELS) as PdfColumnId[]).map(column => (
                <CheckOption
                  key={column}
                  checked={columns.includes(column)}
                  onToggle={() => toggleColumn(column)}
                  label={PDF_COLUMN_LABELS[column]}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            disabled={busy || exportIssues.length === 0}
            onClick={async () => {
              setBusy(true);
              try {
                await generateScopedReportPdf({
                  title,
                  subtitle,
                  issues: exportIssues,
                  columns,
                  sections,
                  qaPercent: scope.qaPercent,
                  poPercent: scope.poPercent
                });
                onClose();
              } finally {
                setBusy(false);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {busy ? 'Generating…' : `Download PDF (${exportIssues.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};
