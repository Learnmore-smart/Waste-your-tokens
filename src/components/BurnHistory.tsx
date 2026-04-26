'use client'

import type { BurnRecord } from '@/hooks/useTokenBurner'
import { useI18n } from '@/i18n/LanguageContext'

interface BurnHistoryProps {
  history: BurnRecord[]
}

export default function BurnHistory({ history }: BurnHistoryProps) {
  const { t } = useI18n()

  if (history.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center">
        <p className="text-text-tertiary text-sm">{t('history.empty')}</p>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-text-tertiary text-xs font-medium tracking-wide uppercase">{t('history.time')}</th>
              <th className="text-left px-4 py-3 text-text-tertiary text-xs font-medium tracking-wide uppercase">{t('history.model')}</th>
              <th className="text-right px-4 py-3 text-text-tertiary text-xs font-medium tracking-wide uppercase">{t('history.prompt')}</th>
              <th className="text-right px-4 py-3 text-text-tertiary text-xs font-medium tracking-wide uppercase">{t('history.completion')}</th>
              <th className="text-right px-4 py-3 text-text-tertiary text-xs font-medium tracking-wide uppercase">{t('history.total')}</th>
              <th className="text-right px-4 py-3 text-text-tertiary text-xs font-medium tracking-wide uppercase">{t('history.cost')}</th>
            </tr>
          </thead>
          <tbody>
            {history.slice(0, 50).map((record) => (
              <tr key={record.id} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap text-xs">
                  {new Date(record.timestamp).toLocaleTimeString()}
                </td>
                <td className="px-4 py-2.5 text-foreground font-mono text-xs">
                  {record.model}
                </td>
                <td className="px-4 py-2.5 text-text-secondary text-right tabular-nums font-mono text-xs">
                  {record.promptTokens.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-text-secondary text-right tabular-nums font-mono text-xs">
                  {record.completionTokens.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-foreground text-right font-medium tabular-nums font-mono text-xs">
                  {record.totalTokens.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-accent text-right tabular-nums font-mono text-xs">
                  ${record.cost.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
