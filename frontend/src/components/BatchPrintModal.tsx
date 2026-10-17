import React, { useState } from 'react';
import { api } from '../api/client';
import { useTranslation } from '../i18n';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';

interface BatchPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBadgeIds: string[];
}

export const BatchPrintModal: React.FC<BatchPrintModalProps> = ({
  isOpen,
  onClose,
  selectedBadgeIds,
}) => {
  const { t } = useTranslation();
  const [includeCropMarks, setIncludeCropMarks] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalBadges = selectedBadgeIds.length;
  const badgesPerPage = 4;
  const totalPages = Math.ceil(totalBadges / badgesPerPage);

  const handlePrint = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.printBatchSheet({
        badge_ids: selectedBadgeIds,
        layout: 'folded',
        include_crop_marks: includeCropMarks,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || t.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{t.batchPrint.title}</h3>
              <p className="text-xs text-slate-500">{t.batchPrint.subtitle}</p>
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
          {/* Summary Box */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">{t.batchPrint.selectedBadges}</div>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">{totalBadges}</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <div className="text-xs text-slate-500 font-medium">{t.batchPrint.paperFormat}</div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">{t.batchPrint.paperFormatVal}</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <div className="text-xs text-slate-500 font-medium">{t.batchPrint.totalPages}</div>
              <div className="text-xl font-extrabold text-emerald-700 mt-0.5">{totalPages}</div>
            </div>
          </div>

          {/* Settings checkboxes */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={includeCropMarks}
                onChange={e => setIncludeCropMarks(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-800">
                  {t.batchPrint.cropMarksTitle}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t.batchPrint.cropMarksDesc}
                </p>
              </div>
            </label>

            <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-slate-800">
                  {t.batchPrint.foldedFormatTitle}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t.batchPrint.foldedFormatDesc}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
              {error}
            </div>
          )}
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/50 transition cursor-pointer"
          >
            {t.batchPrint.cancelBtn}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={loading}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <FileText className="w-4 h-4" />
                {t.batchPrint.generateBtn}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
