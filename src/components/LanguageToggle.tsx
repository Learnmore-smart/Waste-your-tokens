'use client'

import { useI18n, Locale } from '@/i18n/LanguageContext'

export default function LanguageToggle() {
  const { locale, setLocale, t } = useI18n()

  const handleToggle = () => {
    setLocale(locale === 'en' ? 'zh' : 'en')
  }

  return (
    <button
      onClick={handleToggle}
      className="
        flex items-center gap-1.5 px-2.5 py-1 rounded-md
        bg-surface border border-border hover:border-accent
        text-xs font-medium text-text-secondary hover:text-accent
        transition-all cursor-pointer outline-none
      "
      aria-label={locale === 'en' ? 'Switch to Chinese' : '切换到英文'}
    >
      <span className={locale === 'en' ? 'text-accent font-semibold' : 'text-text-tertiary'}>
        {t('languageToggle.en')}
      </span>
      <span className="text-border-strong">/</span>
      <span className={locale === 'zh' ? 'text-accent font-semibold' : 'text-text-tertiary'}>
        {t('languageToggle.zh')}
      </span>
    </button>
  )
}
