"use client";

import React from "react";
import { RotateCcw } from "lucide-react";
import { useFilters } from "@/hooks/useFilters";
import type { EmpresaGrupoDTO } from "@/lib/types/dashboard";
import { ActiveFiltersBadge } from "./ActiveFiltersBadge";
import { FilterFields, type ClienteItem } from "./FilterFields";

function LimparFiltrosButton({ visivel }: { visivel: boolean }) {
  const limparFiltros = useFilters((s) => s.limparFiltros);
  return (
    <div className="flex items-center gap-2 self-end">
      {visivel && (
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
  );
}

/** Empresas matriz (com suas filiais) disponíveis para o filtro de grupo. */
export function DashboardFilterBar({ clientes, grupos = [] }: { clientes: ClienteItem[]; grupos?: EmpresaGrupoDTO[] }) {
  const { cliente, dataInicial, dataFinal, matrizId, empresaIds, setCliente, setDataInicial, setDataFinal } = useFilters();
  const temFiltroAtivo = Boolean(cliente || dataInicial || dataFinal || matrizId || empresaIds.length > 0);

  return (
    <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <FilterFields
            clientes={clientes}
            grupos={grupos}
            cliente={cliente}
            dataInicial={dataInicial}
            dataFinal={dataFinal}
            onClienteChange={setCliente}
            onDataInicialChange={setDataInicial}
            onDataFinalChange={setDataFinal}
          />

          <LimparFiltrosButton visivel={temFiltroAtivo} />
        </div>

        {temFiltroAtivo && <ActiveFiltersBadge cliente={cliente} dataInicial={dataInicial} dataFinal={dataFinal} />}
      </div>
    </section>
  );
}
