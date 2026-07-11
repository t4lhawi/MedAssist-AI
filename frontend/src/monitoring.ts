import {
  Activity,
  Droplets,
  Gauge,
  Thermometer,
  Wind,
  type LucideIcon,
} from 'lucide-react'

export interface MonitoringType {
  type: string
  title: string
  unit: string
  icon: LucideIcon
  color: string
  chart: string
}

export const MONITORING_TYPES: MonitoringType[] = [
  { type: 'temperature', title: 'Température', unit: '°C', icon: Thermometer, color: 'bg-gradient-to-b from-red-400 to-red-500', chart: '#EF4444' },
  { type: 'humidite', title: 'Humidité', unit: '%', icon: Droplets, color: 'bg-gradient-to-b from-sky-400 to-sky-500', chart: '#0EA5E9' },
  { type: 'pression', title: 'Pression', unit: 'hPa', icon: Gauge, color: 'bg-gradient-to-b from-violet-400 to-violet-500', chart: '#8B5CF6' },
  { type: 'qualite_air', title: "Qualité de l'air", unit: 'AQI', icon: Wind, color: 'bg-gradient-to-b from-emerald-400 to-emerald-500', chart: '#10B981' },
]

const LEGACY_TYPES: Record<string, MonitoringType> = {
  air: { type: 'air', title: "Qualité de l'air", unit: 'ppm', icon: Wind, color: 'bg-gradient-to-b from-emerald-400 to-emerald-500', chart: '#10B981' },
}

const FALLBACK_TYPE: MonitoringType = {
  type: 'unknown',
  title: 'Capteur',
  unit: '',
  icon: Activity,
  color: 'bg-gradient-to-b from-slate-400 to-slate-500',
  chart: '#64748B',
}

export function getMonitoringType(type?: string): MonitoringType {
  return MONITORING_TYPES.find(item => item.type === type) || LEGACY_TYPES[type || ''] || FALLBACK_TYPE
}
