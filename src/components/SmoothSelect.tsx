'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export interface SmoothSelectOption {
  value: string
  label: string
}

interface SmoothSelectProps {
  value: string
  onChange: (value: string) => void
  options: SmoothSelectOption[]
  className?: string
  disabled?: boolean
  'aria-label'?: string
}

const chevron = (
  <svg
    className="w-4 h-4 text-text-tertiary shrink-0 pointer-events-none"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
)

export default function SmoothSelect({
  value,
  onChange,
  options,
  className = '',
  disabled = false,
  'aria-label': ariaLabel,
}: SmoothSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value)
  const label = selected?.label ?? value

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  const baseBtn =
    'w-full flex items-center justify-between gap-2 bg-surface border border-border rounded-lg px-4 py-2.5 text-left text-foreground text-sm outline-none transition-colors'

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`${baseBtn} cursor-pointer hover:border-border-strong focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <span className="truncate min-w-0">{label}</span>
        <span
          className={`shrink-0 transition-transform duration-200 ease-out ${open ? 'rotate-180' : 'rotate-0'}`}
        >
          {chevron}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute z-50 left-0 right-0 mt-1 py-1 rounded-lg border border-border bg-surface shadow-lg shadow-black/20 max-h-60 overflow-y-auto overscroll-contain"
            style={{ transformOrigin: 'top center' }}
          >
            {options.map((opt) => {
              const isActive = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(opt.value)
                    close()
                  }}
                  className={`
                    w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer border-none
                    ${isActive ? 'bg-accent/15 text-accent font-medium' : 'text-foreground bg-transparent hover:bg-border/40'}
                  `}
                >
                  <span className="block truncate">{opt.label}</span>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
