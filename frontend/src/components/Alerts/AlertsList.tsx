import React, { useState } from 'react'
import { Alerte } from '../../types'
import { traiterAlerte } from '../../services/api'
import { AlertTriangle, Check, CheckCircle, ChevronDown, ChevronRight, Info, Loader2, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getMonitoringType } from '../../monitoring'
import Markdown from '../ui/Markdown'

interface Props {
  alertes: Alerte[]
  onRefresh: () => void
  variant?: 'active' | 'all' | 'processed'
  compact?: boolean
}

const STYLES: Record<string, { bg: string; dot: string; badge: string; border: string; text: string }> = {
  critique: {
    bg: 'bg-red-50',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700',
    border: 'border-l-red-500',
    text: 'text-red-700',
  },
  attention: {
    bg: 'bg-amber-50',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    border: 'border-l-amber-500',
    text: 'text-amber-700',
  },
  info: {
    bg: 'bg-blue-50',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    border: 'border-l-blue-500',
    text: 'text-blue-700',
  },
}

const ICON_COLORS: Record<string, string> = {
  critique: '#EF4444',
  attention: '#F59E0B',
  info: '#3B82F6',
}

const ICONS: Record<string, React.ElementType> = {
  critique: AlertTriangle,
  attention: AlertTriangle,
  info: Info,
}

function relativeTime(date: Date) {
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60) return "à l'instant"
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
  return `il y a ${Math.floor(diff / 86400)} j`
}

function AlertExplanation({ explication }: { explication: string | null }) {
  const [open, setOpen] = useState(false)

  if (explication === null || explication === undefined) {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: '#9CA3AF' }}>
        <Loader2 size={11} className="animate-spin" strokeWidth={2.4} />
        <span>Explication IA en cours…</span>
      </div>
    )
  }
  if (explication === '') return null

  return (
    <div className="mt-2.5 overflow-hidden rounded-2xl border" style={{ borderColor: '#BFDBFE', background: 'rgba(219, 234, 254, 0.4)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] font-semibold transition-colors"
        style={{ color: '#1D4ED8' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(191, 219, 254, 0.4)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <span className="inline-flex items-center gap-1.5">
          <Sparkles size={12} strokeWidth={2.2} />
          Pourquoi cette alerte ?
        </span>
        {open ? <ChevronDown size={13} strokeWidth={2.2} /> : <ChevronRight size={13} strokeWidth={2.2} />}
      </button>
      {open && (
        <div className="border-t px-3 py-2.5 text-[12.5px] leading-6" style={{ background: 'rgba(255,255,255,0.7)', borderColor: '#BFDBFE', color: '#374151' }}>
          <Markdown source={explication} />
        </div>
      )}
    </div>
  )
}

export default function AlertsList({ alertes, onRefresh, variant = 'all', compact = false }: Props) {
  const [processing, setProcessing] = useState<number | null>(null)

  const traiter = async (id: number) => {
    setProcessing(id)
    try {
      await traiterAlerte(id)
      onRefresh()
    } finally {
      setProcessing(null)
    }
  }

  const isEmpty = alertes.length === 0
  const emptyTitle =
    variant === 'active'
      ? 'Tout est sous contrôle'
      : variant === 'processed'
      ? 'Aucune alerte traitée'
      : 'Aucune alerte enregistrée'
  const emptySub =
    variant === 'active'
      ? "Les alertes en cours apparaîtront ici."
      : variant === 'processed'
      ? "Les alertes traitées apparaîtront ici."
      : "L'historique est vide."

  return (
    <div
      className="overflow-hidden rounded-3xl border"
      style={{ background: '#FFFFFF', border: '1px solid #ECECEC' }}
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: '#F5F5F7' }}>
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-[13.5px] font-semibold tracking-tight" style={{ color: '#111111' }}>
            Alertes
          </h3>
          {alertes.length > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
              style={{ background: '#F5F5F7', color: '#6B7280' }}
            >
              {alertes.length}
            </span>
          )}
        </div>
      </div>

      {isEmpty ? (
        <div className="px-4 py-12 text-center">
          <div
            className="relative mx-auto mb-4 h-14 w-14 items-center justify-center rounded-full"
            style={{ display: 'flex', background: '#F0FDF4' }}
          >
            <CheckCircle size={26} style={{ color: '#10B981' }} />
          </div>
          <p className="text-[14px] font-semibold tracking-tight" style={{ color: '#374151' }}>
            {emptyTitle}
          </p>
          <p className="mx-auto mt-1.5 max-w-[26ch] text-[12.5px]" style={{ color: '#9CA3AF' }}>
            {emptySub}
          </p>
        </div>
      ) : (
        <div className={(compact ? 'max-h-[20rem]' : 'max-h-[28rem]') + ' overflow-y-auto'}>
          {alertes.map((a, idx) => {
            const Icon = ICONS[a.niveau] || Info
            const s = STYLES[a.niveau] || STYLES.info
            const date = new Date(a.cree_le)

            return (
              <div
                key={a.id}
                className={`flex items-start gap-3 border-l-2 px-4 py-3.5 transition-colors hover:bg-[#FAFAFA] ${
                  processing === a.id ? 'opacity-60' : ''
                }`}
                style={{
                  borderLeftColor: s.border.includes('red') ? '#EF4444' : s.border.includes('amber') ? '#F59E0B' : '#3B82F6',
                  animation: 'slideUp 200ms ease-out both',
                  animationDelay: `${idx * 30}ms`,
                }}
              >
                {/* Icon */}
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl ${s.bg}`}>
                  <Icon size={14} strokeWidth={2.4} style={{ color: ICON_COLORS[a.niveau] || '#3B82F6' }} />
                </span>

                <div className="min-w-0 flex-1">
                  {/* Labels row */}
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.badge}`}>
                      {a.niveau}
                    </span>
                    <span className="text-[11px]" style={{ color: '#9CA3AF' }}>
                      {relativeTime(date)}
                    </span>
                  </div>

                  {/* Title / message */}
                  <p className="text-[13px] font-medium leading-relaxed" style={{ color: '#374151' }}>
                    {a.message}
                  </p>

                  <AlertExplanation explication={a.explication} />
                </div>

                {/* Action */}
                {!a.traitee && (
                  <button
                    onClick={() => traiter(a.id)}
                    disabled={processing === a.id}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                    style={{ background: '#111111' }}
                  >
                    {processing === a.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} strokeWidth={2.4} />}
                    Traiter
                  </button>
                )}
                {a.traitee && (
                  <Check size={14} className="shrink-0" style={{ color: '#10B981' }} strokeWidth={2.4} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}