import React, { useMemo, useState } from 'react'
import { LineChart as LC, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Activity } from 'lucide-react'
import { Mesure } from '../../types'
import { useChartTheme } from './useChartTheme'

interface Props {
  mesures: Mesure[]
  title: string
  color?: string
}

const COLORS: Record<string, string> = {
  temperature: '#3B82F6',
  humidite: '#10B981',
  pression: '#8B5CF6',
  qualite_air: '#F59E0B',
}

type RangeKey = '1h' | '6h' | '24h' | 'all'
const RANGES: { key: RangeKey; label: string; ms: number }[] = [
  { key: '1h', label: '1H', ms: 60 * 60 * 1000 },
  { key: '6h', label: '6H', ms: 6 * 60 * 60 * 1000 },
  { key: '24h', label: '24H', ms: 24 * 60 * 60 * 1000 },
  { key: 'all', label: 'Tout', ms: Infinity },
]

export default function LineChart({ mesures, title, color = '#3B82F6' }: Props) {
  const [range, setRange] = useState<RangeKey>('all')
  const t = useChartTheme()

  const now = useMemo(
    () => Math.max(
      Date.now(),
      ...mesures.map(m => new Date(m.timestamp).getTime()).filter(t => !Number.isNaN(t)),
    ),
    [mesures],
  )

  const visible = useMemo(() => {
    if (range === 'all') return mesures
    const r = RANGES.find(r => r.key === range)!
    const cutoff = now - r.ms
    return mesures.filter(m => new Date(m.timestamp).getTime() >= cutoff)
  }, [mesures, range, now])

  const data = [...visible].reverse().map(m => ({
    time: format(new Date(m.timestamp), 'HH:mm', { locale: fr }),
    valeur: m.valeur,
    unite: m.unite,
  }))

  const safeColor = COLORS[title.toLowerCase().split(' ')[0]] || color

  return (
    <div
      className="overflow-hidden rounded-3xl border"
      style={{ background: t.cardBg || 'var(--bg-card)', border: `1px solid ${t.cardBorder || 'var(--border-color)'}` }}
    >
      <div className="flex items-center justify-between gap-3 p-5 pb-0">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
          {data.length > 0 && (
            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {data.length} point{data.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Top-right time selector */}
        <div className="inline-flex shrink-0 rounded-full p-0.5" style={{ background: t.pillTrack || 'var(--bg-hover)' }}>
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-200 active:scale-95"
              style={
                range === r.key
                  ? {
                      background: t.pillActiveBg || 'var(--bg-card)',
                      color: t.pillActiveFg || 'var(--text-primary)',
                      boxShadow: '0 1px 2px var(--shadow-1)',
                    }
                  : { background: 'transparent', color: t.pillInactiveFg || 'var(--text-muted)' }
              }
              onMouseEnter={(e) => {
                if (range !== r.key) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
              }}
              onMouseLeave={(e) => {
                if (range !== r.key) (e.currentTarget as HTMLElement).style.color = t.pillInactiveFg || 'var(--text-muted)'
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div
          className="m-5 flex h-[220px] flex-col items-center justify-center rounded-2xl text-center"
          style={{ background: t.emptyBg || 'var(--bg-input)' }}
        >
          <Activity size={24} strokeWidth={1.5} className="mb-2" style={{ color: t.emptyIcon || 'var(--border-strong)' }} />
          <p className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {range === 'all' ? 'Aucune mesure disponible' : 'Aucune mesure sur cette période'}
          </p>
        </div>
      ) : (
        <div className="p-5 pt-3">
          <ResponsiveContainer width="100%" height={240}>
            <LC data={data} margin={{ left: -8, right: 8, top: 6, bottom: 0 }}>
              <defs>
                <linearGradient id={`fill-${safeColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={safeColor} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={safeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="0" vertical={false} stroke={t.grid || 'var(--border-color)'} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: t.tick || 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 11, fill: t.tick || 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                formatter={(v: number) => [`${v} ${data[0]?.unite || ''}`, 'Valeur']}
                contentStyle={{
                  border: `1px solid ${t.tooltipBorder || 'var(--border-color)'}`,
                  borderRadius: 14,
                  boxShadow: `0 8px 24px -8px ${t.tooltipShadow || 'var(--shadow-3)'}`,
                  fontSize: 12.5,
                  fontFamily: 'Inter, sans-serif',
                  padding: '8px 12px',
                  background: t.tooltipBg || 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                }}
                labelStyle={{ color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <Line
                type="monotone"
                dataKey="valeur"
                stroke={safeColor}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: t.cardBg || 'var(--bg-card)', fill: safeColor }}
                fill={`url(#fill-${safeColor.replace('#', '')})`}
              />
            </LC>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
