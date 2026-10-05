import React, { useState } from "react";
import { Building2, RefreshCw, Loader2 } from "lucide-react";

interface EmpresaHeaderActionProps {
  loading: boolean;
  onBuscar: (customPath?: string) => void;
}

function HeaderIntro() {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <div className="flex items-center gap-2">
          <Building2 className="text-blue-600 dark:text-blue-400" size={20} />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Passo 1: Validar Empresa do Token Protheus
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
          Validação da conexão e consulta de Razão Social e CNPJ da empresa titular do token.
        </p>
      </div>
    </div>
  );
}

function BuscaForm({ loading, onBuscar }: { loading: boolean; onBuscar: (customPath?: string) => void }) {
  const [path, setPath] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onBuscar(path.trim() || undefined);
  };
  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 pt-2">
      <input
        type="text"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="Rota REST (opcional, padrão: /rest/api/protheus/v1/companies)"
        className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={loading}
        className="shrink-0 py-2 px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
        {loading ? "Consultando Protheus..." : "Buscar no Protheus"}
      </button>
    </form>
  );
}

export function EmpresaHeaderAction({ loading, onBuscar }: EmpresaHeaderActionProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <HeaderIntro />
      <BuscaForm loading={loading} onBuscar={onBuscar} />
    </div>
  );
}
