"use client";

import React from "react";
import { Calendar, Search, RotateCcw } from "lucide-react";
import { useFilters } from "@/hooks/useFilters";

interface ClienteItem {
  id: string;
  codigo: string;
  nome: string;
  cidade: string;
  estado: string;
}

import { ActiveFiltersBadge } from "./ActiveFiltersBadge";
export function DashboardFilterBar({ clientes }: { clientes: ClienteItem[] }) {
  const { cliente, dataInicial, dataFinal, setCliente, setDataInicial, setDataFinal, limparFiltros } = useFilters();
  const temFiltroAtivo = Boolean(cliente || dataInicial || dataFinal);

  return (
    <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Cliente / Empresa</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
                <input
                  type="text"
                  list="clientes-datalist"
                  placeholder="Filtrar por nome ou código..."
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                />
                <datalist id="clientes-datalist">
                  {clientes.map((c) => (
                    <option key={c.id} value={c.nome}>{c.codigo} - {c.cidade}/{c.estado}</option>
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Data Inicial</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
                <input
                  type="date"
                  value={dataInicial}
                  onChange={(e) => setDataInicial(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Data Final</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
                <input
                  type="date"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end">
            {temFiltroAtivo && (
              <button
                type="button"
                onClick={limparFiltros}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Limpar todos os filtros"
              >
                <RotateCcw size={15} />
                Limpar
              </button>
            )}
          </div>
        </div>

        {temFiltroAtivo && <ActiveFiltersBadge cliente={cliente} dataInicial={dataInicial} dataFinal={dataFinal} />}
      </div>
    </section>
  );
}
