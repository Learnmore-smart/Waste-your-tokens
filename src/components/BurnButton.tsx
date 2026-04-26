'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '@/i18n/LanguageContext'
import FireEffect from './FireEffect'

interface BurnButtonProps {
  onClick: () => void
  onStop: () => void
  disabled: boolean
  state: 'idle' | 'burning' | 'error'
}

export default function BurnButton({ onClick, onStop, disabled, state }: BurnButtonProps) {
  const { t } = useI18n()
  const shouldReduce = useReducedMotion()

  const labels: Record<BurnButtonProps['state'], string> = {
    idle: t('burnButton.idle'),
    burning: t('burnButton.burning'),
    error: t('burnButton.error'),
  }

  const isActive = state === 'burning'

  return (
    <div className="relative inline-block pt-1 pb-2 px-1">
      {isActive && !shouldReduce && (
        <motion.div
          className="pointer-events-none absolute -inset-3 rounded-[1.6rem] -z-10"
          aria-hidden
          initial={false}
          animate={{
            opacity: [0.35, 0.7, 0.45, 0.75, 0.4],
            scale: [1, 1.04, 0.99, 1.03, 1],
          }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background:
              'radial-gradient(ellipse 100% 70% at 50% 100%, rgba(255,80,20,0.5), rgba(200,30,0,0.2) 45%, transparent 70%)',
            filter: 'blur(14px)',
          }}
        />
      )}

      {isActive && !shouldReduce && (
        <motion.div
          className="pointer-events-none absolute -inset-1 rounded-[1.3rem] -z-10"
          aria-hidden
          animate={{ opacity: [0.25, 0.55, 0.3] }}
          transition={{ duration: 0.45, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            boxShadow: `
              0 0 0 1px rgba(255,200,100,0.4),
              0 0 32px 6px rgba(255,100,30,0.45),
              0 0 64px 12px rgba(255,50,0,0.2)
            `,
          }}
        />
      )}

      <motion.button
        type="button"
        onClick={isActive ? onStop : onClick}
        disabled={disabled}
        className={`
          relative min-h-[160px] w-[18rem] rounded-2xl border-2 font-semibold text-lg cursor-pointer
          outline-none transition-colors duration-200
          ${isActive ? 'overflow-visible' : 'overflow-hidden'}
          disabled:cursor-not-allowed disabled:opacity-60
          ${
            isActive
              ? 'bg-accent text-white border-amber-200/80 shadow-[0_0_40px_rgba(255,120,40,0.45),0_0_80px_rgba(255,60,0,0.2),inset_0_-12px_24px_rgba(120,0,0,0.35)]'
              : state === 'error'
              ? 'bg-error-light text-error border-error/20 hover:border-error/40'
              : 'bg-surface text-foreground border-border hover:border-accent hover:text-accent'
          }
        `}
        animate={
          shouldReduce
            ? { scale: 1 }
            : isActive
            ? { scale: [1, 1.035, 0.99, 1.03, 1] }
            : state === 'error'
            ? { scale: [1.02, 1] }
            : { scale: 1 }
        }
        transition={
          shouldReduce
            ? { duration: 0 }
            : isActive
            ? { duration: 1.05, repeat: Infinity, ease: 'easeInOut' }
            : state === 'error'
            ? { duration: 0.3, ease: 'easeOut' }
            : { duration: 0 }
        }
        whileHover={!disabled && !isActive ? { scale: 1.03 } : undefined}
        whileTap={!disabled && !isActive ? { scale: 0.97 } : undefined}
      >
        {isActive && <FireEffect />}

        {isActive && !shouldReduce && (
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-2xl mix-blend-screen opacity-60"
            style={{
              background:
                'conic-gradient(from 0deg, rgba(255,240,200,0.5), rgba(255,100,30,0.5), rgba(200,30,200,0.2), rgba(100,200,255,0.2), rgba(255,220,100,0.5))',
              filter: 'blur(22px)',
            }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {isActive && !shouldReduce && (
          <motion.div
            className="absolute -inset-1 pointer-events-none rounded-2xl mix-blend-screen opacity-40"
            style={{
              background:
                'conic-gradient(from 180deg, rgba(255,200,0,0.3), rgba(255,0,100,0.2), rgba(255,200,0,0.3))',
              filter: 'blur(10px)',
            }}
            animate={{ rotate: [360, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 90% 80% at 50% 0%, rgba(255,255,255,0.18) 0%, transparent 55%)',
            }}
            animate={
              shouldReduce
                ? { opacity: 0.45 }
                : { opacity: [0.25, 0.55, 0.35, 0.5, 0.28] }
            }
            transition={
              shouldReduce
                ? { duration: 0 }
                : { duration: 0.85, repeat: Infinity, ease: 'easeInOut' }
            }
          />
        )}

        {isActive && !shouldReduce && (
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-amber-300/30"
            aria-hidden
          />
        )}

        <motion.span
          key={state}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="relative z-10 block tracking-wide"
          style={
            isActive
              ? {
                  textShadow:
                    '0 0 18px rgba(255,240,200,0.9), 0 0 36px rgba(255,120,30,0.5), 0 1px 0 rgba(0,0,0,0.2)',
                }
              : undefined
          }
        >
          {isActive && !shouldReduce ? (
            <motion.span
              className="inline-block"
              animate={{
                textShadow: [
                  '0 0 16px rgba(255,255,255,0.9), 0 0 28px rgba(255,200,100,0.6)',
                  '0 0 22px rgba(255,255,200,0.95), 0 0 44px rgba(255,80,20,0.45)',
                  '0 0 16px rgba(255,255,255,0.9), 0 0 28px rgba(255,200,100,0.6)',
                ],
                letterSpacing: ['0.02em', '0.12em', '0.02em'],
              }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
            >
              {labels[state]}
            </motion.span>
          ) : (
            labels[state]
          )}
        </motion.span>
      </motion.button>
    </div>
  )
}
