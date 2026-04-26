'use client'

import { motion } from 'framer-motion'
import AnimatedNumber from './AnimatedNumber'

interface MetricsDashboardProps {
  totalTokens: number
  totalCalls: number
  estimatedCost: number
}

export default function MetricsDashboard({ totalTokens, totalCalls, estimatedCost }: MetricsDashboardProps) {
  const cards = [
    { label: 'Tokens Wasted', value: totalTokens, decimals: 0, prefix: '', suffix: '' },
    { label: 'API Calls', value: totalCalls, decimals: 0, prefix: '', suffix: '' },
    { label: 'Estimated Cost', value: estimatedCost, decimals: 2, prefix: '$', suffix: '' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-1"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          <span className="text-text-tertiary text-xs font-medium tracking-wide uppercase">
            {card.label}
          </span>
          <span className="text-3xl font-semibold text-foreground tabular-nums font-mono">
            <AnimatedNumber
              value={card.value}
              decimals={card.decimals}
              prefix={card.prefix}
              suffix={card.suffix}
            />
          </span>
        </motion.div>
      ))}
    </div>
  )
}
