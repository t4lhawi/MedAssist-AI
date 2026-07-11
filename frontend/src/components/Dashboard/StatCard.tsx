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

export default function StatCard({ title, value, unit, icon: Icon, color, sub, tone = 'neutral' }: Props) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="truncate text-[13px] font-medium text-slate-500">{title}</p>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color} shadow-[0_2px_6px_-1px_rgba(0,0,0,0.15)] transition-transform duration-200 group-hover:scale-105`}
        >
          <Icon size={16} strokeWidth={2.2} className="text-white" />
        </div>
      </div>

      <p className="text-[24px] font-semibold leading-none tracking-[-0.02em] text-slate-900">
        {value}
        {unit && <span className="ml-1 text-[13px] font-medium text-slate-400">{unit}</span>}
      </p>

      {sub && (
        <div className={`mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${TONE[tone]}`}>
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[tone]}`} />
          <span className="truncate">{sub}</span>
        </div>
      )}
    </div>
  )
}
