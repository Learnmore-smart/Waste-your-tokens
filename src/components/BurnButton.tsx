'use client'

import { motion } from 'framer-motion'
import { useI18n } from '@/i18n/LanguageContext'

interface BurnButtonProps {
  onClick: () => void
  onStop: () => void
  disabled: boolean
  state: 'idle' | 'burning' | 'auto-burning' | 'error'
}

export default function BurnButton({ onClick, onStop, disabled, state }: BurnButtonProps) {
  const { t } = useI18n()

  const labels: Record<BurnButtonProps['state'], string> = {
    idle: t('burnButton.idle'),
    burning: t('burnButton.burning'),
    'auto-burning': t('burnButton.autoBurning'),
    error: t('burnButton.error'),
  }

  const isActive = state === 'burning' || state === 'auto-burning'

  return (
    <motion.button
      onClick={isActive ? onStop : onClick}
      disabled={disabled}
      className={`
        relative min-h-[140px] w-64 rounded-2xl border-2 font-semibold text-lg cursor-pointer
        outline-none transition-colors duration-200
        disabled:cursor-not-allowed disabled:opacity-60
        ${isActive
          ? 'bg-accent text-white border-accent hover:bg-accent-hover'
          : state === 'error'
          ? 'bg-error-light text-error border-error/20 hover:border-error/40'
          : 'bg-surface text-foreground border-border hover:border-accent hover:text-accent'
        }
      `}
      animate={
        isActive
          ? { scale: [1, 1.02, 1] }
          : state === 'error'
          ? { scale: [1.02, 1] }
          : {}
      }
      transition={
        isActive
          ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
          : state === 'error'
          ? { duration: 0.3, ease: 'easeOut' }
          : { duration: 0 }
      }
      whileHover={!disabled && !isActive ? { scale: 1.02 } : undefined}
      whileTap={!disabled && !isActive ? { scale: 0.98 } : undefined}
    >
      <motion.span
        key={state}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="relative z-10"
      >
        {labels[state]}
      </motion.span>

      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(232,85,58,0.15) 0%, transparent 70%)',
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.button>
  )
}
