import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { JiraWorklogItem } from '@/types';

const ACCEPTED_EXTENSIONS = '.xlsx,.xls,.xlsm,.xlsb,.ods,.csv,.tsv,.html,.htm,.json';

interface FileDropzoneProps {
  onFilesSelected: (files: FileList | File[]) => Promise<JiraWorklogItem[]>;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({ onFilesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setLoading(true);
    setError(null);
    setSuccessCount(null);

    try {
      const items = await onFilesSelected(files);
      setSuccessCount(items.length);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred while reading the file.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      <div className="p-4 border-b border-slate-100">
        <h3 className="font-semibold text-sm text-slate-900">Upload a time tracking file</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          The table appears once a spreadsheet is loaded
        </p>
      </div>

      <div
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        className={`m-4 border-2 border-dashed rounded-xl p-10 sm:p-16 text-center transition-all cursor-pointer relative ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
            : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/80'
        }`}
      >
        <input
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          onChange={e => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
            }
          }}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />

        <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-4">
          {loading ? (
            <Upload className="w-7 h-7 text-blue-600 animate-pulse" />
          ) : (
            <FileSpreadsheet className="w-7 h-7 text-blue-600" />
          )}
        </div>

        <p className="text-sm font-semibold text-slate-800">
          Drag and drop an Excel file here or{' '}
          <span className="text-blue-600 underline">browse your files</span>
        </p>
        <p className="text-xs text-slate-400 mt-2">
          XLSX, XLS, XLSM, XLSB, ODS, CSV, TSV, HTML and JSON from Jira / Tempo
        </p>

        {loading && (
          <div className="mt-5 text-xs font-semibold text-blue-600 animate-pulse">
            Processing and parsing the spreadsheet...
          </div>
        )}

        {successCount !== null && (
          <div className="mt-5 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Successfully loaded {successCount} entries</span>
          </div>
        )}

        {error && (
          <div className="mt-5 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs inline-flex items-center justify-center gap-2 max-w-lg">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
