'use client'

import { useI18n, Locale } from '@/i18n/LanguageContext'
import { motion } from 'framer-motion'

export default function LanguageToggle() {
  const { locale, setLocale, t } = useI18n()

  const options: { id: Locale; label: string }[] = [
    { id: 'en', label: t('languageToggle.en') },
    { id: 'zh', label: t('languageToggle.zh') },
  ]

  return (
    <div
      className="
        relative flex items-center gap-0 p-0.5 rounded-lg
        bg-surface border border-border
        text-xs font-medium outline-none
      "
      role="radiogroup"
      aria-label={locale === 'en' ? 'Switch language' : '切换语言'}
    >
      {options.map(({ id, label }) => {
        const active = locale === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLocale(id)}
            className={`
              relative z-10 px-2.5 py-1 rounded-md cursor-pointer
              border-none bg-transparent
              transition-colors duration-200 ease-out
              ${
                active
                  ? 'text-accent font-semibold'
                  : 'text-text-tertiary hover:text-text-secondary'
              }
            `}
          >
            {active && (
              <motion.span
                layoutId="lang-toggle-pill"
                className="absolute inset-0 rounded-md bg-accent/10 border border-accent/20 pointer-events-none"
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}
            <span className="relative">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
