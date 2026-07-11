import React from 'react'
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

export default function LineChart({ mesures, title, color = '#2563EB' }: Props) {
  const data = [...mesures].reverse().map(m => ({
    time: format(new Date(m.timestamp), 'HH:mm', { locale: fr }),
    valeur: m.valeur,
    unite: m.unite,
  }))

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-slate-900">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
          {data.length} points
        </span>
      </div>

      {data.length === 0 ? (
        <div className="flex h-[200px] flex-col items-center justify-center rounded-xl bg-slate-50 text-center">
          <Activity size={26} strokeWidth={1.5} className="mb-2 text-slate-300" />
          <p className="text-[13px] font-medium text-slate-400">Aucune mesure disponible</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LC data={data} margin={{ left: -12, right: 8, top: 6, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(v: number) => [`${v} ${data[0]?.unite || ''}`, 'Valeur']}
              contentStyle={{
                border: 'none',
                borderRadius: 12,
                boxShadow: '0 8px 24px -8px rgba(15, 23, 42, 0.2)',
                fontSize: 12.5,
                padding: '8px 12px',
              }}
            />
            <Line
              type="monotone"
              dataKey="valeur"
              stroke={color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              fill={`url(#fill-${title.replace(/\s+/g, '')})`}
            />
          </LC>
        </ResponsiveContainer>
      )}
    </div>
  )
}
