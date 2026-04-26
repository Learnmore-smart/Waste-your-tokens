'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '@/i18n/LanguageContext'
import LanguageToggle from '@/components/LanguageToggle'

export default function NotFound() {
  const { t, locale } = useI18n()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    document.title = `${t('notFound.title')} — ${t('app.title')}`
  }, [locale, t])

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Ambient glow — matches burn accent without TokenRain noise */}
      <div
        className="pointer-events-none absolute inset-0 -z-0 opacity-[0.55]"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(232, 85, 58, 0.12), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(232, 85, 58, 0.06), transparent 50%)',
        }}
      />

      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <LanguageToggle />
              <motion.div
                className="w-2 h-2 rounded-full bg-accent/40"
                animate={
                  reduceMotion
                    ? {}
                    : { opacity: [0.45, 1, 0.45], scale: [1, 1.15, 1] }
                }
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
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
          <div className="relative">
            <p
              className="font-mono text-[clamp(4.5rem,18vw,7.5rem)] font-semibold leading-none tracking-tighter text-foreground/12 select-none"
              aria-hidden
            >
              {t('notFound.code')}
            </p>
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="rounded-2xl border border-border bg-surface/95 backdrop-blur-md px-8 py-7 shadow-[0_24px_80px_-32px_rgba(26,26,26,0.2)]">
                <p className="font-mono text-sm text-accent font-medium tracking-widest uppercase mb-2">
                  {t('notFound.code')}
                </p>
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight text-balance">
                  {t('notFound.title')}
                </h1>
                <p className="mt-3 text-sm text-text-secondary leading-relaxed text-pretty max-w-sm mx-auto">
                  {t('notFound.description')}
                </p>
              </div>
            </motion.div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link
              href="/"
              className="
                inline-flex items-center justify-center w-full sm:w-auto
                px-6 py-3 rounded-xl border-2 border-border bg-surface
                text-sm font-semibold text-foreground
                hover:border-accent hover:text-accent
                transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background
              "
            >
              {t('notFound.home')}
            </Link>
          </div>

          <p className="text-xs text-text-tertiary max-w-sm text-pretty leading-relaxed">
            {t('notFound.hint')}
          </p>
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
