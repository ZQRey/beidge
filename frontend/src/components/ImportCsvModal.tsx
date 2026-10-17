import React, { useState, useRef } from 'react';
import { api } from '../api/client';
import type { BatchImportResult } from '../types';
import { useTranslation } from '../i18n';
import { Upload, X, FileSpreadsheet, Download } from 'lucide-react';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError(t.import.selectFileError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.importCsv(file);
      setResult(res);
      if (res.imported_count > 0) {
        onImportComplete();
      }
    } catch (err: any) {
      setError(err.message || t.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{t.import.title}</h3>
              <p className="text-xs text-slate-500">{t.import.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Instructions and Download Template */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <div className="text-xs font-bold text-slate-800">{t.import.templateTitle}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">{t.import.templateDesc}</p>
            </div>
            <button
              type="button"
              onClick={() => api.downloadTemplate()}
              className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-50 rounded-lg border border-slate-200 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              {t.import.downloadTemplateBtn}
            </button>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50/50 hover:bg-emerald-50/20"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">
              {file ? file.name : t.import.dragDropText}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t.import.supportedFormats}
            </p>
          </div>

          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
              {error}
            </div>
          )}

          {/* Results Summary */}
          {result && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-around text-center">
                <div>
                  <div className="text-[11px] text-slate-500">{t.import.processed}</div>
                  <div className="text-base font-extrabold text-slate-900">{result.total_processed}</div>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <div className="text-[11px] text-emerald-600 font-medium">{t.import.successCreated}</div>
                  <div className="text-base font-extrabold text-emerald-700">{result.imported_count}</div>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <div className="text-[11px] text-rose-600 font-medium">{t.import.errorsCount}</div>
                  <div className="text-base font-extrabold text-rose-700">{result.error_count}</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto p-3 bg-rose-50 rounded-xl text-[11px] text-rose-800 space-y-1">
                  <div className="font-bold mb-1">{t.import.errorsListTitle}</div>
                  {result.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/50 transition cursor-pointer"
          >
            {result ? t.import.closeBtn : t.import.cancelBtn}
          </button>
          {!result && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={loading || !file}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {t.import.uploadBtn}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
