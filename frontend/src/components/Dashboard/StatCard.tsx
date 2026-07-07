import React from 'react'
import { LucideIcon } from 'lucide-react'

interface Props {
  title: string; value: string | number; unit?: string;
  icon: LucideIcon; color: string; sub?: string;
}

export default function StatCard({ title, value, unit, icon: Icon, color, sub }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}{unit && <span className="text-base font-normal text-gray-500 ml-1">{unit}</span>}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}