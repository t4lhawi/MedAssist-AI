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
  subtitle?: string
  liveCount?: LiveCount
  actions?: ReactNode
  rightSlot?: ReactNode
  className?: string
}

const TONE_BG: Record<PageHeaderTone, string> = {
  neutral: 'bg-[#F5F5F7] text-[#6B7280]',
  good: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-600',
}
const TONE_DOT: Record<PageHeaderTone, string> = {
  neutral: 'bg-[#9CA3AF]',
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
    <div className={`flex flex-col gap-3 md:flex-row md:items-end md:justify-between ${className}`}>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#3B82F6' }}>
          {category}
        </p>
        <h2
          className="mt-0.5 text-[24px] font-semibold tracking-tight"
          style={{ color: '#111111' }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-[13px]" style={{ color: '#6B7280' }}>{subtitle}</p>
        )}
      </div>

      {(showActions || showRight || showLive) && (
        <div className="flex w-fit flex-wrap items-center gap-2 md:justify-end">
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
      )}
    </div>
  )
}