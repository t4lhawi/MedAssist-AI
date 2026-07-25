import React, { useEffect, useRef, useState } from 'react'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  unit?: string
  icon: LucideIcon
  /** Hex accent, e.g. "#3B82F6" — drives the icon tint, sparkline, and trend color. */
  accent: string
  sub?: string
  tone?: 'neutral' | 'good' | 'warning' | 'danger'
  sparkline?: number[]
  trend?: number
}

const TONE: Record<NonNullable<Props['tone']>, string> = {
  neutral: 'bg-hover text-text-secondary',
  good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  danger: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300',
}

const DOT: Record<NonNullable<Props['tone']>, string> = {
  neutral: 'bg-text-muted',
  good: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

/** Normalize any hex (#rgb / #rrggbb) to an rgba() string. Falls back to neutral grey. */
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return `rgba(107, 114, 128, ${alpha})`
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Full-width sparkline rendered with the card's accent color. */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const W = 100
  const H = 28
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = W / (values.length - 1)
  const pts = values
    .map((v, i) => `${(i * step).toFixed(2)},${(H - ((v - min) / range) * H).toFixed(2)}`)
    .join(' ')
  const gId = `sg-${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-10 w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#${gId})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/** Smooth count-up animation matching the premium feel */
function useCountUp(value: string | number, duration = 600) {
  const [display, setDisplay] = useState<string>(String(value))
  const fromRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const target = typeof value === 'number' ? value : parseFloat(String(value))
    if (Number.isNaN(target)) { setDisplay(String(value)); return }
    const from = fromRef.current ?? target
    fromRef.current = target
    startRef.current = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = from + (target - from) * eased
      const decimals = (String(value).match(/\.(\d+)/)?.[1] ?? '').length
      setDisplay(decimals > 0 ? current.toFixed(decimals) : current.toFixed(0))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(String(value))
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      const id = rafRef.current
      if (id) cancelAnimationFrame(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  return display
}

export default function StatCard({
  title,
  value,
  unit,
  icon: Icon,
  accent,
  sub,
  tone = 'neutral',
  sparkline,
  trend,
}: Props) {
  const animated = useCountUp(value)
  const hasTrend = trend !== undefined
  const TrendIcon = !hasTrend ? null : trend > 0.05 ? TrendingUp : trend < -0.05 ? TrendingDown : Minus
  const trendTone = !hasTrend
    ? ''
    : trend > 0.05
    ? 'text-emerald-600 dark:text-emerald-400'
    : trend < -0.05
    ? 'text-red-500 dark:text-red-400'
    : 'text-text-muted'
  const hasSpark = !!sparkline && sparkline.length >= 2

  return (
    <div
      className="card-lift group relative flex flex-col overflow-hidden rounded-3xl border p-4 pl-4 pr-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
    >
      {/* Header: icon chip + title, trend on the right */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: hexToRgba(accent, 0.12) }}
          >
            <Icon size={18} strokeWidth={2.2} style={{ color: accent }} />
          </div>
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            {title}
          </p>
        </div>
        {hasTrend && TrendIcon && (
          <span className={`inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold ${trendTone}`}>
            <TrendIcon size={12} strokeWidth={2.4} />
            {Math.abs(Math.round((trend ?? 0) * 100))}%
          </span>
        )}
      </div>

      {/* Value */}
      <div className="mt-3 flex items-end gap-1.5">
        <p
          className="text-[26px] font-semibold leading-none tracking-tight tabular-nums"
          style={{ color: 'var(--text-primary)' }}
        >
          {animated}
        </p>
        {unit && (
          <span className="mb-0.5 text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {unit}
          </span>
        )}
      </div>

      {/* Sub pill */}
      {sub && (
        <div
          className={`mt-2.5 inline-flex max-w-full items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[11px] font-medium ${TONE[tone]}`}
        >
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[tone]}`} />
          <span className="truncate">{sub}</span>
        </div>
      )}

      {/* Sparkline footer */}
      {hasSpark && (
        <div className="mt-3 -mb-1 h-10 w-full">
          <Sparkline values={sparkline as number[]} color={accent} />
        </div>
      )}
    </div>
  )
}
