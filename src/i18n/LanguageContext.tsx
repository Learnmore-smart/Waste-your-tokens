'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import en from '@/i18n/locales/en.json'
import zh from '@/i18n/locales/zh.json'

export type Locale = 'en' | 'zh'

type TranslationValue = string | { [key: string]: TranslationValue }
type Translations = { [key: string]: TranslationValue }

const translations: Record<Locale, Translations> = { en, zh }

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

function getNestedValue(obj: Translations, path: string): string {
  const keys = path.split('.')
  let current: TranslationValue = obj
  for (const key of keys) {
    if (typeof current === 'object' && current !== null && key in current) {
      current = current[key]
    } else {
      return path
    }
  }
  return typeof current === 'string' ? current : path
}

const STORAGE_KEY = 'waste-tokens-locale'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (saved && (saved === 'en' || saved === 'zh')) {
      setLocaleState(saved)
    }
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(STORAGE_KEY, newLocale)
    document.documentElement.lang = newLocale
  }, [])

  const t = useCallback((key: string): string => {
    return getNestedValue(translations[locale], key)
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
