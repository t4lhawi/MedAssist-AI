import React, { useEffect, useMemo, useState } from 'react'
import { getDocuments } from '../services/api'
import { Document } from '../types'
import DocumentsManager from '../components/Documents/DocumentsManager'
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Database,
  FileCheck2,
  FileText,
  Search,
  Sparkles,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'

/** Tiny count-up helper — same idea as StatCard but kept inline since
 *  the Documents page only animates a single number. */
function useCountUp(value: number, duration = 600) {
  const [display, setDisplay] = useState(value)
  useEffect(() => {
    const start = performance.now()
    const from = display
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return display
}

function MiniStat({
  label,
  value,
  total,
  color,
  icon: Icon,
}: {
  label: string
  value: number
  total: number
  color: 'slate' | 'emerald' | 'amber'
  icon: React.ElementType
}) {
  const animated = useCountUp(value)
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  const palette = {
    slate: { bg: 'bg-slate-100', text: 'text-slate-700', bar: 'bg-slate-400' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  }[color]

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className={`flex h-5 w-5 items-center justify-center rounded-md ${palette.bg} ${palette.text}`}>
          <Icon size={11} strokeWidth={2.4} />
        </span>
        <p className="text-[10.5px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <p className={`text-[20px] font-semibold leading-none tracking-tight tabular-nums ${palette.text}`}>{animated}</p>
        {total > 0 && <span className="text-[11px] font-medium text-slate-400">/ {total}</span>}
      </div>
      {total > 0 && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${palette.bar} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])

  const load = async () => {
    const r = await getDocuments()
    setDocuments(r.data)
  }

  useEffect(() => { load() }, [])

  const indexed = documents.filter(d => d.indexe).length
  const pending = documents.length - indexed

  // Recents by upload date — used for the "Derniers ajouts" panel.
  const recents = useMemo(
    () => [...documents].sort((a, b) => new Date(b.uploade_le).getTime() - new Date(a.uploade_le).getTime()).slice(0, 4),
    [documents],
  )

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 md:p-5">
      <PageHeader
        category="Connaissance interne"
        title="Documents"
        subtitle={`${documents.length} document(s) · ${indexed} indexé(s) dans la base IA`}
        liveCount={
          documents.length > 0
            ? {
                value: `${Math.round((indexed / documents.length) * 100)}%`,
                label: 'indexé',
                tone: indexed === documents.length ? 'good' : indexed > 0 ? 'warning' : 'neutral',
              }
            : undefined
        }
        rightSlot={
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Total" value={documents.length} total={documents.length} color="slate" icon={FileText} />
            <MiniStat label="Indexé" value={indexed} total={documents.length} color="emerald" icon={CheckCircle2} />
            <MiniStat label="En cours" value={pending} total={documents.length} color="amber" icon={Database} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <DocumentsManager documents={documents} onRefresh={load} />
        </div>

        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[14.5px] font-semibold tracking-[-0.01em] text-slate-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <BookOpen size={14} strokeWidth={2.2} />
              </span>
              Cycle documentaire
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileCheck2 size={16} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-slate-800">Ajoutez les PDF validés</p>
                  <p className="text-[12.5px] text-slate-400">Protocoles, procédures et manuels internes.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Database size={16} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-slate-800">Indexation automatique</p>
                  <p className="text-[12.5px] text-slate-400">Les contenus deviennent consultables par l'assistant IA.</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 p-3.5 text-[12.5px] font-medium leading-5 text-amber-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Les réponses de l'IA dépendent directement de la qualité et de l'actualité des documents indexés.
            </div>
          </div>

          {recents.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-[14.5px] font-semibold tracking-[-0.01em] text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Sparkles size={14} strokeWidth={2.2} />
                </span>
                Derniers ajouts
              </div>
              <ul className="space-y-1.5">
                {recents.map(d => (
                  <li
                    key={d.id}
                    className="flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-slate-50"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                      <FileText size={12} strokeWidth={2} />
                    </span>
                    <p className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-slate-700">{d.nom}</p>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        d.indexe ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <span className={`h-1 w-1 rounded-full ${d.indexe ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {d.indexe ? 'Indexé' : 'En cours'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
