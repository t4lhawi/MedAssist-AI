import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alerte } from '../../types'
import { deleteAlerte, deleteAlertesBulk, traiterAlerte } from '../../services/api'
import { usePermissions } from '../../hooks/usePermissions'
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock,
  Cpu,
  Filter,
  Info,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getMonitoringType } from '../../monitoring'
import Markdown from '../ui/Markdown'
import Modal, { ModalBody, ModalButton, ModalFooter, ModalHeader } from '../ui/Modal'
import PageHeader from '../ui/PageHeader'

/* ─── Public component contract (UNCHANGED) ─────────────────────
 *  AlertesPage.tsx still imports `AlertsList` and passes
 *  { alertes, onRefresh, variant, compact }. Do not rename or
 *  change the Props interface.
 * ──────────────────────────────────────────────────────────────── */

interface Props {
  alertes: Alerte[]
  onRefresh: () => void
  variant?: 'active' | 'all' | 'processed'
  compact?: boolean
  // Optional: invoked when the user clicks a status pill in the toolbar
  // (Toutes / Actives / Traitées). The parent can use this to refetch the
  // right ``traitee`` slice from the backend instead of relying solely on
  // the local filter, which is what makes the "Traitées" tab actually
  // show treated alerts instead of an empty filtered-down active list.
  onStatusChange?: (status: 'all' | 'active' | 'processed') => void
}

/* ─── Severity tokens ─────────────────────────────────────────── */

const SEVERITY: Record<string, {
  label: string
  dot: string
  badge: string
  strip: string
  iconBg: string
  iconColor: string
  ring: string
  glow: string
  text: string
}> = {
  critique: {
    label: 'Critique',
    dot: '#EF4444',
    badge: 'bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30',
    strip: 'alerts-strip-critique',
    iconBg: 'bg-red-50 dark:bg-red-500/15',
    iconColor: '#EF4444',
    ring: 'ring-red-100 dark:ring-red-500/30',
    glow: 'shadow-[0_0_0_4px_rgba(239,68,68,0.08)]',
    text: 'text-red-700 dark:text-red-300',
  },
  attention: {
    label: 'Attention',
    dot: '#F59E0B',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
    strip: 'alerts-strip-attention',
    iconBg: 'bg-amber-50 dark:bg-amber-500/15',
    iconColor: '#F59E0B',
    ring: 'ring-amber-100 dark:ring-amber-500/30',
    glow: '',
    text: 'text-amber-700 dark:text-amber-300',
  },
  info: {
    label: 'Information',
    dot: '#3B82F6',
    badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30',
    strip: 'alerts-strip-info',
    iconBg: 'bg-blue-50 dark:bg-blue-500/15',
    iconColor: '#3B82F6',
    ring: 'ring-blue-100 dark:ring-blue-500/30',
    glow: '',
    text: 'text-blue-700 dark:text-blue-300',
  },
}

const SEVERITY_ICONS: Record<string, React.ElementType> = {
  critique: AlertOctagon,
  attention: AlertTriangle,
  info: Info,
}

const FALLBACK_SEVERITY = SEVERITY.info

/* ─── Helpers ─────────────────────────────────────────────────── */

function relativeTime(date: Date) {
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 5) return "à l'instant"
  if (diff < 60) return `il y a ${Math.floor(diff)} s`
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
  return `il y a ${Math.floor(diff / 86400)} j`
}

function fullDate(date: Date) {
  return format(date, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })
}

function isToday(d: Date) {
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}
function isYesterday(d: Date) {
  const y = new Date()
  y.setDate(y.getDate() - 1)
  return d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate()
}

type GroupKey = 'today' | 'yesterday' | 'thisWeek' | 'earlier'

function groupKeyFor(d: Date): GroupKey {
  if (isToday(d)) return 'today'
  if (isYesterday(d)) return 'yesterday'
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setHours(0, 0, 0, 0)
  startOfWeek.setDate(now.getDate() - now.getDay())
  if (d >= startOfWeek) return 'thisWeek'
  return 'earlier'
}

const GROUP_TITLE: Record<GroupKey, string> = {
  today: "Aujourd'hui",
  yesterday: 'Hier',
  thisWeek: 'Cette semaine',
  earlier: 'Plus tôt',
}

const GROUP_ORDER: GroupKey[] = ['today', 'yesterday', 'thisWeek', 'earlier']

/* ─── AI Analysis (kept as a self-contained block, no exports) ── */

function AIAnalysisCard({ explication }: { explication: string | null }) {
  const [open, setOpen] = useState(true)

  if (explication === null || explication === undefined) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border p-4 dark:border-blue-500/30"
        style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 25%, transparent)', background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)' }}
      >
        <div className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--color-primary)' }}>
          <Sparkles size={13} strokeWidth={2.2} />
          Analyse IA
        </div>
        <div className="mt-3 space-y-2">
          <div className="alerts-skeleton h-3 w-[88%]" />
          <div className="alerts-skeleton h-3 w-[72%]" />
          <div className="alerts-skeleton h-3 w-[60%]" />
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>
          <Loader2 size={11} className="animate-spin" strokeWidth={2.4} />
          Génération de l'explication IA…
        </div>
      </div>
    )
  }
  if (explication === '') {
    return (
      <div
        className="rounded-2xl border px-4 py-3 text-[12px]"
        style={{ borderColor: 'var(--border-color)', background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
      >
        Aucune analyse IA disponible pour cette alerte.
      </div>
    )
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border dark:border-blue-500/30"
      style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 25%, transparent)', background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)' }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-[12.5px] font-semibold transition-colors"
        style={{ color: 'var(--color-primary)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-1.5">
          <Sparkles size={13} strokeWidth={2.2} />
          Analyse IA
        </span>
        {open ? <ChevronDown size={14} strokeWidth={2.2} /> : <ChevronRight size={14} strokeWidth={2.2} />}
      </button>
      {open && (
        <div
          className="border-t px-4 py-3 text-[13px] leading-7"
          style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 25%, transparent)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
        >
          <Markdown source={explication} />
        </div>
      )}
    </div>
  )
}

/* ─── Stat card ──────────────────────────────────────────────── */

interface StatCardProps {
  label: string
  value: number
  icon: React.ElementType
  iconBg: string
  iconColor: string
  trend?: number
  tone: 'critique' | 'attention' | 'info' | 'success'
}

function StatCard({ label, value, icon: Icon, iconBg, iconColor, trend, tone }: StatCardProps) {
  const trendTone =
    tone === 'critique' ? 'text-red-600' :
    tone === 'attention' ? 'text-amber-600' :
    tone === 'info' ? 'text-blue-600' :
    'text-emerald-600'
  return (
    <div
      className="card relative overflow-hidden rounded-3xl bg-card p-5"
      style={{ border: '1px solid var(--border-color)' }}
    >
      <div className="flex items-start justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-2xl ${iconBg}`}
          style={{ color: iconColor }}
        >
          <Icon size={16} strokeWidth={2.2} />
        </span>
        {typeof trend === 'number' && trend > 0 && (
          <span className={`text-[10.5px] font-semibold ${trendTone}`}>
            +{trend} aujourd'hui
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[28px] font-semibold tracking-tight tabular-nums" style={{ color: 'var(--text-primary)' }}>
          {value}
        </span>
      </div>
      <p className="mt-0.5 text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    </div>
  )
}

/* ─── Overview row ───────────────────────────────────────────── */

function AlertStatsRow({ alertes }: { alertes: Alerte[] }) {
  const active = alertes.filter(a => !a.traitee)
  const todayMs = Date.now()
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
  const c = active.filter(a => a.niveau === 'critique').length
  const w = active.filter(a => a.niveau === 'attention').length
  const i = active.filter(a => a.niveau === 'info').length
  const processedToday = alertes.filter(a => {
    if (!a.traitee) return false
    const d = new Date(a.cree_le)
    return d >= startOfToday && (todayMs - d.getTime()) < 2 * 86400_000
  }).length
  const cToday = active.filter(a => a.niveau === 'critique' && new Date(a.cree_le) >= startOfToday).length
  const wToday = active.filter(a => a.niveau === 'attention' && new Date(a.cree_le) >= startOfToday).length
  const iToday = active.filter(a => a.niveau === 'info' && new Date(a.cree_le) >= startOfToday).length

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Alertes critiques"
        value={c}
        icon={AlertOctagon}
        iconBg="bg-red-50"
        iconColor="#EF4444"
        trend={cToday}
        tone="critique"
      />
      <StatCard
        label="Alertes d'attention"
        value={w}
        icon={AlertTriangle}
        iconBg="bg-amber-50"
        iconColor="#F59E0B"
        trend={wToday}
        tone="attention"
      />
      <StatCard
        label="Alertes d'information"
        value={i}
        icon={Info}
        iconBg="bg-blue-50"
        iconColor="#3B82F6"
        trend={iToday}
        tone="info"
      />
      <StatCard
        label="Traitées aujourd'hui"
        value={processedToday}
        icon={CheckCircle2}
        iconBg="bg-emerald-50"
        iconColor="#10B981"
        tone="success"
      />
    </div>
  )
}

/* ─── Toolbar ────────────────────────────────────────────────── */

type SeverityFilter = 'all' | 'critique' | 'attention' | 'info'
type StatusFilter = 'all' | 'active' | 'processed'

interface ToolbarState {
  q: string
  severity: SeverityFilter
  status: StatusFilter
  room: string
  sort: 'newest' | 'oldest'
  selected: Set<number>
}

const SEVERITY_PILL: Array<{ key: SeverityFilter; label: string; dot?: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'critique', label: 'Critique', dot: '#EF4444' },
  { key: 'attention', label: 'Attention', dot: '#F59E0B' },
  { key: 'info', label: 'Information', dot: '#3B82F6' },
]

const STATUS_PILL: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'Toutes' },
  { key: 'active', label: 'Actives' },
  { key: 'processed', label: 'Traitées' },
]

interface AlertToolbarProps {
  state: ToolbarState
  setState: React.Dispatch<React.SetStateAction<ToolbarState>>
  rooms: string[]
  onRefresh: () => void
  refreshing: boolean
  allFilteredIds: number[]
  onBulkAction: () => void
  // Forwarded up to the page so the status pill triggers a refetch with
  // the right `traitee` slice. Without this the local status filter
  // applies on stale data and the "Traitées" view comes back empty.
  onStatusChange?: (status: StatusFilter) => void
}

function AlertToolbar({
  state, setState, rooms, onRefresh, refreshing, allFilteredIds, onBulkAction, onStatusChange,
}: AlertToolbarProps) {
  const selectedCount = state.selected.size
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => state.selected.has(id))
  const someSelected = selectedCount > 0 && !allSelected
  // Bulk delete is admin-only. The button disappears entirely for
  // other roles rather than being disabled.
  const { permissions } = usePermissions()
  const canBulkDelete = permissions.canDeleteAlertes

  return (
    <div
      className="rounded-2xl border bg-card"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        {/* Select all */}
        <button
          type="button"
          onClick={() => {
            if (allSelected) setState(s => ({ ...s, selected: new Set() }))
            else setState(s => ({ ...s, selected: new Set(allFilteredIds) }))
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
          style={{ background: allSelected || someSelected ? 'var(--text-primary)' : 'var(--bg-hover)', color: allSelected || someSelected ? 'var(--bg-card)' : 'var(--text-secondary)' }}
          aria-label={allSelected ? 'Désélectionner tout' : 'Sélectionner tout'}
        >
          {allSelected ? <Check size={13} strokeWidth={2.6} /> : someSelected ? <span className="text-[10px] font-bold">–</span> : null}
        </button>

        {/* Search */}
        <div
          className="group/field flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-1.5 transition-all"
          style={{ background: 'var(--bg-hover)' }}
        >
          <Search size={14} strokeWidth={2.2} style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            value={state.q}
            onChange={e => setState(s => ({ ...s, q: e.target.value }))}
            placeholder="Rechercher par salle, message, capteur ou ESP32…"
            className="w-full bg-transparent text-[13px] font-medium outline-none placeholder:font-normal"
            style={{ color: 'var(--text-primary)' }}
            aria-label="Rechercher"
          />
          {state.q && (
            <button
              type="button"
              onClick={() => setState(s => ({ ...s, q: '' }))}
              className="rounded-full p-0.5 transition-colors hover:bg-black/5"
              aria-label="Effacer la recherche"
            >
              <X size={12} strokeWidth={2.4} style={{ color: 'var(--text-secondary)' }} />
            </button>
          )}
        </div>

        {/* Sort */}
        <button
          type="button"
          onClick={() => setState(s => ({ ...s, sort: s.sort === 'newest' ? 'oldest' : 'newest' }))}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium transition-colors"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          aria-label="Trier"
        >
          {state.sort === 'newest' ? <ArrowDownAZ size={13} strokeWidth={2.2} /> : <ArrowUpAZ size={13} strokeWidth={2.2} />}
          {state.sort === 'newest' ? 'Plus récent' : 'Plus ancien'}
        </button>

        {/* Room filter — custom popover so the options menu can match
            the alerts UI. The native <select> menu is rendered by the
            OS and can't be themed; the trigger pill above is kept as
            the only visual piece (Filter icon + chip) so the rest of
            the toolbar stays intact. */}
        {rooms.length > 0 && (
          <RoomFilter
            rooms={rooms}
            value={state.room}
            onChange={(v) => setState(s => ({ ...s, room: v }))}
          />
        )}

        {/* Refresh */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-60"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
          aria-label="Rafraîchir"
        >
          <RefreshCw size={12} strokeWidth={2.2} className={refreshing ? 'animate-spin' : ''} />
          Actualiser
        </button>

        {/* Bulk — admin only (delete). Hidden otherwise. */}
        {canBulkDelete && (
          <button
            type="button"
            onClick={onBulkAction}
            disabled={selectedCount === 0}
            className="relative inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed"
            style={{
              background: selectedCount > 0 ? 'var(--text-primary)' : 'var(--bg-hover)',
              color: selectedCount > 0 ? 'var(--bg-card)' : 'var(--text-secondary)',
            }}
            title="Bientôt disponible"
            aria-label="Actions en masse"
          >
            <MoreHorizontal size={13} strokeWidth={2.2} />
            Actions
            {selectedCount > 0 && (
              <span
                className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                style={{ background: 'color-mix(in srgb, var(--bg-card) 25%, transparent)' }}
              >
                {selectedCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Secondary filter row */}
      <div
        className="flex flex-wrap items-center gap-3 border-t px-3 py-2"
        style={{ borderColor: 'var(--bg-hover)' }}
      >
        <div className="inline-flex items-center gap-1">
          <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Sévérité</span>
          <div
            className="inline-flex rounded-xl p-0.5"
            style={{ background: 'var(--bg-hover)' }}
          >
            {SEVERITY_PILL.map(p => {
              const active = state.severity === p.key
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setState(s => ({ ...s, severity: p.key }))}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-all"
                  style={active ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 1px 3px -1px var(--shadow-1)' } : { color: 'var(--text-secondary)' }}
                >
                  {p.dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.dot }} />}
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        <span className="alerts-chip-dot" />

        <div className="inline-flex items-center gap-1">
          <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Statut</span>
          <div
            className="inline-flex rounded-xl p-0.5"
            style={{ background: 'var(--bg-hover)' }}
          >
            {STATUS_PILL.map(p => {
              const active = state.status === p.key
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setState(s => ({ ...s, status: p.key }))
                    onStatusChange?.(p.key)
                  }}
                  className="rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-all"
                  style={active ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 1px 3px -1px var(--shadow-1)' } : { color: 'var(--text-secondary)' }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Room filter popover ────────────────────────────────────── */

/* Custom popover so the dropdown menu can match the alerts UI. The
   trigger pill reuses the exact same visual treatment as the other
   toolbar chips (gray pill, Filter icon, plain label) — only the
   popped-over list is restyled. */

function RoomFilter({ rooms, value, onChange }: {
  rooms: string[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const items: Array<{ value: string; label: string }> = [
    { value: '', label: 'Toutes les salles' },
    ...rooms.map(r => ({ value: r, label: r })),
  ]
  const current = items.find(i => i.value === value) ?? items[0]

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12px] font-medium transition-colors"
        style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
        aria-label="Filtrer par salle"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Filter size={12} strokeWidth={2.2} />
        <span className="max-w-[160px] truncate">{current.label}</span>
        <ChevronDown
          size={12}
          strokeWidth={2.2}
          className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-56 origin-top overflow-hidden rounded-2xl border bg-elevated shadow-[0_12px_36px_-12px_rgba(15,23,42,0.18)]"
          style={{
            borderColor: 'var(--border-color)',
            animation: 'alertsRoomMenuIn 140ms cubic-bezier(0.25, 0.1, 0.25, 1) both',
          }}
          role="listbox"
        >
          <div className="px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Salle
          </div>
          <div className="max-h-64 overflow-y-auto pb-1.5">
            {items.map((it) => {
              const isSelected = it.value === value
              return (
                <button
                  key={it.value || '__all__'}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(it.value)
                    setOpen(false)
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12.5px] font-medium transition-colors"
                  style={{
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: isSelected ? 'var(--bg-hover)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                >
                  <span className="truncate">{it.label}</span>
                  {isSelected && <Check size={12} strokeWidth={2.6} style={{ color: 'var(--text-primary)' }} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes alertsRoomMenuIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  )
}

/* ─── Incident card ──────────────────────────────────────────── */

interface AlertIncidentCardProps {
  alerte: Alerte
  selected: boolean
  onToggleSelect: (id: number) => void
  onOpen: (a: Alerte) => void
  onTreat: (id: number) => void
  onDelete: (id: number) => void
  processing: boolean
}

function AlertIncidentCard({
  alerte: a, selected, onToggleSelect, onOpen, onTreat, onDelete, processing,
}: AlertIncidentCardProps) {
  // Only admins may delete alertes. Hospital staff can mark them as
  // treated but the delete button is hidden entirely for them.
  const { permissions } = usePermissions()
  const canDelete = permissions.canDeleteAlertes
  const sev = SEVERITY[a.niveau] || FALLBACK_SEVERITY
  const SevIcon = SEVERITY_ICONS[a.niveau] || Info
  const sensor = getMonitoringType(a.type ?? undefined)
  const SensorIcon = sensor.icon
  const date = new Date(a.cree_le)
  const isActiveCritical = !a.traitee && a.niveau === 'critique'

  const onCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen(a)
    }
  }

  return (
    <div
      className={`card-lift relative overflow-hidden rounded-2xl border bg-card ${
        isActiveCritical ? 'alerts-critical-pulse' : ''
      }`}
      style={{ borderColor: 'var(--border-color)' }}
    >
      {/* Severity strip */}
      <span className={`alerts-strip ${a.traitee ? 'alerts-strip-processed' : sev.strip}`} />

      <div className="px-4 py-4 sm:px-5 sm:py-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelect(a.id)
            }}
            className="relative z-20 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors"
            style={{
              background: selected ? 'var(--text-primary)' : 'var(--bg-card)',
              border: `1.5px solid ${selected ? 'var(--text-primary)' : 'var(--border-strong)'}`,
              color: selected ? 'var(--bg-card)' : 'transparent',
            }}
            aria-label={selected ? 'Désélectionner' : 'Sélectionner'}
            aria-pressed={selected}
          >
            {selected && <Check size={11} strokeWidth={3} />}
          </button>

          {/* Icon */}
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${sev.iconBg}`}
            style={{ color: sev.iconColor }}
          >
            <SevIcon size={15} strokeWidth={2.2} />
          </span>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Top row: badges + meta */}
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${sev.badge}`}
                title={sev.label}
              >
                {sev.label}
              </span>
              {a.salle && (
                <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-[10.5px] font-semibold text-text-secondary">
                  {a.salle}
                </span>
              )}
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', color: 'var(--color-primary)' }}
              >
                <SensorIcon size={10} strokeWidth={2.4} />
                {sensor.title}
              </span>
              {a.esp32_id != null && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                >
                  <Cpu size={10} strokeWidth={2.4} />
                  ESP32 #{a.esp32_id}
                </span>
              )}
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                <Clock size={10} strokeWidth={2.2} />
                {relativeTime(date)}
              </span>
            </div>

            {/* Title */}
            <p
              className="text-[15px] font-medium leading-7 tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {a.message}
            </p>

            {/* AI Analysis */}
            <div className="relative z-10 mt-3" onClick={(e) => e.stopPropagation()}>
              <AIAnalysisCard explication={a.explication} />
            </div>

            {/* Footer actions */}
            <div className="relative z-10 mt-3 flex items-center justify-end gap-2">
              {!a.traitee ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpen(a)
                    }}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors"
                    style={{ color: 'var(--text-secondary)', background: 'var(--bg-hover)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--border-color)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                  >
                    Voir le détail
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onTreat(a.id)
                    }}
                    disabled={processing}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
                    style={{ background: 'var(--text-primary)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                  >
                    {processing ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} strokeWidth={2.6} />}
                    Marquer comme traitée
                  </button>
                </>
              ) : (
                <>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-500/30"
                  >
                    <Check size={11} strokeWidth={2.6} />
                    Traitée
                  </span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(a.id)
                      }}
                      disabled={processing}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors disabled:opacity-60"
                      style={{ color: 'var(--color-danger)', background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--color-danger) 18%, transparent)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--color-danger) 10%, transparent)' }}
                      aria-label="Supprimer l'alerte"
                    >
                      <Trash2 size={11} strokeWidth={2.4} />
                      Supprimer
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Make the whole card keyboard-openable (a11y) */}
        <button
          type="button"
          onClick={() => onOpen(a)}
          onKeyDown={onCardKeyDown}
          aria-label={`Voir le détail de l'alerte ${a.id}`}
          className="absolute inset-0 cursor-pointer rounded-2xl focus-visible:outline-none"
          style={{ background: 'transparent', border: 'none' }}
        />
      </div>
    </div>
  )
}

/* ─── Skeleton card ──────────────────────────────────────────── */

function AlertSkeletonCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card" style={{ borderColor: 'var(--border-color)' }}>
      <span className="alerts-strip alerts-strip-info opacity-50" />
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="alerts-skeleton mt-0.5 h-5 w-5" />
          <div className="alerts-skeleton mt-0.5 h-9 w-9 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="alerts-skeleton h-4 w-16" />
              <div className="alerts-skeleton h-4 w-12" />
              <div className="alerts-skeleton h-4 w-20" />
            </div>
            <div className="alerts-skeleton h-3 w-[80%]" />
            <div className="alerts-skeleton h-3 w-[60%]" />
            <div className="alerts-skeleton mt-2 h-16 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Empty & no-results states ───────────────────────────────── */

function AlertEmptyState({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  return (
    <div
      className="rounded-3xl border bg-card px-6 py-14 text-center"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <div
        className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--color-success) 14%, transparent)' }}
      >
        <CheckCircle2 size={32} strokeWidth={2.2} style={{ color: 'var(--color-success)' }} />
        <span
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: '0 0 0 6px color-mix(in srgb, var(--color-success) 14%, transparent)' }}
        />
      </div>
      <p className="text-[16px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
        Aucune alerte active
      </p>
      <p className="mx-auto mt-1.5 max-w-[34ch] text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        Tout fonctionne normalement. Les incidents apparaîtront ici dès qu'ils se produiront.
      </p>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
        style={{ background: 'var(--text-primary)', color: 'var(--bg-card)' }}
      >
        <RefreshCw size={12} strokeWidth={2.4} className={refreshing ? 'animate-spin' : ''} />
        Actualiser
      </button>
    </div>
  )
}

function AlertNoResults({ onReset }: { onReset: () => void }) {
  return (
    <div
      className="rounded-3xl border bg-card px-6 py-12 text-center"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <div
        className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: 'var(--bg-hover)' }}
      >
        <Search size={24} strokeWidth={2.2} style={{ color: 'var(--text-secondary)' }} />
      </div>
      <p className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
        Aucune alerte correspondante
      </p>
      <p className="mx-auto mt-1.5 max-w-[32ch] text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        Essayez de modifier vos filtres ou de réinitialiser la recherche pour voir plus de résultats.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors"
        style={{ color: 'var(--text-secondary)', background: 'var(--bg-hover)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--border-color)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
      >
        Réinitialiser les filtres
      </button>
    </div>
  )
}

/* ─── Details modal (centered, like the ESP32 form) ──────────── */

interface AlertDetailsModalProps {
  alerte: Alerte | null
  onClose: () => void
  onTreat: (id: number) => void
  processing: boolean
}

function AlertDetailsModal({ alerte, onClose, onTreat, processing }: AlertDetailsModalProps) {
  const close = () => {
    if (processing) return
    onClose()
  }

  if (!alerte) return null

  const sev = SEVERITY[alerte.niveau] || FALLBACK_SEVERITY
  const SevIcon = SEVERITY_ICONS[alerte.niveau] || Info
  const sensor = getMonitoringType(alerte.type ?? undefined)
  const SensorIcon = sensor.icon
  const date = new Date(alerte.cree_le)

  // Pick the header icon tone to match the severity
  const headerIconTone: 'red' | 'amber' | 'blue' =
    alerte.niveau === 'critique' ? 'red' :
    alerte.niveau === 'attention' ? 'amber' :
    'blue'

  return (
    <Modal
      open={!!alerte}
      onClose={close}
      size="lg"
      dismissDisabled={processing}
      ariaLabel={`Détails de l'alerte ${alerte.id}`}
    >
      <div className="flex max-h-[85vh] flex-col">
        <ModalHeader
          icon={<SevIcon size={18} strokeWidth={2.2} />}
          iconTone={headerIconTone}
          title={alerte.message}
          subtitle={
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">
                Incident · #{alerte.id}
              </span>
              <span className="text-text-muted">·</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${sev.badge}`}>
                {sev.label}
              </span>
              {alerte.salle && (
                <span className="rounded-full bg-elevated px-2 py-0.5 text-[10.5px] font-semibold text-text-secondary">
                  {alerte.salle}
                </span>
              )}
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                style={{ background: 'rgba(59,130,246,0.08)', color: '#1D4ED8' }}
              >
                <SensorIcon size={10} strokeWidth={2.4} />
                {sensor.title}
              </span>
            </span>
          }
          onClose={close}
          closeDisabled={processing}
        />

        <ModalBody className="overflow-y-auto">
          {/* Message */}
          <section>
            <h3 className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Message
            </h3>
            <p className="mt-2 text-[15px] leading-7" style={{ color: 'var(--text-primary)' }}>
              {alerte.message}
            </p>
          </section>

          {/* AI Analysis */}
          <section className="mt-6">
            <h3 className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Analyse IA
            </h3>
            <div className="mt-2">
              <AIAnalysisCard explication={alerte.explication} />
            </div>
          </section>

          {/* Context */}
          <section className="mt-6">
            <h3 className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Contexte
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-3 rounded-2xl border p-4" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-hover)' }}>
              <Field label="Salle" value={alerte.salle ?? '—'} />
              <Field label="ESP32" value={alerte.esp32_id != null ? `#${alerte.esp32_id}` : '—'} />
              <Field label="Capteur" value={sensor.title} />
              <Field label="Créée le" value={fullDate(date)} />
              <Field
                label="Statut"
                value={alerte.traitee ? 'Traitée' : 'Active'}
                valueClass={alerte.traitee ? 'text-emerald-600 dark:text-emerald-300' : sev.text}
              />
            </div>
          </section>

          {/* Timeline */}
          <section className="mt-6">
            <h3 className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Chronologie
            </h3>
            <ol className="mt-2 space-y-3 pl-1">
              <TimelineItem
                dot={<CircleDot size={14} strokeWidth={2.4} style={{ color: alerte.traitee ? 'var(--color-success)' : 'var(--color-primary)' }} />}
                title="Alerte créée"
                subtitle={fullDate(date)}
                active
              />
              {alerte.traitee && (
                <TimelineItem
                  dot={<Check size={14} strokeWidth={2.6} style={{ color: 'var(--color-success)' }} />}
                  title="Marquée comme traitée"
                  subtitle="Statut mis à jour"
                />
              )}
              {!alerte.traitee && (
                <TimelineItem
                  dot={<Sparkles size={14} strokeWidth={2.2} style={{ color: 'var(--color-primary)' }} />}
                  title="En attente d'action"
                  subtitle="Résolvez l'alerte pour la clôturer"
                />
              )}
            </ol>
          </section>

          {/* Future actions placeholder */}
          <section className="mt-6">
            <div
              className="flex items-start gap-3 rounded-2xl border border-dashed p-4"
              style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-hover)' }}
            >
              <Sparkles size={15} strokeWidth={2.2} style={{ color: 'var(--text-secondary)' }} />
              <div>
                <p className="text-[12.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Plus d'actions à venir
                </p>
                <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                  Assigner des responsables, escalader vers une salle et lancer des réponses automatisées depuis cet écran.
                </p>
              </div>
            </div>
          </section>
        </ModalBody>

        <ModalFooter>
          <ModalButton variant="secondary" onClick={close} disabled={processing}>
            Fermer
          </ModalButton>
          {!alerte.traitee && (
            <ModalButton
              variant="primary"
              onClick={() => onTreat(alerte.id)}
              loading={processing}
              leadingIcon={<Check size={12} strokeWidth={2.6} />}
            >
              Marquer comme traitée
            </ModalButton>
          )}
        </ModalFooter>
      </div>
    </Modal>
  )
}

function Field({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className={`mt-0.5 text-[13px] font-medium ${valueClass || ''}`} style={valueClass ? undefined : { color: 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  )
}

function TimelineItem({ dot, title, subtitle, active }: { dot: React.ReactNode; title: string; subtitle: string; active?: boolean }) {
  return (
    <li className="relative pl-7">
      <span
        className="absolute left-0 top-0.5 flex h-5 w-5 items-center justify-center rounded-full"
        style={{ background: active ? 'color-mix(in srgb, var(--color-primary) 14%, transparent)' : 'var(--bg-hover)' }}
      >
        {dot}
      </span>
      <p className="text-[12.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
    </li>
  )
}

/* ─── Grouped timeline ────────────────────────────────────────── */

function AlertGroupSection({ title, items, ...rest }: {
  title: string
  items: Alerte[]
  selected: Set<number>
  onToggleSelect: (id: number) => void
  onOpen: (a: Alerte) => void
  onTreat: (id: number) => void
  onDelete: (id: number) => void
  processingId: number | null
}) {
  return (
    <section>
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          {title}
        </h3>
        <span
          className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
        >
          {items.length}
        </span>
      </header>
      <div
        className="mb-2 h-px w-full"
        style={{ background: 'var(--border-color)' }}
      />
      <div className="space-y-3">
        {items.map((a, idx) => (
          <div
            key={a.id}
            style={{
              animation: 'historyItemIn 200ms cubic-bezier(0.25, 0.1, 0.25, 1) both',
              animationDelay: `${Math.min(idx, 8) * 30}ms`,
            }}
          >
            <AlertIncidentCard
              alerte={a}
              selected={rest.selected.has(a.id)}
              onToggleSelect={rest.onToggleSelect}
              onOpen={rest.onOpen}
              onTreat={rest.onTreat}
              onDelete={rest.onDelete}
              processing={rest.processingId === a.id}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─── Public component (props unchanged) ─────────────────────── */

export default function AlertsList({
  alertes,
  onRefresh,
  variant = 'all',
  compact: _compact = false,
  onStatusChange,
}: Props) {
  const [processing, setProcessing] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [drawer, setDrawer] = useState<Alerte | null>(null)
  // Confirmation dialog state. Two flavors: single-id delete and bulk
  // delete. Using a state-driven in-app modal instead of window.confirm
  // — the native dialog breaks the design, freezes the tab, and looks
  // out of place next to the rest of the UI.
  const [confirmDelete, setConfirmDelete] = useState<
    { kind: 'single'; id: number } | { kind: 'bulk'; ids: number[] } | null
  >(null)
  // In-app toast for success / error feedback. Same reason: native
  // window.alert looks bad and blocks the UI thread.
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [now, setNow] = useState(Date.now())
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const traiter = useCallback(async (id: number) => {
    setProcessing(id)
    try {
      await traiterAlerte(id)
      onRefresh()
      // Close the drawer if it was showing the treated alert
      setDrawer(prev => (prev && prev.id === id ? null : prev))
    } finally {
      setProcessing(null)
    }
  }, [onRefresh])

  // Toast helper — auto-dismiss after 3.5s. Used in place of window.alert
  // so the UI never freezes and the design stays consistent.
  const showToast = useCallback((tone: 'success' | 'error', text: string) => {
    setToast({ tone, text })
    window.setTimeout(() => setToast(t => (t && t.text === text ? null : t)), 3500)
  }, [])

  // Click on the per-card "Supprimer" button — just opens the
  // confirmation modal. The actual API call lives in
  // ``performDelete`` below and runs when the user confirms.
  const askDeleteOne = useCallback((id: number) => {
    setConfirmDelete({ kind: 'single', id })
  }, [])

  // Suppression effective (single ou bulk). Appelée depuis le modal de
  // confirmation. Gère aussi la fermeture du drawer et la désélection.
  const performDelete = useCallback(async () => {
    if (!confirmDelete) return
    if (confirmDelete.kind === 'single') {
      const id = confirmDelete.id
      setProcessing(id)
      try {
        await deleteAlerte(id)
        setDrawer(prev => (prev && prev.id === id ? null : prev))
        setState(s => {
          if (!s.selected.has(id)) return s
          const next = new Set(s.selected)
          next.delete(id)
          return { ...s, selected: next }
        })
        showToast('success', 'Alerte supprimée.')
        onRefresh()
      } catch (err) {
        showToast('error', 'Échec de la suppression : ' + (err as Error).message)
      } finally {
        setProcessing(null)
        setConfirmDelete(null)
      }
    } else {
      const ids = confirmDelete.ids
      try {
        const r = await deleteAlertesBulk(ids)
        // Vider la sélection
        setState(s => ({ ...s, selected: new Set() }))
        showToast('success', `${r.data.deleted} alerte(s) supprimée(s).`)
        onRefresh()
      } catch (err) {
        showToast('error', 'Échec de la suppression : ' + (err as Error).message)
      } finally {
        setConfirmDelete(null)
      }
    }
  }, [confirmDelete, onRefresh, showToast])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      onRefresh()
      setLastUpdated(Date.now())
    } finally {
      // brief visual confirmation even if the caller is sync
      setTimeout(() => setRefreshing(false), 400)
    }
  }, [onRefresh])

  // Mark last-updated whenever the parent prop changes (after a successful fetch)
  useEffect(() => {
    setLastUpdated(Date.now())
  }, [alertes])

  // 1s ticker for "Updated Xs ago"
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Silent auto-refresh after 30s, but only when the tab is visible
  useEffect(() => {
    if (!lastUpdated) return
    const ms = now - lastUpdated
    if (ms > 30_000 && !document.hidden) {
      onRefresh()
    }
  }, [now, lastUpdated, onRefresh])

  // Toolbar state
  const [state, setState] = useState<ToolbarState>({
    q: '',
    severity: 'all',
    status: variant === 'active' ? 'active' : variant === 'processed' ? 'processed' : 'all',
    room: '',
    sort: 'newest',
    selected: new Set(),
  })

  // Re-sync the status filter when the page-level variant changes
  useEffect(() => {
    setState(s => ({
      ...s,
      status: variant === 'active' ? 'active' : variant === 'processed' ? 'processed' : 'all',
      selected: new Set(),
    }))
  }, [variant])

  // Build room list from current data
  const rooms = useMemo(() => {
    const set = new Set<string>()
    alertes.forEach(a => { if (a.salle) set.add(a.salle) })
    return Array.from(set).sort()
  }, [alertes])

  // Apply filters + sort
  const filtered = useMemo(() => {
    const q = state.q.trim().toLowerCase()
    const out = alertes.filter(a => {
      if (state.severity !== 'all' && a.niveau !== state.severity) return false
      if (state.status === 'active' && a.traitee) return false
      if (state.status === 'processed' && !a.traitee) return false
      if (state.room && a.salle !== state.room) return false
      if (q) {
        const hay = [
          a.message ?? '',
          a.salle ?? '',
          a.type ?? '',
          a.esp32_id != null ? String(a.esp32_id) : '',
        ].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    out.sort((a, b) => {
      const da = new Date(a.cree_le).getTime()
      const db = new Date(b.cree_le).getTime()
      return state.sort === 'newest' ? db - da : da - db
    })
    return out
  }, [alertes, state])

  // Group by date
  const groups = useMemo(() => {
    const map: Record<GroupKey, Alerte[]> = {
      today: [], yesterday: [], thisWeek: [], earlier: [],
    }
    filtered.forEach(a => {
      map[groupKeyFor(new Date(a.cree_le))].push(a)
    })
    return GROUP_ORDER
      .map(k => ({ key: k, title: GROUP_TITLE[k], items: map[k] }))
      .filter(g => g.items.length > 0)
  }, [filtered])

  const allFilteredIds = filtered.map(a => a.id)
  const activeCount = alertes.filter(a => !a.traitee).length

  const onToggleSelect = (id: number) => {
    setState(s => {
      const next = new Set(s.selected)
      if (next.has(id)) next.delete(id); else next.add(id)
      return { ...s, selected: next }
    })
  }

  const onBulkAction = () => {
    if (state.selected.size === 0) return
    // Ouvre la modale de confirmation. La suppression effective est
    // lancée par ``performDelete`` quand l'utilisateur confirme.
    setConfirmDelete({ kind: 'bulk', ids: Array.from(state.selected) })
  }

  const resetFilters = () => setState(s => ({
    ...s,
    q: '',
    severity: 'all',
    status: variant === 'active' ? 'active' : variant === 'processed' ? 'processed' : 'all',
    room: '',
    selected: new Set(),
  }))

  const liveCount = {
    value: activeCount,
    label: activeCount === 0 ? 'tout est sous contrôle' : 'à traiter',
    tone: (activeCount > 0 ? 'danger' : 'good') as 'danger' | 'good',
  }

  const updatedLabel = (() => {
    if (!lastUpdated) return 'Synchronisation…'
    const diff = Math.max(0, Math.floor((now - lastUpdated) / 1000))
    if (diff < 5) return 'Mis à jour à l\'instant'
    if (diff < 60) return `Mis à jour il y a ${diff}s`
    if (diff < 3600) return `Mis à jour il y a ${Math.floor(diff / 60)} min`
    return `Mis à jour il y a ${Math.floor(diff / 3600)} h`
  })()

  const isEmptyDataset = alertes.length === 0
  const isEmptyResult = !isEmptyDataset && filtered.length === 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        category="Surveillance"
        title="Alertes"
        subtitle="Surveillez et gérez les incidents dans toutes les salles connectées de l'hôpital."
        liveCount={liveCount}
        rightSlot={
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
              style={{
                background: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
                color: 'var(--color-success)',
                border: '1px solid color-mix(in srgb, var(--color-success) 25%, transparent)',
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: 'var(--color-success)', boxShadow: '0 0 0 3px color-mix(in srgb, var(--color-success) 22%, transparent)' }}
              />
              <span className="font-semibold">En direct</span>
              <span style={{ color: 'var(--text-secondary)' }}>· {updatedLabel}</span>
            </span>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Actualiser"
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3.5 py-1.5 text-[12.5px] font-medium shadow-[0_1px_2px_var(--shadow-1)] transition-all duration-200 hover:-translate-y-px hover:bg-hover active:scale-[0.97] disabled:opacity-60"
              style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)' }}
            >
              <RefreshCw size={12} strokeWidth={2.4} className={refreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        }
      />

      {/* Overview */}
      <AlertStatsRow alertes={alertes} />

      {/* Toolbar */}
      <AlertToolbar
        state={state}
        setState={setState}
        rooms={rooms}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        allFilteredIds={allFilteredIds}
        onBulkAction={onBulkAction}
        onStatusChange={onStatusChange}
      />

      {/* Selection strip */}
      {state.selected.size > 0 && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-2.5 text-[12.5px]"
          style={{ background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--color-primary) 25%, transparent)', color: 'var(--color-primary)' }}
        >
          <span className="font-semibold">{state.selected.size} sélectionnée(s)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setState(s => ({ ...s, selected: new Set(allFilteredIds) }))}
              className="rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors hover:bg-card/60"
            >
              Tout sélectionner (visibles)
            </button>
            <button
              type="button"
              onClick={() => setState(s => ({ ...s, selected: new Set() }))}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors hover:bg-card/60"
            >
              <Trash2 size={11} strokeWidth={2.4} />
              Effacer
            </button>
          </div>
        </div>
      )}

      {/* Grouped timeline */}
      <div className="space-y-7">
        {isEmptyDataset ? (
          <AlertEmptyState onRefresh={handleRefresh} refreshing={refreshing} />
        ) : isEmptyResult ? (
          <AlertNoResults onReset={resetFilters} />
        ) : (
          groups.map(g => (
            <AlertGroupSection
              key={g.key}
              title={g.title}
              items={g.items}
              selected={state.selected}
              onToggleSelect={onToggleSelect}
              onOpen={setDrawer}
              onTreat={traiter}
              onDelete={askDeleteOne}
              processingId={processing}
            />
          ))
        )}
      </div>

      {/* Details modal */}
      <AlertDetailsModal
        alerte={drawer}
        onClose={() => setDrawer(null)}
        onTreat={traiter}
        processing={processing !== null}
      />

      {/* Confirmation modal — remplace window.confirm pour la suppression.
          Une seule forme qui s'adapte au nombre d'alertes sélectionnées :
          titre et libellé du bouton se mettent au singulier/pluriel
          automatiquement. Couvre à la fois le bouton 'Supprimer' d'une
          carte et l'action de masse du toolbar. */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        size="sm"
        ariaLabel="Confirmer la suppression"
      >
        {confirmDelete ? (
          (() => {
            const count =
              confirmDelete.kind === 'single' ? 1 : confirmDelete.ids.length
            return (
              <>
                <ModalHeader
                  icon={<Trash2 size={18} strokeWidth={2.2} />}
                  iconTone="red"
                  title={
                    count === 1
                      ? 'Supprimer cette alerte ?'
                      : `Supprimer ${count} alertes ?`
                  }
                  subtitle="Cette action est irréversible. Les alertes seront définitivement retirées de l'historique."
                  onClose={() => setConfirmDelete(null)}
                />
                <ModalFooter noBorder>
                  <ModalButton
                    variant="secondary"
                    onClick={() => setConfirmDelete(null)}
                  >
                    Annuler
                  </ModalButton>
                  <ModalButton
                    variant="danger"
                    onClick={performDelete}
                    loading={processing !== null && confirmDelete.kind === 'single'}
                  >
                    {count === 1 ? 'Supprimer' : 'Tout supprimer'}
                  </ModalButton>
                </ModalFooter>
              </>
            )
          })()
        ) : null}
      </Modal>

      {/* In-app toast — remplace window.alert. Disparaît tout seul
          après 3.5s, ne bloque pas l'UI, et reste dans le design. */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-6 right-6 z-[300] flex items-center gap-2.5 rounded-2xl border bg-elevated px-4 py-3 shadow-[0_12px_36px_-12px_rgba(15,23,42,0.25)]"
          style={{
            borderColor: toast.tone === 'error' ? 'color-mix(in srgb, var(--color-danger) 30%, transparent)' : 'color-mix(in srgb, var(--color-success) 30%, transparent)',
            animation: 'modalPanelIn 180ms cubic-bezier(0.25, 0.1, 0.25, 1) both',
          }}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{
              background: toast.tone === 'error' ? 'color-mix(in srgb, var(--color-danger) 14%, transparent)' : 'color-mix(in srgb, var(--color-success) 14%, transparent)',
              color: toast.tone === 'error' ? 'var(--color-danger)' : 'var(--color-success)',
            }}
          >
            {toast.tone === 'error'
              ? <X size={14} strokeWidth={2.6} />
              : <Check size={14} strokeWidth={2.6} />}
          </span>
          <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
            {toast.text}
          </span>
        </div>
      )}
    </div>
  )
}

/* Keep Activity icon in scope so the bundle doesn't tree-shake it
   away if we ever use it inside a tooltip. */
void Activity
