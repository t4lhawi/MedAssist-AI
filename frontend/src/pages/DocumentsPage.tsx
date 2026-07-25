import React, { useEffect, useMemo, useState } from 'react'
import { getDocuments } from '../services/api'
import { Document } from '../types'
import DocumentsManager from '../components/Documents/DocumentsManager'
import {
  BookOpen,
  CheckCircle2,
  Database,
  FileText,
  Sparkles,
  UploadCloud,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

/* ─────────────────────────────────────────────────────────────
 *  DocumentsPage — Knowledge Base hub
 *
 *  Layout (top → bottom):
 *    1. PageHeader  (title + KPI row)
 *    2. StatCards   (4 large premium tiles)
 *    3. DocumentsManager
 *       ├─ Hero upload card
 *       ├─ Toolbar (search / filter / sort / view / refresh)
 *       └─ Document list
 *    4. Knowledge Insights panel (replaces the right sidebar)
 * ───────────────────────────────────────────────────────────── */

function fmt(bytes: number | null) {
  if (!bytes || bytes <= 0) return '0 o'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} Go`
}

function lastUpdateLabel(docs: Document[]): string {
  if (docs.length === 0) return '—'
  const latest = [...docs].sort(
    (a, b) => new Date(b.uploade_le).getTime() - new Date(a.uploade_le).getTime(),
  )[0]
  return format(new Date(latest.uploade_le), 'dd MMM yyyy', { locale: fr })
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])

  const load = async () => {
    const r = await getDocuments()
    setDocuments(r.data)
  }

  useEffect(() => {
    load()
  }, [])

  const indexed = documents.filter(d => d.indexe).length
  const pending = documents.length - indexed
  const totalBytes = documents.reduce((sum, d) => sum + (d.taille ?? 0), 0)
  const lastUpdate = lastUpdateLabel(documents)

  // Top 4 by upload date — used for the "Recent uploads" panel.
  const recents = useMemo(
    () =>
      [...documents]
        .sort((a, b) => new Date(b.uploade_le).getTime() - new Date(a.uploade_le).getTime())
        .slice(0, 4),
    [documents],
  )

  // Oldest upload date — used as "Knowledge base established on …"
  const oldest = useMemo(() => {
    if (documents.length === 0) return null
    const sorted = [...documents].sort(
      (a, b) => new Date(a.uploade_le).getTime() - new Date(b.uploade_le).getTime(),
    )
    return sorted[0].uploade_le
  }, [documents])

  const indexedRatio = documents.length > 0 ? Math.round((indexed / documents.length) * 100) : 0

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:px-6 page-transition">
      {/* ─── 1. Header ─────────────────────────────────────────── */}
      <PageHeader
        category="Base de connaissances"
        title="Documents"
        subtitle="Gérez la base de connaissances IA utilisée par MedAssist."
        liveCount={
          documents.length > 0
            ? {
                value: `${indexedRatio}%`,
                label: 'indexé',
                tone:
                  indexed === documents.length
                    ? 'good'
                    : indexed > 0
                    ? 'warning'
                    : 'neutral',
              }
            : undefined
        }
        rightSlot={
          <div className="hidden flex-wrap items-center gap-2 md:flex">
            <HeaderPill label="Total" value={documents.length.toString()} icon={FileText} tone="slate" />
            <HeaderPill label="Indexé" value={indexed.toString()} icon={CheckCircle2} tone="emerald" />
            <HeaderPill label="En attente" value={pending.toString()} icon={Database} tone="amber" />
            <HeaderPill label="Dernière mise à jour" value={lastUpdate} icon={UploadCloud} tone="blue" />
          </div>
        }
      />

      {/* ─── 2. Statistics Overview ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          label="Total des documents"
          value={documents.length}
          hint="fichiers PDF"
          icon={<FileText size={16} strokeWidth={2.2} />}
          tone="blue"
        />
        <StatCard
          label="Indexé"
          value={indexed}
          hint={documents.length > 0 ? `${indexedRatio}% prêts` : '—'}
          icon={<CheckCircle2 size={16} strokeWidth={2.2} />}
          tone="emerald"
          trend={indexed === documents.length && documents.length > 0 ? 'up' : 'flat'}
          trendLabel={indexed === documents.length && documents.length > 0 ? '100%' : `${indexedRatio}%`}
        />
        <StatCard
          label="En attente"
          value={pending}
          hint="en cours d'indexation"
          icon={<Database size={16} strokeWidth={2.2} />}
          tone="amber"
          trend={pending > 0 ? 'down' : 'flat'}
          trendLabel={pending > 0 ? `${pending}` : '0'}
        />
        <StatCard
          label="Stockage utilisé"
          value={fmt(totalBytes)}
          hint="sur disque"
          icon={<UploadCloud size={16} strokeWidth={2.2} />}
          tone="slate"
        />
      </div>

      {/* ─── 3 + 4 + 5. Manager (upload hero + toolbar + docs) ── */}
      <DocumentsManager documents={documents} onRefresh={load} />

      {/* ─── 6. Knowledge Insights Panel ────────────────────────── */}
      <InsightsPanel
        total={documents.length}
        indexed={indexed}
        pending={pending}
        recents={recents}
        oldestIso={oldest}
      />
    </div>
  )
}

/* ─── Header pill (compact, horizontal with PageHeader) ─────────── */

function HeaderPill({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: React.ElementType
  tone: 'slate' | 'emerald' | 'amber' | 'blue'
}) {
  const palette: Record<typeof tone, string> = {
    slate: 'bg-[#F5F5F7] text-[#6B7280] dark:text-text-secondary',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-[#EFF4FF] text-[#3B82F6]',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${palette[tone]}`}
    >
      <Icon size={11} strokeWidth={2.4} />
      <span className="tabular-nums">{value}</span>
      <span className="text-[11.5px] opacity-80">{label}</span>
    </span>
  )
}

/* ─── Knowledge Insights Panel ──────────────────────────────────── */

function InsightsPanel({
  total,
  indexed,
  pending,
  recents,
  oldestIso,
}: {
  total: number
  indexed: number
  pending: number
  recents: Document[]
  oldestIso: string | null
}) {
  const indexedPct = total > 0 ? Math.round((indexed / total) * 100) : 0
  const aiReady = total > 0 && pending === 0
  const lastIndexed = recents.find(d => d.indexe)

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Knowledge Base Status */}
      <article className="card rounded-2xl border border-[#ECECEC] dark:border-border bg-white dark:bg-card p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EFF4FF] text-[#3B82F6]">
            <BookOpen size={15} strokeWidth={2.2} />
          </span>
          <h3 className="text-[14.5px] font-semibold tracking-[-0.01em] text-[#111111] dark:text-text-primary">
            État de la base de connaissances
          </h3>
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <span
            className={`relative flex h-2.5 w-2.5 ${aiReady ? 'text-emerald-500' : total > 0 ? 'text-amber-500' : 'text-slate-300 dark:text-text-muted'}`}
          >
            <span
              className={`absolute inset-0 rounded-full ${aiReady ? 'bg-emerald-500' : total > 0 ? 'bg-amber-500' : 'bg-slate-300'} opacity-60 ${
                !aiReady && total > 0 ? 'animate-ping' : ''
              }`}
            />
            <span
              className={`relative h-2.5 w-2.5 rounded-full ${aiReady ? 'bg-emerald-500' : total > 0 ? 'bg-amber-500' : 'bg-slate-300'}`}
            />
          </span>
          <span className="text-[13px] font-medium text-[#111111] dark:text-text-primary">
            {total === 0
              ? 'Aucun document'
              : aiReady
              ? 'IA prête'
              : 'Indexation en cours'}
          </span>
        </div>

        <p className="mt-1.5 text-[12px] leading-relaxed text-[#6B7280] dark:text-text-secondary">
          {total === 0
            ? 'Téléversez des fichiers PDF pour alimenter l\'assistant IA.'
            : aiReady
            ? 'Tous les documents sont indexés et disponibles pour l\'assistant.'
            : `${pending} document(s) encore en cours de traitement par la pipeline d'indexation.`}
        </p>

        {total > 0 && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[11.5px] font-medium text-[#6B7280] dark:text-text-secondary">
              <span>Santé de l'indexation</span>
              <span className="tabular-nums text-[#111111] dark:text-text-primary">{indexedPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-elevated">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  indexedPct === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{ width: `${indexedPct}%` }}
              />
            </div>
          </div>
        )}
      </article>

      {/* Recent Uploads */}
      <article className="card rounded-2xl border border-[#ECECEC] dark:border-border bg-white dark:bg-card p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Sparkles size={15} strokeWidth={2.2} />
          </span>
          <h3 className="text-[14.5px] font-semibold tracking-[-0.01em] text-[#111111] dark:text-text-primary">
            Téléversements récents
          </h3>
        </div>

        {recents.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-border px-3 py-6 text-center">
            <FileText size={18} className="text-slate-300 dark:text-text-muted" strokeWidth={1.8} />
            <p className="mt-2 text-[12.5px] font-medium text-slate-500 dark:text-text-secondary">Aucun téléversement récent</p>
            <p className="mt-0.5 text-[11.5px] text-slate-400 dark:text-text-muted">Les nouveaux documents ajoutés apparaîtront ici.</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-1">
            {recents.map(d => (
              <li
                key={d.id}
                className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-slate-50 dark:hover:dark:bg-input"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-elevated text-slate-500 dark:text-text-secondary">
                  <FileText size={12} strokeWidth={2} />
                </span>
                <p className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-slate-700 dark:text-text-secondary">
                  {d.nom}
                </p>
                <span
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    d.indexe
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  <span
                    className={`h-1 w-1 rounded-full ${
                      d.indexe ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  {d.indexe ? 'Indexé' : 'En attente'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>

      {/* Knowledge Tips */}
      <article className="card rounded-2xl border border-[#ECECEC] dark:border-border bg-white dark:bg-card p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={15} strokeWidth={2.2} />
          </span>
          <h3 className="text-[14.5px] font-semibold tracking-[-0.01em] text-[#111111] dark:text-text-primary">
            Astuces de la base
          </h3>
        </div>

        <ul className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed text-[#374151] dark:text-text-secondary">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-500" />
            <span>
              Utilisez la recherche par <strong className="font-semibold text-[#111111] dark:text-text-primary">nom de fichier</strong> et{' '}
              <strong className="font-semibold text-[#111111] dark:text-text-primary">statut</strong> pour trouver un document rapidement.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-500" />
            <span>
              L'assistant IA ne cite que les documents <strong className="font-semibold text-[#111111] dark:text-text-primary">indexés</strong>.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-500" />
            <span>
              Les fichiers plus volumineux prennent plus de temps à indexer — gardez vos PDF ciblés et à jour.
            </span>
          </li>
        </ul>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 dark:bg-input px-3 py-2.5 text-[11.5px] text-[#6B7280] dark:text-text-secondary">
          <div>
            <p className="font-semibold text-[#111111] dark:text-text-primary">Dernière indexation</p>
            <p>
              {lastIndexed
                ? format(new Date(lastIndexed.uploade_le), 'dd MMM yyyy', { locale: fr })
                : '—'}
            </p>
          </div>
          {oldestIso && (
            <div className="text-right">
              <p className="font-semibold text-[#111111] dark:text-text-primary">Base créée</p>
              <p>{format(new Date(oldestIso), 'MMM yyyy', { locale: fr })}</p>
            </div>
          )}
        </div>
      </article>
    </section>
  )
}
