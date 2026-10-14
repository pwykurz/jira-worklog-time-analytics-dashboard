import React, { useState } from 'react';
import { Upload, X, FileSpreadsheet, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { JiraWorklogItem } from '@/types';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelected: (files: FileList | File[]) => Promise<JiraWorklogItem[]>;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onFilesSelected
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setLoading(true);
    setError(null);
    setSuccessCount(null);

    try {
      const items = await onFilesSelected(files);
      setSuccessCount(items.length);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred while reading the file.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Upload a time tracking file</h2>
            <p className="text-xs text-slate-500">
              Supported formats: XLSX, XLS, XLSM, XLSB, ODS, CSV, TSV, HTML and Jira JSON
            </p>
          </div>
        </div>

        {/* Dropzone Area */}
        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
              : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/80'
          }`}
        >
          <input
            type="file"
            accept=".xlsx,.xls,.xlsm,.xlsb,.ods,.csv,.tsv,.html,.htm,.json"
            multiple
            onChange={handleFileInput}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />

          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-3">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
          </div>

          <p className="text-sm font-semibold text-slate-800">
            Drag and drop a spreadsheet here or <span className="text-blue-600 underline">browse your files</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Columns are matched automatically (issue_key, time_spent, author, started, etc.)
          </p>

          {loading && (
            <div className="mt-4 text-xs font-semibold text-blue-600 animate-pulse">
              Processing and parsing the spreadsheet...
            </div>
          )}

          {successCount !== null && (
            <div className="mt-4 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Successfully loaded {successCount} entries!</span>
            </div>
          )}

          {error && (
            <div className="mt-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Informational tip */}
        <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Tip:</strong> Standard Jira worklog exports are supported directly, including Jira Issue Search CSV, Tempo Timesheets, HTML report exports and generic Excel files.
          </div>
        </div>

      </div>
    </div>
  );
};
