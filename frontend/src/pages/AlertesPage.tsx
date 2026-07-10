import React, { useEffect, useState } from "react";
import { getAlertes, traiterAlerte } from "../services/api";
import { Alerte } from "../types";
import { AlertTriangle, Check, CheckCircle, Info, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STYLES: Record<string, { badge: string; icon: string }> = {
  critique: { badge: "bg-red-50 text-red-600", icon: "bg-red-50 text-red-500" },
  attention: {
    badge: "bg-amber-50 text-amber-600",
    icon: "bg-amber-50 text-amber-500",
  },
  info: { badge: "bg-sky-50 text-sky-600", icon: "bg-sky-50 text-sky-500" },
};

const ICONS: Record<string, React.ElementType> = {
  critique: AlertTriangle,
  attention: AlertTriangle,
  info: Info,
};

export default function AlertesPage() {
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [filtre, setFiltre] = useState<"all" | "active" | "traitee">("active");
  const [processing, setProcessing] = useState<number | null>(null);

  const load = async () => {
    const traitee = filtre === "all" ? undefined : filtre === "traitee";
    const r = await getAlertes(traitee as any);
    setAlertes(r.data);
  };

  useEffect(() => {
    load();
  }, [filtre]);

  const traiter = async (id: number) => {
    setProcessing(id);
    try {
      await traiterAlerte(id);
      load();
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_8px_-2px_rgba(0,0,0,0.05)] md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-blue-600">
            Suivi des incidents
          </p>
          <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.02em] text-slate-900">
            Alertes
          </h2>
          <p className="mt-1 text-[13px] text-slate-400">
            {alertes.length} alerte(s) affichée(s)
          </p>
        </div>
        <div className="inline-flex rounded-full bg-slate-100 p-1">
          {(["all", "active", "traitee"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                filtre === f
                  ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {f === "all" ? "Toutes" : f === "active" ? "Actives" : "Traitées"}
            </button>
          ))}
        </div>
      </div>

      <div
        key={filtre}
        className="content-fade overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_8px_-2px_rgba(0,0,0,0.05)]"
      >
        {alertes.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle size={26} className="text-emerald-500" />
            </div>
            <p className="text-[14px] font-semibold text-slate-700">
              Aucune alerte dans cette catégorie
            </p>
            <p className="mt-1 text-[12.5px] text-slate-400">
              Changez le filtre pour consulter l'historique complet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alertes.map((a) => {
              const Icon = ICONS[a.niveau];
              const s = STYLES[a.niveau];
              return (
                <div
                  key={a.id}
                  className="grid gap-3 p-4 transition-colors hover:bg-slate-50/70 md:grid-cols-[auto_1fr_auto] md:items-center"
                >
                  <span
                    className={`flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${s.badge}`}
                  >
                    <Icon size={11} strokeWidth={2.4} />
                    {a.niveau}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-slate-800">
                      {a.message}
                    </p>
                    <p className="mt-1 text-[11.5px] text-slate-400">
                      {format(new Date(a.cree_le), "dd MMMM yyyy HH:mm", {
                        locale: fr,
                      })}
                    </p>
                  </div>
                  {a.traitee ? (
                    <span className="inline-flex items-center gap-1 text-[13px] font-medium text-emerald-600">
                      <CheckCircle size={14} /> Traitée
                    </span>
                  ) : (
                    <button
                      onClick={() => traiter(a.id)}
                      disabled={processing === a.id}
                      className="inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-2 text-[13px] font-medium text-white shadow-[0_2px_6px_-1px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-60"
                    >
                      {processing === a.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Check size={13} />
                      )}
                      Traiter
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
