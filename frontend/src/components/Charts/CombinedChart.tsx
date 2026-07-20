import React, { useMemo, useState } from 'react'
import {
  LineChart as LC,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Activity } from 'lucide-react'
import { Mesure } from '../../types'
import { MONITORING_TYPES } from '../../monitoring'

interface Props {
  mesures: Mesure[]
}

type RangeKey = '1h' | '6h' | '24h' | 'all'
const RANGES: { key: RangeKey; label: string; ms: number }[] = [
  { key: '1h', label: '1H', ms: 60 * 60 * 1000 },
  { key: '6h', label: '6H', ms: 6 * 60 * 60 * 1000 },
  { key: '24h', label: '24H', ms: 24 * 60 * 60 * 1000 },
  { key: 'all', label: 'Tout', ms: Infinity },
]

// One-minute buckets so measures of different types arriving at slightly
// different timestamps share a row on the X axis.
const BUCKET_MS = 60 * 1000

const KNOWN_TYPES = new Set(MONITORING_TYPES.map(t => t.type))

export default function CombinedChart({ mesures }: Props) {
  const [range, setRange] = useState<RangeKey>('all')
  const [hidden, setHidden] = useState<Record<string, boolean>>({})

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

  // Only render types that actually have data in the selected range.
  const activeTypes = useMemo(
    () => MONITORING_TYPES.filter(t => visible.some(m => m.type === t.type)),
    [visible],
  )

  // Merge every type into a single, minute-bucketed timeline. Measured values
  // arrive at independent timestamps, so this is what lets all lines share one
  // X axis. Sort chronologically first so the latest value within a minute wins.
  const data = useMemo(() => {
    const rows = new Map<number, Record<string, number | string>>()
    const chrono = [...visible].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    for (const m of chrono) {
      if (m.type == null || !KNOWN_TYPES.has(m.type as string)) continue
      const key = Math.floor(new Date(m.timestamp).getTime() / BUCKET_MS) * BUCKET_MS
      const row = rows.get(key) ?? { time: format(new Date(key), 'HH:mm', { locale: fr }) }
      row[m.type as string] = m.valeur
      rows.set(key, row)
    }
    return Array.from(rows.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, row]) => row)
  }, [visible])

  const totalPoints = visible.length
  const allHidden = activeTypes.length > 0 && activeTypes.every(t => hidden[t.type])

  const toggleType = (type?: string) => {
    if (typeof type !== 'string' || !KNOWN_TYPES.has(type)) return
    setHidden(prev => ({ ...prev, [type]: !prev[type] }))
  }

  return (
    <div
      className="card overflow-hidden rounded-3xl border"
      style={{ background: '#FFFFFF', border: '1px solid #ECECEC' }}
    >
      <div className="flex items-center justify-between gap-3 p-5 pb-0">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: '#111111' }}>
            Toutes les mesures
          </h3>
          {totalPoints > 0 && (
            <p className="mt-0.5 text-[11px]" style={{ color: '#9CA3AF' }}>
              {totalPoints} mesure{totalPoints > 1 ? 's' : ''}
              {activeTypes.length > 0 && (
                <>
                  {' · '}
                  {activeTypes.length} type{activeTypes.length > 1 ? 's' : ''}
                </>
              )}
            </p>
          )}
        </div>

        {/* Top-right time selector */}
        <div className="inline-flex shrink-0 rounded-full p-0.5" style={{ background: '#F5F5F7' }}>
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-200 active:scale-95"
              style={
                range === r.key
                  ? { background: '#FFFFFF', color: '#111111', boxShadow: '0 1px 2px rgba(17,17,17,0.08)' }
                  : { background: 'transparent', color: '#9CA3AF' }
              }
              onMouseEnter={(e) => {
                if (range !== r.key) (e.currentTarget as HTMLElement).style.color = '#6B7280'
              }}
              onMouseLeave={(e) => {
                if (range !== r.key) (e.currentTarget as HTMLElement).style.color = '#9CA3AF'
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {totalPoints === 0 ? (
        <div className="flex h-[260px] flex-col items-center justify-center px-5 text-center">
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: '#F5F5F7' }}
          >
            <Activity size={20} strokeWidth={1.6} style={{ color: '#D1D5DB' }} />
          </div>
          <p className="text-[13px] font-semibold" style={{ color: '#6B7280' }}>
            En attente de mesures
          </p>
          <p className="mt-1 text-[12px]" style={{ color: '#9CA3AF' }}>
            {range === 'all' ? 'Aucune mesure disponible' : 'Aucune mesure sur cette période'}
          </p>
        </div>
      ) : (
        <div className="p-5 pt-3">
          <ResponsiveContainer width="100%" height={280}>
            <LC data={data} margin={{ left: 2, right: 2, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="0" vertical={false} stroke="#F3F4F6" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              {activeTypes.map((t, i) => {
                const side = i % 2 === 0 ? 'left' : 'right'
                const visibleSeries = !hidden[t.type]
                return (
                  <YAxis
                    key={t.type}
                    yAxisId={t.type}
                    orientation={side}
                    hide={!visibleSeries || allHidden}
                    tick={{ fontSize: 10, fill: t.chart, fontFamily: 'Inter, sans-serif' }}
                    tickLine={false}
                    axisLine={false}
                    width={38}
                    label={{
                      value: t.unit,
                      angle: side === 'left' ? -90 : 90,
                      position: side === 'left' ? 'insideLeft' : 'insideRight',
                      style: { fill: t.chart, fontSize: 10, fontFamily: 'Inter, sans-serif' },
                      offset: 6,
                    }}
                  />
                )
              })}
              <Tooltip
                formatter={(value: number, name: string) => {
                  const unit = activeTypes.find(t => t.title === name)?.unit ?? ''
                  return [`${value}${unit ? ' ' + unit : ''}`, name]
                }}
                contentStyle={{
                  border: 'none',
                  borderRadius: 14,
                  boxShadow: '0 8px 24px -8px rgba(17, 17, 17, 0.15)',
                  fontSize: 12.5,
                  fontFamily: 'Inter, sans-serif',
                  padding: '8px 12px',
                  background: '#FFFFFF',
                }}
                labelStyle={{ color: '#6B7280', fontWeight: 500, marginBottom: 4 }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12, fontFamily: 'Inter, sans-serif', paddingTop: 6 }}
                formatter={(value: string) => {
                  const unit = activeTypes.find(t => t.title === value)?.unit ?? ''
                  return (
                    <span style={{ color: '#374151', cursor: 'pointer' }}>
                      {value}
                      {unit ? <span style={{ color: '#9CA3AF' }}> ({unit})</span> : ''}
                    </span>
                  )
                }}
                onClick={(entry: any) => toggleType(entry?.dataKey ?? entry?.value)}
              />
              {activeTypes.map(t => (
                <Line
                  key={t.type}
                  yAxisId={t.type}
                  type="monotone"
                  dataKey={t.type}
                  name={t.title}
                  stroke={t.chart}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: '#FFFFFF', fill: t.chart }}
                  connectNulls
                  hide={hidden[t.type]}
                  isAnimationActive={false}
                />
              ))}
            </LC>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
