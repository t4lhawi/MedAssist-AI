import React, { ReactNode } from 'react'

export type PageHeaderTone = 'neutral' | 'good' | 'warning' | 'danger'

export interface LiveCount {
  value: number | string
  label: string
  tone?: PageHeaderTone
}

interface Props {
  category: ReactNode
  title: string
  subtitle?: ReactNode
  liveCount?: LiveCount
  actions?: ReactNode
  rightSlot?: ReactNode
  className?: string
}

const TONE_BG: Record<PageHeaderTone, string> = {
  neutral: 'bg-hover text-text-secondary',
  good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300',
}
const TONE_DOT: Record<PageHeaderTone, string> = {
  neutral: 'bg-text-muted',
  good: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

export default function PageHeader({
  category,
  title,
  subtitle,
  liveCount,
  actions,
  rightSlot,
  className = '',
}: Props) {
  const showActions = actions != null
  const showRight = rightSlot != null
  const showLive = liveCount != null

  return (
    <div className={`flex flex-col gap-3 md:flex-row md:items-start md:justify-between ${className}`}>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
          {category}
        </p>
        <h2
          className="mt-0.5 text-[28px] font-semibold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
        )}
      </div>

      {(showActions || showRight || showLive) && (
        <div className="flex w-fit flex-col items-stretch gap-2 md:justify-end md:pt-[13px]">
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {showLive && (() => {
            const tone = liveCount!.tone ?? 'neutral'
            return (
              <span
                className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${TONE_BG[tone]}`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[tone]}`} />
                <span className="tabular-nums">{liveCount!.value}</span>
                <span className="truncate">{liveCount!.label}</span>
              </span>
            )
          })()}
          {showRight && rightSlot}
          {showActions && actions}
          </div>
        </div>
      )}
    </div>
  )
}
