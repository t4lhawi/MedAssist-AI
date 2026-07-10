import React from 'react'
import { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  unit?: string
  icon: LucideIcon
  color: string
  sub?: string
  tone?: 'neutral' | 'good' | 'warning' | 'danger'
}

const TONE: Record<NonNullable<Props['tone']>, string> = {
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
}

export default function StatCard({ title, value, unit, icon: Icon, color, sub, tone = 'neutral' }: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            {value}
            {unit && <span className="ml-1 text-sm font-semibold text-slate-500">{unit}</span>}
          </p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      {sub && (
        <span className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-xs font-medium ${TONE[tone]}`}>
          <span className="truncate">{sub}</span>
        </span>
      )}
    </div>
  )
}
