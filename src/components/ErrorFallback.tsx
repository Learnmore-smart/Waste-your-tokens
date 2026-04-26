'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '@/i18n/LanguageContext'
import LanguageToggle from '@/components/LanguageToggle'

type ErrorFallbackProps = {
  error: Error | null
  onRetry: () => void
}

export default function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const { t, locale } = useI18n()
  const reduceMotion = useReducedMotion()
  const message = error?.message?.trim() || ''

  useEffect(() => {
    document.title = `${t('errorBoundary.title')} — ${t('app.title')}`
  }, [locale, t])

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-0 opacity-[0.55]"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(214, 48, 49, 0.08), transparent 55%), radial-gradient(ellipse 60% 40% at 20% 100%, rgba(232, 85, 58, 0.06), transparent 50%)',
        }}
      />

      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <LanguageToggle />
              <motion.div
                className="w-2 h-2 rounded-full bg-error/50"
                animate={
                  reduceMotion
                    ? {}
                    : { opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] }
                }
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
              <Link
                href="/"
                className="text-base font-semibold tracking-tight text-foreground hover:text-accent transition-colors"
              >
                {t('app.title')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 flex items-center justify-center px-6 py-16">
        <motion.div
          className="w-full max-w-lg text-center flex flex-col items-center gap-8"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative w-full">
            <p
              className="font-mono text-[clamp(3.5rem,14vw,5.5rem)] font-semibold leading-none tracking-tighter text-foreground/10 select-none"
              aria-hidden
            >
              !
            </p>
            <motion.div
              className="absolute inset-0 flex items-center justify-center px-2"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="w-full max-w-md rounded-2xl border border-border bg-surface/95 backdrop-blur-md px-8 py-7 shadow-[0_24px_80px_-32px_rgba(26,26,26,0.2)]">
                <p className="font-mono text-sm text-error font-medium tracking-widest uppercase mb-2">
                  {t('errorBoundary.badge')}
                </p>
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight text-balance">
                  {t('errorBoundary.title')}
                </h1>
                <p className="mt-3 text-sm text-text-secondary leading-relaxed text-pretty">
                  {t('errorBoundary.description')}
                </p>
                {message ? (
                  <div className="mt-5 text-left rounded-lg border border-error/15 bg-error-light/80 px-3 py-2.5">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-error/70 mb-1">
                      {t('errorBoundary.detailLabel')}
                    </p>
                    <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap break-words m-0 max-h-28 overflow-y-auto">
                      {message}
                    </pre>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto sm:justify-center">
            <button
              type="button"
              onClick={onRetry}
              className="
                inline-flex items-center justify-center
                px-6 py-3 rounded-xl border-2 border-border bg-surface
                text-sm font-semibold text-foreground
                hover:border-accent hover:text-accent
                transition-colors duration-200 cursor-pointer outline-none
                focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background
              "
            >
              {t('errorBoundary.retry')}
            </button>
            <Link
              href="/"
              className="
                inline-flex items-center justify-center
                px-6 py-3 rounded-xl border-2 border-transparent
                text-sm font-medium text-text-secondary
                hover:text-accent transition-colors outline-none
                focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl
              "
            >
              {t('errorBoundary.home')}
            </Link>
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-border/50 bg-surface/40 mt-auto relative z-10">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <p className="text-[11px] sm:text-xs text-text-tertiary text-center">
            {t('app.description')}
          </p>
        </div>
      </footer>
    </div>
  )
}
