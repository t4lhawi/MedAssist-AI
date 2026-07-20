import React, { useMemo, useState } from 'react'
import { LineChart as LC, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Activity } from 'lucide-react'
import { Mesure } from '../../types'

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
      style={{ background: '#FFFFFF', border: '1px solid #ECECEC' }}
    >
      <div className="flex items-center justify-between gap-3 p-5 pb-0">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: '#111111' }}>
            {title}
          </h3>
          {data.length > 0 && (
            <p className="mt-0.5 text-[11px]" style={{ color: '#9CA3AF' }}>
              {data.length} point{data.length > 1 ? 's' : ''}
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

      {data.length === 0 ? (
        <div
          className="flex h-[220px] flex-col items-center justify-center rounded-2xl text-center"
          style={{ background: '#F9FAFB' }}
        >
          <Activity size={24} strokeWidth={1.5} className="mb-2" style={{ color: '#D1D5DB' }} />
          <p className="text-[13px] font-medium" style={{ color: '#9CA3AF' }}>
            {range === 'all' ? 'Aucune mesure disponible' : 'Aucune mesure sur cette période'}
          </p>
        </div>
      ) : (
        <div className="p-5 pt-3">
          <ResponsiveContainer width="100%" height={240}>
            <LC data={data} margin={{ left: -8, right: 8, top: 6, bottom: 0 }}>
              <defs>
                <linearGradient id={`fill-${safeColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={safeColor} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={safeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="0" vertical={false} stroke="#F3F4F6" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Inter, sans-serif' }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                formatter={(v: number) => [`${v} ${data[0]?.unite || ''}`, 'Valeur']}
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
              <Line
                type="monotone"
                dataKey="valeur"
                stroke={safeColor}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#FFFFFF', fill: safeColor }}
                fill={`url(#fill-${safeColor.replace('#', '')})`}
              />
            </LC>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
