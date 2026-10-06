import React from "react";
import { ArrowRight, Loader2 } from "lucide-react";

interface EmpresaSyncBannerProps {
  salvando: boolean;
  onSalvar: () => void;
  empresaProtheusNome?: string;
}

export function EmpresaSyncBanner({ salvando, onSalvar, empresaProtheusNome }: EmpresaSyncBannerProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="text-xs text-slate-600 dark:text-slate-400">
        <span>Deseja atualizar a razão social e CNPJ da empresa com as informações do Protheus?</span>
        {empresaProtheusNome && (
          <span className="block font-semibold text-slate-800 dark:text-slate-200 mt-1">
            {empresaProtheusNome}
          </span>
        )}
      </div>
      <button
        onClick={onSalvar}
        disabled={salvando}
        className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
      >
        {salvando ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
        {salvando ? "Salvando..." : "Salvar Dados no Sistema"}
      </button>
    </div>
  );
}

