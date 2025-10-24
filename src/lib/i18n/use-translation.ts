'use client';
import { useContext } from 'react';
import { LanguageContext, LanguageContextType } from './language-provider';
import { translations } from './translations';

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  const { language } = context;

  const t = (key: keyof (typeof translations)['en']) => {
    return translations[language][key] || key;
  };

  return { t, language, setLanguage: context.setLanguage };
};
