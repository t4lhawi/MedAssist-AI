import React from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
 *  StatCard — compact premium KPI tile
 *
 *  - Card surface, soft shadow, 16px radius
 *  - Horizontal layout (icon | content | trend)
 *  - Subtle accent color matched to the metric
 *  - Trend indicator (positive / negative / flat)
 * ───────────────────────────────────────────────────────────── */

type Tone = 'emerald' | 'amber' | 'red' | 'blue' | 'slate'

const TONE_BG: Record<Tone, string> = {
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  red: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
  slate: 'bg-hover text-text-secondary',
}

const TREND_TONE: Record<NonNullable<StatCardProps['trend']>, string> = {
  up: 'text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/15',
  down: 'text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-500/15',
  flat: 'text-text-secondary bg-hover',
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
      className={`group/stat relative flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 transition-all duration-200 ease-out hover:-translate-y-px ${className}`}
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        boxShadow: '0 1px 2px var(--shadow-1), 0 4px 14px -8px var(--shadow-1)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 1px 2px var(--shadow-1), 0 8px 20px -8px var(--shadow-2)'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 1px 2px var(--shadow-1), 0 4px 14px -8px var(--shadow-1)'
      }}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${TONE_BG[tone]}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10.5px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </p>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-[18px] font-semibold leading-none tracking-[-0.01em] tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {value}
          </span>
          {hint && (
            <span className="truncate text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{hint}</span>
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
