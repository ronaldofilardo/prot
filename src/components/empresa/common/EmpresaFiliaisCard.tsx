import React from "react";
import { GitBranch, Building2, CheckCircle2, Hash } from "lucide-react";
import type { ProtheusFilialInfo } from "@/hooks/useEmpresaProtheus";

interface EmpresaFiliaisCardProps {
  filiais: ProtheusFilialInfo[];
  loading?: boolean;
}

export function EmpresaFiliaisCard({ filiais, loading }: EmpresaFiliaisCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <GitBranch size={18} className="text-emerald-600 dark:text-emerald-400" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Filiais Cadastradas no Protheus — LC1 Contadores
          </h4>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          {filiais.length} {filiais.length === 1 ? "filial cadastrada" : "filiais cadastradas"}
        </span>
      </div>

      {filiais.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-2">
          {loading ? "Carregando filiais..." : "Nenhuma filial encontrada para este cliente."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filiais.map((f, i) => (
                <tr key={f.id || `${f.codigoEmpresa}-${f.codigoFilial}-${i}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono font-bold text-xs border border-emerald-200 dark:border-emerald-800">
                      <Hash size={12} />
                      {f.codigoFilial}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">
                    Empresa {f.codigoEmpresa}
                  </td>
                  <td className="py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                      f.tipo === "Matriz"
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                      {f.tipo === "Matriz" ? <Building2 size={11} /> : <GitBranch size={11} />}
                      {f.tipo}
                    </span>
                  </td>
                  <td className="py-2.5 font-medium text-slate-800 dark:text-slate-100">
                    {f.nome}
                  </td>
                  <td className="py-2.5 font-mono text-slate-600 dark:text-slate-400">
                    {f.cnpj || "Mesmo da Matriz"}
                  </td>
                  <td className="py-2.5 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={12} />
                      {f.status || "Ativa"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
