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

/* Mirror StatCard.tsx tone palette so a count pill reads as part of the
   same family. Keep these in sync if StatCard's TONE map changes. */
const TONE_BG: Record<PageHeaderTone, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  good: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-600',
}
const TONE_DOT: Record<PageHeaderTone, string> = {
  neutral: 'bg-slate-400',
  good: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

/**
 * PageHeader — the standard "category + title + subtitle + actions" block
 * at the top of every full-page view. Use it instead of hand-rolling the
 * same markup in each page so visual rhythm stays consistent and adding
 * a new page doesn't require re-discovering the title size.
 *
 * Layout:
 *   [ category ]                                  [ actions / rightSlot ]
 *   [ title h2 25px ]                             [ liveCount pill       ]
 *   [ subtitle 13px slate-500 ]
 *
 * Responsive: actions stack under the title below the `md` breakpoint
 * (the same `flex-col md:flex-row` pattern AdminSallesPage used).
 */
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
        <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
          {category}
        </p>
        <h2 className="mt-0.5 text-[25px] font-semibold tracking-[-0.03em] text-slate-950">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-[13px] text-slate-500">{subtitle}</p>
        )}
      </div>

      {(showActions || showRight || showLive) && (
        <div className="flex w-fit flex-wrap items-center gap-2 md:justify-end">
          {showLive && (() => {
            const tone = liveCount!.tone ?? 'neutral'
            return (
              <span
                className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${TONE_BG[tone]}`}
                title={typeof liveCount!.value === 'number' ? `${liveCount!.value} ${liveCount!.label}` : undefined}
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
