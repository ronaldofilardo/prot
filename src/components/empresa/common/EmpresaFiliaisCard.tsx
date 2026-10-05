import React from "react";
import { GitBranch, CheckCircle2 } from "lucide-react";
import type { ProtheusFilialInfo } from "@/hooks/useEmpresaProtheus";
import { FilialCodigoBadge, FilialTipoBadge } from "./FilialBadges";

interface EmpresaFiliaisCardProps {
  filiais: ProtheusFilialInfo[];
  loading?: boolean;
}

function FiliaisCardHeader({ total }: { total: number }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <GitBranch size={18} className="text-emerald-600 dark:text-emerald-400" />
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Filiais Cadastradas no Protheus — LC1 Contadores
        </h4>
      </div>
      <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        {total} {total === 1 ? "filial cadastrada" : "filiais cadastradas"}
      </span>
    </div>
  );
}

function FilialRow({ f }: { f: ProtheusFilialInfo }) {
  return (
    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
      <td className="py-2.5"><FilialCodigoBadge f={f} /></td>
      <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">Empresa {f.codigoEmpresa}</td>
      <td className="py-2.5"><FilialTipoBadge f={f} /></td>
      <td className="py-2.5 font-medium text-slate-800 dark:text-slate-100">{f.nome}</td>
      <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">{f.cnpj || "Mesmo da Matriz"}</td>
      <td className="py-2.5 text-right">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={12} />
          {f.status || "Ativa"}
        </span>
      </td>
    </tr>
  );
}

function FiliaisTableHeader() {
  return (
    <thead>
      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
        <th className="pb-2 font-medium">Cód. Filial (Protheus)</th>
        <th className="pb-2 font-medium">Cód. Empresa</th>
        <th className="pb-2 font-medium">Tipo</th>
        <th className="pb-2 font-medium">Nome / Razão Social</th>
        <th className="pb-2 font-medium">CNPJ / Identificação</th>
        <th className="pb-2 font-medium text-right">Status</th>
      </tr>
    </thead>
  );
}

function FiliaisVazio({ loading }: { loading?: boolean }) {
  return (
    <p className="text-xs text-slate-400 italic py-2">
      {loading ? "Carregando filiais..." : "Nenhuma filial encontrada para este cliente."}
    </p>
  );
}

export function EmpresaFiliaisCard({ filiais, loading }: EmpresaFiliaisCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <FiliaisCardHeader total={filiais.length} />
      {filiais.length === 0 ? (
        <FiliaisVazio loading={loading} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <FiliaisTableHeader />
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filiais.map((f, i) => <FilialRow key={f.id || `${f.codigoEmpresa}-${f.codigoFilial}-${i}`} f={f} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
