import React from 'react'
import { LineChart as LC, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Mesure } from '../../types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props { mesures: Mesure[]; title: string; color?: string; }

export default function LineChart({ mesures, title, color = '#003366' }: Props) {
  const data = [...mesures].reverse().map(m => ({
    time: format(new Date(m.timestamp), 'HH:mm', { locale: fr }),
    valeur: m.valeur,
    unite: m.unite,
  }))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LC data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => [`${v} ${data[0]?.unite || ''}`, 'Valeur']} />
          <Line type="monotone" dataKey="valeur" stroke={color} strokeWidth={2} dot={false} />
        </LC>
      </ResponsiveContainer>
    </div>
  )
}