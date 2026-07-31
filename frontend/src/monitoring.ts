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
  active:       { dot: 'bg-emerald-500',       bg: 'bg-emerald-50 dark:bg-emerald-500/15',       text: 'text-emerald-600 dark:text-emerald-300',       label: 'En ligne',       badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  offline:      { dot: 'bg-text-muted',        bg: 'bg-elevated',                              text: 'text-amber-600 dark:text-amber-300',         label: 'Hors ligne',     badge: 'bg-elevated text-text-secondary' },
  not_installed:{ dot: 'bg-slate-300 dark:bg-slate-500',         bg: 'bg-slate-50 dark:bg-slate-700/40',         text: 'text-slate-500 dark:text-slate-300',         label: 'Non installé',   badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200' },
  warning:      { dot: 'bg-text-muted animate-pulse', bg: 'bg-elevated',                          text: 'text-amber-600 dark:text-amber-300',         label: 'Données anciennes', badge: 'bg-elevated text-text-secondary' },
  error:        { dot: 'bg-red-500',           bg: 'bg-red-50 dark:bg-red-500/15',           text: 'text-red-700 dark:text-red-300',           label: 'Erreur',         badge: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' },
}

export const STATE_LABEL: Record<SensorState, string> = {
  active: 'En ligne',
  offline: 'Hors ligne',
  not_installed: 'Non installé',
  warning: 'Données anciennes',
  error: 'Erreur',
}

export const STATE_BORDER: Record<SensorState, string> = {
  active: 'border-emerald-200 dark:border-emerald-500/30',
  offline: 'border-amber-200 dark:border-amber-500/30',
  not_installed: 'border-slate-200 dark:border-slate-600 border-dashed',
  warning: 'border-amber-200 dark:border-amber-500/30',
  error: 'border-red-200 dark:border-red-500/30',
}

export const STATE_BG: Record<SensorState, string> = {
  active: 'bg-emerald-50 dark:bg-emerald-500/15',
  offline: 'bg-elevated',
  not_installed: 'bg-slate-50 dark:bg-slate-700/40',
  warning: 'bg-elevated',
  error: 'bg-red-50 dark:bg-red-500/15',
}
