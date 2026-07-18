import React, { useEffect, useState } from "react";
import { getAlertes } from "../services/api";
import { Alerte } from "../types";
import PageHeader from "../components/ui/PageHeader";
import AlertsList from "../components/Alerts/AlertsList";

type FilterKey = "all" | "active" | "traitee";

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "Toutes",
  active: "Actives",
  traitee: "Traitées",
};

export default function AlertesPage() {
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [filtre, setFiltre] = useState<FilterKey>("active");

  const load = async () => {
    const traitee = filtre === "all" ? undefined : filtre === "traitee";
    const r = await getAlertes(traitee as any);
    setAlertes(r.data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtre]);

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 md:p-5">
      <PageHeader
        category="Suivi des incidents"
        title="Alertes"
        subtitle={`${alertes.length} alerte(s) affichée(s)`}
        liveCount={{
          value: alertes.filter(a => !a.traitee).length,
          label: 'à traiter',
          tone: alertes.some(a => !a.traitee) ? 'warning' : 'good',
        }}
        actions={
          <div className="inline-flex w-fit rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {(Object.keys(FILTER_LABELS) as FilterKey[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltre(f)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                  filtre === f
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
        }
      />

      <div key={filtre} className="content-fade">
        <AlertsList
          alertes={alertes}
          onRefresh={load}
          variant={filtre === "active" ? "active" : filtre === "traitee" ? "processed" : "all"}
        />
      </div>
    </div>
  );
}
