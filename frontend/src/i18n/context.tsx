import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Language, Translations } from './types';
import { ru } from './locales/ru';
import { kk } from './locales/kk';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: Translations;
  format: (template: string, params?: Record<string, string | number>) => string;
}

const dictionaries: Record<Language, Translations> = {
  ru,
  kk,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'hospital_badge_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'ru' || saved === 'kk') return saved;
    } catch (e) {
      // ignore
    }
    return 'ru';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang === 'kk' ? 'kk-KZ' : 'ru-RU';
    } catch (e) {
      // ignore
    }
  };

  const toggleLang = () => {
    setLang(lang === 'ru' ? 'kk' : 'ru');
  };

  useEffect(() => {
    document.documentElement.lang = lang === 'kk' ? 'kk-KZ' : 'ru-RU';
  }, [lang]);

  const t = dictionaries[lang];

  const format = (template: string, params?: Record<string, string | number>): string => {
    if (!params) return template;
    let res = template;
    for (const [key, value] of Object.entries(params)) {
      res = res.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
    return res;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, format }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

export const useLanguage = useTranslation;
