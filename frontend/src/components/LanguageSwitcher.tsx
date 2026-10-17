import React from 'react';
import { useTranslation } from '../i18n';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { lang, setLang } = useTranslation();

  return (
    <div className={`flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 ${className}`}>
      <div className="pl-1.5 pr-1 text-slate-400">
        <Globe className="w-3.5 h-3.5" />
      </div>
      <button
        type="button"
        onClick={() => setLang('kk')}
        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
          lang === 'kk'
            ? 'bg-emerald-700 text-white shadow-2xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title="Қазақ тіліне ауыстыру"
      >
        ҚАЗ
      </button>
      <button
        type="button"
        onClick={() => setLang('ru')}
        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
          lang === 'ru'
            ? 'bg-emerald-700 text-white shadow-2xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title="Переключить на русский язык"
      >
        РУС
      </button>
    </div>
  );
};
