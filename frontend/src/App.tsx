import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BadgeConstructor } from './components/BadgeConstructor';
import { EmployeeRegistry } from './components/EmployeeRegistry';
import { BatchPrintModal } from './components/BatchPrintModal';
import { ImportCsvModal } from './components/ImportCsvModal';
import { AdminModal } from './components/AdminModal';
import type { Department, Badge } from './types';
import { api } from './api/client';
import { IdCard, Users } from 'lucide-react';
import { useTranslation } from './i18n';

export const App: React.FC = () => {
  const { t, format } = useTranslation();
  const [activeTab, setActiveTab] = useState<'constructor' | 'registry'>('constructor');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [totalBadges, setTotalBadges] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [batchPrintIds, setBatchPrintIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<{
    sso_enabled: boolean;
    authenticated: boolean;
    username: string;
    full_name: string;
    machine_name: string;
    room?: string;
    is_domain_admin?: boolean;
    is_local_admin?: boolean;
    can_edit_design?: boolean;
  } | null>(null);

  // Fetch current domain user
  const loadCurrentUser = async () => {
    try {
      const user = await api.getCurrentUser();
      setCurrentUser(user);
    } catch (e) {
      console.warn('Could not load current user context', e);
    }
  };

  // Fetch departments
  const loadDepartments = async () => {
    try {
      const data = await api.getDepartments();
      setDepartments(data);
    } catch (e) {
      console.error('Failed to load departments', e);
    }
  };


  // Fetch badges
  const loadBadges = async () => {
    setLoading(true);
    try {
      const data = await api.getBadges({
        search,
        department_id: departmentId || undefined,
        page,
        limit: 10,
      });
      setBadges(data.items);
      setTotalBadges(data.total);
      setTotalPages(data.total_pages);
    } catch (e) {
      console.error('Failed to load badges', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = t.header.appTitle || 'Генератор бейджей';
  }, [t.header.appTitle]);

  useEffect(() => {
    loadDepartments();
    loadCurrentUser();
  }, []);

  useEffect(() => {
    loadBadges();
  }, [page, search, departmentId]);

  const handleOpenBatchPrint = (ids?: string[]) => {
    if (ids && ids.length > 0) {
      setBatchPrintIds(ids);
    } else {
      setBatchPrintIds(badges.map(b => b.id));
    }
    setIsBatchPrintOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header
        onOpenImport={() => setIsImportOpen(true)}
        onOpenBatchPrint={() => handleOpenBatchPrint()}
        selectedCount={batchPrintIds.length}
        currentUser={currentUser}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />


      {/* Main Content Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 mb-8 border-b border-slate-200 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('constructor')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'constructor'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <IdCard className="w-4 h-4" />
            <span>{t.tabs.constructor}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('registry')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'registry'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t.tabs.registry}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                activeTab === 'registry' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {totalBadges}
            </span>
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'constructor' ? (
          <div className="space-y-12">
            <BadgeConstructor
              departments={departments}
              canEditDesign={currentUser?.can_edit_design}
              onOpenAdmin={() => setIsAdminOpen(true)}
              onBadgeCreated={() => {
                loadBadges();
                loadDepartments();
              }}
            />

            {/* Quick overview of latest badges */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">
                  {t.registry.latestGenerated}
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('registry')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  {format(t.registry.goToFullRegistry, { count: totalBadges })}
                </button>
              </div>

              <EmployeeRegistry
                badges={badges.slice(0, 5)}
                departments={departments}
                total={totalBadges}
                page={page}
                totalPages={totalPages}
                loading={loading}
                onPageChange={setPage}
                onSearchChange={setSearch}
                onDepartmentChange={setDepartmentId}
                onRefresh={loadBadges}
                onOpenBatchPrint={handleOpenBatchPrint}
              />
            </div>
          </div>
        ) : (
          <EmployeeRegistry
            badges={badges}
            departments={departments}
            total={totalBadges}
            page={page}
            totalPages={totalPages}
            loading={loading}
            onPageChange={setPage}
            onSearchChange={setSearch}
            onDepartmentChange={setDepartmentId}
            onRefresh={loadBadges}
            onOpenBatchPrint={handleOpenBatchPrint}
          />
        )}
      </main>

      {/* Modals */}
      <BatchPrintModal
        isOpen={isBatchPrintOpen}
        onClose={() => setIsBatchPrintOpen(false)}
        selectedBadgeIds={batchPrintIds}
      />

      <ImportCsvModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={() => {
          loadBadges();
          loadDepartments();
        }}
      />

      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => {
          setIsAdminOpen(false);
          loadCurrentUser();
        }}
        onSettingsUpdated={loadCurrentUser}
      />


      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            {t.footer.hospitals}
          </div>
          <div className="flex items-center gap-4">
            <span>{t.footer.vectorDpi}</span>
            <span>{t.footer.standardSize}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
