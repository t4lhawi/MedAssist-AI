import React from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
 *  StatCard — compact premium KPI tile
 *
 *  - White surface, soft shadow, 20px radius
 *  - Horizontal layout (icon | content | trend)
 *  - Subtle accent color matched to the metric
 *  - Trend indicator (positive / negative / flat)
 * ───────────────────────────────────────────────────────────── */

type Tone = 'emerald' | 'amber' | 'red' | 'blue' | 'slate'

const TONE_BG: Record<Tone, string> = {
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  blue: 'bg-[#EFF4FF] text-[#3B82F6]',
  slate: 'bg-[#F5F5F7] text-[#6B7280]',
}

const TREND_TONE: Record<NonNullable<StatCardProps['trend']>, string> = {
  up: 'text-emerald-600 bg-emerald-50',
  down: 'text-red-600 bg-red-50',
  flat: 'text-[#6B7280] bg-[#F5F5F7]',
}

export interface StatCardProps {
  label: string
  value: string | number
  /** Small descriptor next to the value. */
  hint?: string
  icon: React.ReactNode
  tone?: Tone
  /** Mini trend chip rendered on the right. */
  trend?: 'up' | 'down' | 'flat'
  trendLabel?: string
  className?: string
}

export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'slate',
  trend,
  trendLabel,
  className = '',
}: StatCardProps) {
  return (
    <div
      className={`group/stat relative flex items-center gap-3 rounded-2xl border border-[#ECECEC] bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(17,17,17,0.03),0_4px_14px_-8px_rgba(17,17,17,0.06)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_1px_2px_rgba(17,17,17,0.04),0_8px_20px_-8px_rgba(17,17,17,0.10)] ${className}`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${TONE_BG[tone]}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10.5px] font-medium uppercase tracking-wide text-[#6B7280]">
          {label}
        </p>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-[18px] font-semibold leading-none tracking-[-0.01em] text-[#111111] tabular-nums">
            {value}
          </span>
          {hint && (
            <span className="truncate text-[11px] font-medium text-[#6B7280]">{hint}</span>
          )}
        </div>
      </div>
      {trend && (
        <span
          className={`hidden shrink-0 items-center gap-0.5 self-center rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:inline-flex ${TREND_TONE[trend]}`}
        >
          {trend === 'up' && <ArrowUpRight size={10} strokeWidth={2.6} />}
          {trend === 'down' && <ArrowDownRight size={10} strokeWidth={2.6} />}
          {trend === 'flat' && <Minus size={10} strokeWidth={2.6} />}
          {trendLabel}
        </span>
      )}
    </div>
  )
}
