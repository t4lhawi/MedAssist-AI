import React from 'react'
import { Sparkles } from 'lucide-react'
import { Mesure } from '../../types'
import { MONITORING_TYPES, getMonitoringType } from '../../monitoring'

/* ─── LiveActivityFeed ────────────────────────────────────────────
   Shows the N most recent MQTT measurements across all rooms and
   sensor types. Purely presentational; the parent owns the `mesures`
   state and live socket wiring. */

function LiveActivityFeed({ mesures, max = 6 }: { mesures: Mesure[]; max?: number }) {
  const items = mesures.slice(0, max)

  if (items.length === 0) {
    return (
      <div
        className="card flex flex-col items-center justify-center rounded-3xl border p-8 text-center"
        style={{ background: '#FFFFFF', border: '1px solid #ECECEC' }}
      >
        <div
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: '#F5F5F7' }}
        >
          <Sparkles size={20} strokeWidth={1.6} style={{ color: '#D1D5DB' }} />
        </div>
        <p className="text-[13.5px] font-semibold" style={{ color: '#6B7280' }}>
          En attente de mesures
        </p>
        <p className="mt-1 text-[12px]" style={{ color: '#9CA3AF' }}>
          Les mesures MQTT apparaîtront ici.
        </p>
      </div>
    )
  }

  return (
    <div
      className="card overflow-hidden rounded-3xl border"
      style={{ background: '#FFFFFF', border: '1px solid #ECECEC' }}
    >
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: '#F5F5F7' }}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" style={{ animationDuration: '2s' }} />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <h3 className="text-[13.5px] font-semibold tracking-tight" style={{ color: '#111111' }}>
            Activité en direct
          </h3>
        </div>
        <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
          {items.length} dernière{items.length > 1 ? 's' : ''} mesure{items.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="divide-y" style={{ borderColor: '#F5F5F7' }}>
        {items.map((m, idx) => {
          const mt = (m.type && getMonitoringType(m.type)) || MONITORING_TYPES[0]
          const Icon = mt.icon
          const salle = m.salle || m.topic_salle || '—'

          return (
            <div
              key={m.id}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#FAFAFA]"
              style={{
                animation: 'slideUp 200ms ease-out both',
                animationDelay: `${idx * 25}ms`,
              }}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl text-white"
                style={{ background: mt.chart }}
              >
                <Icon size={13} strokeWidth={2.4} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium" style={{ color: '#374151' }}>
                  <span style={{ color: '#111111' }}>{mt.title}</span>
                  <span className="mx-1.5" style={{ color: '#D1D5DB' }}>·</span>
                  <span style={{ color: '#6B7280' }}>{salle}</span>
                </p>
                <p className="text-[10.5px]" style={{ color: '#9CA3AF' }}>
                  {new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-semibold leading-none tracking-tight tabular-nums" style={{ color: '#111111' }}>
                  {Number(m.valeur).toFixed(m.type === 'pression' ? 0 : 1)}
                  <span className="ml-0.5 text-[10.5px] font-medium" style={{ color: '#9CA3AF' }}>
                    {m.unite || mt.unit}
                  </span>
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default LiveActivityFeed
