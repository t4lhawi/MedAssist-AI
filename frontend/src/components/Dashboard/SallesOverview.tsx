import React, { useMemo, useState } from 'react'
import { Search, WifiOff, ArrowRight, Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SalleStatus, SensorStatus } from '../../types'
import { MONITORING_TYPES, getMonitoringType, type SensorState } from '../../monitoring'
import { formatRelativeTime } from '../../utils/time'

interface Props {
  salles: SalleStatus[]
}

/* One compact per-sensor chip: colored icon + value + faint unit. Greyed when
   the sensor is offline / uninstalled (stale value, no color signal). */
function SensorChip({ sensor, typeKey }: { sensor: SensorStatus | undefined; typeKey: string }) {
  const mt = getMonitoringType(typeKey)
  const state = (sensor?.state as SensorState | undefined) ?? 'not_installed'
  const fresh = state === 'active' && sensor?.last_value != null
  const hasVal = state !== 'not_installed' && sensor?.last_value != null
  const Icon = mt.icon
  const val = sensor?.last_value
  const unit = sensor?.last_unite ?? mt.unit
  const txt = hasVal ? Number(val!).toFixed(typeKey === 'pression' ? 0 : 1) : '—'
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap"
      title={`${mt.title}${fresh ? '' : hasVal ? ' · données anciennes' : ' · non installé'}`}
    >
      <Icon size={12} strokeWidth={2.2} style={{ color: fresh ? mt.chart : '#D1D5DB' }} />
      <span
        className="text-[12px] font-semibold tabular-nums"
        style={{ color: fresh ? '#111111' : hasVal ? '#9CA3AF' : '#D1D5DB' }}
      >
        {txt}
      </span>
      {hasVal && (
        <span className="text-[10px] font-medium" style={{ color: '#9CA3AF' }}>
          {unit}
        </span>
      )}
    </span>
  )
}

function SalleRow({ salle, index }: { salle: SalleStatus; index: number }) {
  const dotColor = !salle.actif ? '#D1D5DB' : salle.online ? '#10B981' : '#F59E0B'
  const dotTitle = !salle.actif ? 'Salle désactivée' : salle.online ? 'En ligne' : 'Hors ligne'

  // Last-seen label by status.
  let lastSeen: React.ReactNode
  if (!salle.actif) {
    lastSeen = <span className="text-[11px] font-medium text-[#9CA3AF]">Désactivée</span>
  } else if (salle.online && salle.derniere_mesure_le) {
    lastSeen = <span className="text-[11px] text-[#9CA3AF] tabular-nums">{formatRelativeTime(salle.derniere_mesure_le)}</span>
  } else if (!salle.online) {
    lastSeen = (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
        <WifiOff size={11} strokeWidth={2.2} />
        Hors ligne
      </span>
    )
  } else {
    lastSeen = <span className="text-[11px] text-[#9CA3AF]">—</span>
  }

  return (
    <Link
      to="/admin/salles"
      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#FAFAFA]"
      style={{ animation: 'slideUp 200ms ease-out both', animationDelay: `${Math.min(index, 8) * 28}ms` }}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: dotColor, boxShadow: salle.online && salle.actif ? `0 0 0 3px ${dotColor}22` : 'none' }}
        title={dotTitle}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold tracking-tight" style={{ color: '#111111' }}>
          {salle.salle}
        </p>
        {salle.ip && (
          <p className="truncate font-mono text-[10.5px]" style={{ color: '#B4B7BD' }}>
            {salle.ip}
          </p>
        )}
      </div>

      {/* Per-sensor values — hidden on small screens to keep the row compact. */}
      <div className="hidden items-center gap-3.5 md:flex">
        {MONITORING_TYPES.map(mt => (
          <SensorChip
            key={mt.type}
            sensor={salle.sensors?.find(s => s.type === mt.type)}
            typeKey={mt.type}
          />
        ))}
      </div>

      <div className="w-24 shrink-0 text-right">{lastSeen}</div>
    </Link>
  )
}

export default function SallesOverview({ salles }: Props) {
  const [query, setQuery] = useState('')
  const [offlineOnly, setOfflineOnly] = useState(false)

  // Only registered rooms (esp32_id !== null). Unregistered sources are surfaced
  // on the admin page; the dashboard "Salles" overview is about real rooms.
  const registered = useMemo(() => salles.filter(s => s.esp32_id !== null), [salles])

  const onlineCount = registered.filter(s => s.online && s.actif).length
  const offlineCount = registered.filter(s => !s.online && s.actif).length
  const disabledCount = registered.filter(s => !s.actif).length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return registered.filter(s => {
      if (offlineOnly && (s.online || !s.actif)) return false
      if (!q) return true
      return (
        s.salle?.toLowerCase().includes(q) ||
        (s.ip ?? '').toLowerCase().includes(q)
      )
    })
  }, [registered, query, offlineOnly])

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => {
      // Offline rooms first (need attention), then online, then disabled; then alphabetical.
      const rank = (s: SalleStatus) => (!s.actif ? 2 : s.online ? 1 : 0)
      if (rank(a) !== rank(b)) return rank(a) - rank(b)
      return (a.salle || '').localeCompare(b.salle || '', 'fr')
    }),
    [filtered],
  )

  return (
    <div
      className="card overflow-hidden rounded-3xl border"
      style={{ background: '#FFFFFF', border: '1px solid #ECECEC' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ borderBottom: '1px solid #F5F5F7' }}>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl" style={{ background: '#EEF2FF' }}>
            <Building2 size={14} strokeWidth={2.2} style={{ color: '#4F46E5' }} />
          </span>
          <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: '#111111' }}>
            Salles
          </h3>
        </div>
        <p className="text-[11.5px]" style={{ color: '#9CA3AF' }}>
          <span style={{ color: '#10B981', fontWeight: 600 }}>{onlineCount}</span> en ligne
          {offlineCount > 0 && (
            <>
              {' · '}
              <span style={{ color: '#F59E0B', fontWeight: 600 }}>{offlineCount}</span> hors ligne
            </>
          )}
          {disabledCount > 0 && (
            <>
              {' · '}
              <span style={{ color: '#9CA3AF', fontWeight: 600 }}>{disabledCount}</span> désactiv.
            </>
          )}
        </p>
      </div>

      {/* Toolbar: search + offline filter */}
      {registered.length > 0 && (
        <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid #F5F5F7' }}>
          <div className="relative flex-1">
            <Search
              size={14}
              strokeWidth={2.2}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: '#9CA3AF' }}
            />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher une salle ou une IP…"
              aria-label="Rechercher une salle"
              className="w-full rounded-full border py-2 pl-9 pr-3 text-[12.5px] outline-none transition-colors"
              style={{
                background: '#F5F5F7',
                border: '1px solid transparent',
                color: '#111111',
              }}
              onFocus={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#3B82F6' }}
              onBlur={(e) => { e.currentTarget.style.background = '#F5F5F7'; e.currentTarget.style.borderColor = 'transparent' }}
            />
          </div>
          <button
            onClick={() => setOfflineOnly(v => !v)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-medium transition-all"
            style={
              offlineOnly
                ? { background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }
                : { background: '#F5F5F7', color: '#6B7280', border: '1px solid transparent' }
            }
            title="Filtrer : salles hors ligne seulement"
          >
            <WifiOff size={13} strokeWidth={2.2} />
            Hors ligne
            {offlineOnly && offlineCount > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                {offlineCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* List */}
      {registered.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: '#F5F5F7' }}>
            <Building2 size={20} strokeWidth={1.6} style={{ color: '#D1D5DB' }} />
          </div>
          <p className="text-[13px] font-semibold" style={{ color: '#6B7280' }}>
            Aucune salle enregistrée
          </p>
          <p className="mt-1 text-[12px]" style={{ color: '#9CA3AF' }}>
            Enregistrez vos ESP32 depuis l'administration.
          </p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-[13px] font-medium" style={{ color: '#9CA3AF' }}>
            {offlineOnly ? 'Aucune salle hors ligne 🎉' : 'Aucune salle ne correspond à la recherche.'}
          </p>
        </div>
      ) : (
        <div
          className="max-h-[420px] overflow-y-auto"
          style={{ borderColor: '#F5F5F7' }}
        >
          <div className="divide-y" style={{ borderColor: '#F5F5F7' }}>
            {sorted.map((s, i) => (
              <SalleRow key={s.esp32_id ?? s.salle} salle={s} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {registered.length > 0 && (
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid #F5F5F7' }}
        >
          <p className="text-[11.5px]" style={{ color: '#9CA3AF' }}>
            {registered.length} salle{registered.length > 1 ? 's' : ''} enregistrée{registered.length > 1 ? 's' : ''}
          </p>
          <Link
            to="/admin/salles"
            className="inline-flex items-center gap-1 text-[12px] font-semibold transition-colors hover:gap-1.5"
            style={{ color: '#3B82F6' }}
          >
            Gérer les salles
            <ArrowRight size={12} strokeWidth={2.4} />
          </Link>
        </div>
      )}
    </div>
  )
}
