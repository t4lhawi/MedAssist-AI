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

export default function LineChart({ mesures, title, color = '#0F5C9E' }: Props) {
  const data = [...mesures].reverse().map(m => ({
    time: format(new Date(m.timestamp), 'HH:mm', { locale: fr }),
    valeur: m.valeur,
    unite: m.unite,
  }))

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
          {data.length} points
        </span>
      </div>

      {data.length === 0 ? (
        <div className="flex h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center text-slate-400">
          <Activity size={28} className="mb-2" />
          <p className="text-sm font-medium">Aucune mesure disponible</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LC data={data} margin={{ left: -12, right: 8, top: 6, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(v: number) => [`${v} ${data[0]?.unite || ''}`, 'Valeur']}
              contentStyle={{
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                boxShadow: '0 12px 30px -20px rgba(15, 23, 42, 0.45)',
              }}
            />
            <Line type="monotone" dataKey="valeur" stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          </LC>
        </ResponsiveContainer>
      )}
    </div>
  )
}
