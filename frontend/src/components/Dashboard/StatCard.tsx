import React, { useEffect, useRef, useState } from 'react'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  unit?: string
  icon: LucideIcon
  color: string
  sub?: string
  tone?: 'neutral' | 'good' | 'warning' | 'danger'
  /** Optional mini sparkline — last N data points. */
  sparkline?: number[]
  /** Optional trend vs the previous value (positive = up). */
  trend?: number
}

const TONE: Record<NonNullable<Props['tone']>, string> = {
  neutral: 'bg-slate-100 text-slate-500',
  good: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-red-50 text-red-500',
}

const DOT: Record<NonNullable<Props['tone']>, string> = {
  neutral: 'bg-slate-400',
  good: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

/**
 * Tiny sparkline rendered with SVG <path>. We pre-compute the polyline
 * from the input array; the path is also re-fed as <linearGradient>
 * fill so each card has its own accent color matching `color`.
 */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) {
    return <div className="h-10 w-full" />
  }
  const W = 100
  const H = 28
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = W / (values.length - 1)
  const points = values
    .map((v, i) => `${(i * step).toFixed(2)},${(H - ((v - min) / range) * H).toFixed(2)}`)
    .join(' ')
  const areaPoints = `0,${H} ${points} ${W},${H}`

  // Pick a stroke color that matches the card's gradient. We extract a
  // recognizable tail by sampling `color` for known hex tokens.
  const stroke = color.match(/#[0-9A-Fa-f]{6}/)?.[0] ?? '#3b82f6'
  const gradientId = `sg-${stroke.replace('#', '')}`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-10 w-full overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/**
 * Count-up animation that smoothly transitions the displayed value
 * to a new one. Re-runs on every prop change. We parse the value as
 * a number (ignoring the unit) when possible so the animation feels
 * physical — e.g. "21.4" → "21.7" glides instead of jumping.
 */
function useCountUp(value: string | number, duration = 600) {
  const [display, setDisplay] = useState<string>(String(value))
  const fromRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const target = typeof value === 'number' ? value : parseFloat(String(value))
    if (Number.isNaN(target)) {
      setDisplay(String(value))
      return
    }
    const from = fromRef.current ?? target
    fromRef.current = target
    startRef.current = performance.now()
    const initialDisplay = String(value).match(/^-?\d*\.?\d+/)
      ? parseFloat(String(display))
      : target
    fromRef.current = Number.isFinite(initialDisplay) ? initialDisplay : from

    const tick = (now: number) => {
      const elapsed = now - startRef.current
      const t = Math.min(1, elapsed / duration)
      // ease-out cubic — settles nicely without overshoot
      const eased = 1 - Math.pow(1 - t, 3)
      const from = fromRef.current ?? 0
      const current = from + (target - from) * eased
      // Preserve the original formatting (decimals, unit, etc.)
      const fmt = String(value)
      const decimals = (fmt.match(/\.(\d+)/)?.[1] ?? '').length
      setDisplay(decimals > 0 ? current.toFixed(decimals) : current.toFixed(0))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Snap to exact source string when finished so the final value is
        // byte-identical to what the caller asked for.
        setDisplay(fmt)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
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
  color,
  sub,
  tone = 'neutral',
  sparkline,
  trend,
}: Props) {
  const animated = useCountUp(value)
  const TrendIcon =
    trend === undefined ? null : trend > 0.05 ? TrendingUp : trend < -0.05 ? TrendingDown : Minus
  const trendColor =
    trend === undefined
      ? ''
      : trend > 0.05
      ? 'text-emerald-600'
      : trend < -0.05
      ? 'text-red-500'
      : 'text-slate-400'

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      {/* Subtle gradient halo on hover, drawn behind content via absolute positioning */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-30"
        style={{ background: color.match(/#[0-9A-Fa-f]{6}/)?.[0] ?? '#3b82f6' }}
      />

      <div className="relative">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="truncate text-[13px] font-medium text-slate-500">{title}</p>
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color} shadow-[0_2px_6px_-1px_rgba(0,0,0,0.15)] transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3`}
          >
            <Icon size={16} strokeWidth={2.2} className="text-white" />
          </div>
        </div>

        <div className="flex items-end gap-1.5">
          <p className="text-[26px] font-semibold leading-none tracking-[-0.02em] text-slate-900 tabular-nums">
            {animated}
          </p>
          {unit && <span className="text-[13px] font-medium text-slate-400">{unit}</span>}
          {TrendIcon && (
            <span className={`mb-0.5 inline-flex items-center gap-0.5 text-[11px] font-semibold ${trendColor}`}>
              <TrendIcon size={11} strokeWidth={2.4} />
            </span>
          )}
        </div>

        {sub && (
          <div className={`mt-2.5 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${TONE[tone]}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[tone]}`} />
            <span className="truncate">{sub}</span>
          </div>
        )}

        {sparkline && sparkline.length >= 2 && (
          <div className="mt-3 -mb-1">
            <Sparkline values={sparkline} color={color} />
          </div>
        )}
      </div>
    </div>
  )
}
