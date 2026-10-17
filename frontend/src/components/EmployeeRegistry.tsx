import React, { useState } from 'react';
import type { Badge, Department } from '../types';
import { api } from '../api/client';
import { useTranslation } from '../i18n';
import {
  Search,
  Filter,
  Printer,
  Download,
  Trash2,
  FileCheck,
  CheckSquare,
  Square,
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface EmployeeRegistryProps {
  badges: Badge[];
  departments: Department[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (newPage: number) => void;
  onSearchChange: (search: string) => void;
  onDepartmentChange: (deptId: string) => void;
  onRefresh: () => void;
  onOpenBatchPrint: (selectedIds: string[]) => void;
}

export const EmployeeRegistry: React.FC<EmployeeRegistryProps> = ({
  badges,
  departments,
  total,
  page,
  totalPages,
  loading,
  onPageChange,
  onSearchChange,
  onDepartmentChange,
  onRefresh,
  onOpenBatchPrint,
}) => {
  const { t, format } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [localSearch, setLocalSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSelectAll = () => {
    if (selectedIds.length === badges.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(badges.map(b => b.id));
    }
  };

  const handleToggleOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(localSearch);
  };

  const handleDownloadSingle = async (badge: Badge) => {
    if (!badge.employee) return;
    setActionLoading(badge.id);
    try {
      const safeName = badge.employee.full_name.trim().replace(/\s+/g, '_');
      await api.downloadBadgePdf(badge.id, `badge_${safeName}.pdf`);
    } catch (e: any) {
      alert(e.message || t.common.error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (badgeId: string) => {
    if (!confirm(t.registry.confirmDelete)) return;
    setActionLoading(badgeId);
    try {
      await api.deleteBadge(badgeId);
      setSelectedIds(prev => prev.filter(id => id !== badgeId));
      onRefresh();
    } catch (e: any) {
      alert(e.message || t.common.error);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Top Controls Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{t.registry.title}</h2>
          <p className="text-xs text-slate-500">
            {format(t.registry.totalRecords, { count: total })}
          </p>
        </div>

        {/* Action Button for Batch Print */}
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => onOpenBatchPrint(selectedIds)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 animate-in fade-in cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {format(t.registry.batchPrintBtn, { count: selectedIds.length })}
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
            title={t.registry.refreshTooltip}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder={t.registry.searchPlaceholder}
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
          />
        </form>

        {/* Department Filter */}
        <div className="relative w-full sm:w-64">
          <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={selectedDept}
            onChange={e => {
              setSelectedDept(e.target.value);
              onDepartmentChange(e.target.value);
            }}
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition appearance-none cursor-pointer"
          >
            <option value="">{t.registry.allDepartments}</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4 w-12 text-center">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="p-1 text-slate-500 hover:text-emerald-700 cursor-pointer"
                >
                  {selectedIds.length > 0 && selectedIds.length === badges.length ? (
                    <CheckSquare className="w-4 h-4 text-emerald-700" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="py-3 px-4">{t.registry.colEmployee}</th>
              <th className="py-3 px-4">{t.registry.colPosition}</th>
              <th className="py-3 px-4">{t.registry.colDepartment}</th>
              <th className="py-3 px-4">{t.registry.colStatus}</th>
              <th className="py-3 px-4 text-right">{t.registry.colActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {badges.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                  {loading ? t.registry.loadingList : t.registry.emptyList}
                </td>
              </tr>
            ) : (
              badges.map(badge => {
                const isSelected = selectedIds.includes(badge.id);
                const emp = badge.employee;
                if (!emp) return null;

                return (
                  <tr
                    key={badge.id}
                    className={`hover:bg-slate-50/80 transition ${
                      isSelected ? 'bg-emerald-50/40' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleOne(badge.id)}
                        className="p-1 text-slate-500 hover:text-emerald-700 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                          {emp.full_name.charAt(0)}
                        </div>
                        <span>{emp.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {emp.position}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {emp.department ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {emp.department.name}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <FileCheck className="w-3 h-3" />
                        {t.registry.statusPdfReady}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDownloadSingle(badge)}
                          disabled={actionLoading === badge.id}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
                          title={t.registry.downloadTooltip}
                        >
                          <Download className="w-3 h-3" />
                          PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(badge.id)}
                          disabled={actionLoading === badge.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title={t.registry.deleteTooltip}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            {format(t.registry.pageInfo, { page, totalPages })}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
