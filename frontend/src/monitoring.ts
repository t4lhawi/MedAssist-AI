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
  { type: 'qualite_air', title: "Qualité de l'air", unit: 'ppm', icon: Wind, color: 'bg-gradient-to-b from-emerald-400 to-emerald-500', chart: '#10B981' },
]

const FALLBACK_TYPE: MonitoringType = {
  type: 'unknown',
  title: 'Capteur',
  unit: '',
  icon: Activity,
  color: 'bg-gradient-to-b from-slate-400 to-slate-500',
  chart: '#64748B',
}

export function getMonitoringType(type?: string): MonitoringType {
  return MONITORING_TYPES.find(item => item.type === type) || FALLBACK_TYPE
}

/* ── State styling (mirrors backend sensor.state values) ───────────────────── */

export type SensorState = 'active' | 'offline' | 'not_installed' | 'warning' | 'error'

export const STATE_TONE: Record<SensorState, { dot: string; bg: string; text: string; label: string; badge: string }> = {
  active:       { dot: 'bg-emerald-500',       bg: 'bg-emerald-50',       text: 'text-emerald-600',       label: 'En ligne',       badge: 'bg-emerald-100 text-emerald-700' },
  offline:      { dot: 'bg-amber-500',         bg: 'bg-amber-50',         text: 'text-amber-600',         label: 'Hors ligne',     badge: 'bg-amber-100 text-amber-700' },
  not_installed:{ dot: 'bg-slate-300',         bg: 'bg-slate-50',         text: 'text-slate-500',         label: 'Non installé',   badge: 'bg-slate-100 text-slate-600' },
  warning:      { dot: 'bg-amber-500 animate-pulse', bg: 'bg-amber-50',    text: 'text-amber-700',         label: 'Données anciennes', badge: 'bg-amber-100 text-amber-700' },
  error:        { dot: 'bg-red-500',           bg: 'bg-red-50',           text: 'text-red-700',           label: 'Erreur',         badge: 'bg-red-100 text-red-700' },
}

export const STATE_LABEL: Record<SensorState, string> = {
  active: 'En ligne',
  offline: 'Hors ligne',
  not_installed: 'Non installé',
  warning: 'Données anciennes',
  error: 'Erreur',
}

export const STATE_BORDER: Record<SensorState, string> = {
  active: 'border-emerald-200',
  offline: 'border-amber-200',
  not_installed: 'border-slate-200 border-dashed',
  warning: 'border-amber-200',
  error: 'border-red-200',
}

export const STATE_BG: Record<SensorState, string> = {
  active: 'bg-emerald-50',
  offline: 'bg-amber-50',
  not_installed: 'bg-slate-50',
  warning: 'bg-amber-50',
  error: 'bg-red-50',
}
