import React from "react";
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import type { PullEntityResult } from "@/hooks/useUploadPanel";

interface UploadProtheusPullSectionProps {
  pulling: boolean;
  pullResults: PullEntityResult[] | null;
  pullError: string | null;
  onPull: () => void;
}

function PullHeader({ pulling, onPull }: { pulling: boolean; onPull: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Sincronização Protheus — LC1 CONTADORES - MATRIZ
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Busca as notas fiscais (SF2), clientes (SA1) e títulos da Filial 01 diretamente via API do TOTVS Protheus.
        </p>
      </div>
      <button
        onClick={onPull}
        disabled={pulling}
        className="shrink-0 py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
      >
        {pulling ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        {pulling ? "Buscando no Protheus..." : "Buscar no Protheus"}
      </button>
    </div>
  );
}

function PullErro({ pullError }: { pullError: string }) {
  return (
    <div className="mt-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-4 flex gap-3 rounded-xl">
      <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0" />
      <span className="text-sm text-red-700 dark:text-red-300">{pullError}</span>
    </div>
  );
}

function PullResultados({ pullResults }: { pullResults: PullEntityResult[] }) {
  return (
    <div className="mt-4 space-y-2">
      {pullResults.map((r, i) => (
        <div key={i} className="flex items-start gap-3 py-3 px-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          {r.erro ? (
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
          ) : (
            <CheckCircle size={18} className={`mt-0.5 shrink-0 ${r.sync.erros > 0 ? "text-amber-500" : "text-emerald-500"}`} />
          )}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{r.entidade}</span>
            {r.erro ? (
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">{r.erro}</p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {r.registros} reg → {r.sync.criados} criado(s), {r.sync.atualizados} atualizado(s), {r.sync.erros} erro(s)
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function UploadProtheusPullSection({ pulling, pullResults, pullError, onPull }: UploadProtheusPullSectionProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
      <PullHeader pulling={pulling} onPull={onPull} />
      {pullError && <PullErro pullError={pullError} />}
      {pullResults && <PullResultados pullResults={pullResults} />}
    </div>
  );
}
