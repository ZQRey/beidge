import React from 'react';
import { FileSpreadsheet, ShieldCheck, Printer, Settings, User } from 'lucide-react';
import { useTranslation } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderProps {
  onOpenImport: () => void;
  onOpenBatchPrint: () => void;
  selectedCount: number;
  currentUser?: {
    sso_enabled: boolean;
    authenticated: boolean;
    username: string;
    full_name: string;
    machine_name: string;
    room?: string;
    is_domain_admin?: boolean;
    is_local_admin?: boolean;
    can_edit_design?: boolean;
  } | null;
  onOpenAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenImport,
  onOpenBatchPrint,
  selectedCount,
  currentUser,
  onOpenAdmin,
}) => {
  const { t, format } = useTranslation();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Hospital Brand & Titles */}
          <div className="flex items-center gap-3.5">
            {/* Vector Hospital Logo */}
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center p-1 shadow-2xs shrink-0">
              <svg className="w-10 h-10" viewBox="0 0 200 200" fill="none">
                <circle cx="100" cy="100" r="92" stroke="#1e5d36" strokeWidth="4" fill="#ffffff" />
                <circle cx="100" cy="100" r="84" stroke="#1e5d36" strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
                <g transform="translate(100, 92)">
                  <rect x="-8.5" y="-30" width="17" height="38" rx="4" fill="#1e5d36" />
                  <rect x="-28" y="-19.5" width="56" height="17" rx="4" fill="#1e5d36" />
                  <path d="M-22,-11 Q -3,-25 15,-11 Q -2,-7 -22,-11 Z" fill="#67b83d" />
                  <path d="M-6,-26 Q 16,-12 4,14 Q -2,-4 -6,-26 Z" fill="#84cc48" />
                </g>
                <text x="100" y="152" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontSize="18" fontWeight="900" fill="#1e5d36">
                  МБ
                </text>
              </svg>
            </div>

            <div>
              <div className="text-[13px] font-extrabold text-slate-900 leading-tight">
                {t.header.hospitalKz}
              </div>
              <div className="text-xs font-semibold text-slate-600 leading-tight">
                {t.header.hospitalRu}
              </div>
              <div className="text-[10px] font-bold text-emerald-800 flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>{t.header.serviceSubtitle}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons, User Status & Admin */}
          <div className="flex items-center gap-2.5">
            {/* User status badge */}
            {currentUser && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold">
                <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate max-w-[190px]" title={`${currentUser.full_name} (${currentUser.machine_name || 'Не определено'})`}>
                  {currentUser.sso_enabled ? (currentUser.full_name || currentUser.username || 'Доменный пользователь') : 'Гостевой режим'}
                </span>
                {currentUser.machine_name && currentUser.sso_enabled && (
                  <span className="text-[10px] text-slate-400 font-mono">({currentUser.machine_name})</span>
                )}
                {currentUser.is_domain_admin && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200" title="Администратор домена Active Directory">
                    AD Admin
                  </span>
                )}
                {currentUser.is_local_admin && !currentUser.is_domain_admin && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200" title="Локальный администратор">
                    Admin
                  </span>
                )}
              </div>
            )}

            {/* Language Switcher */}
            <LanguageSwitcher />

            <button
              type="button"
              onClick={onOpenImport}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-emerald-800 bg-slate-50 hover:bg-emerald-50/60 rounded-xl border border-slate-200 hover:border-emerald-200 transition flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>{t.header.importBtn}</span>
            </button>

            {selectedCount > 0 && (
              <button
                type="button"
                onClick={onOpenBatchPrint}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer animate-in fade-in"
              >
                <Printer className="w-4 h-4" />
                <span>{format(t.registry.batchPrintBtn, { count: selectedCount })}</span>
              </button>
            )}

            {/* Admin Settings Button */}
            <button
              type="button"
              onClick={onOpenAdmin}
              className="p-2 text-slate-500 hover:text-emerald-800 bg-slate-50 hover:bg-emerald-50/60 rounded-xl border border-slate-200 hover:border-emerald-200 transition cursor-pointer shadow-2xs"
              title="Администрирование (LDAP, GLPI, SSO)"
            >
              <Settings className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

