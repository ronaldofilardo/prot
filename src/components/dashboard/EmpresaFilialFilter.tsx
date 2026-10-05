"use client";

import React, { useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { useFilters } from "@/hooks/useFilters";
import type { EmpresaGrupoDTO } from "@/lib/types/dashboard";
import {
  alternarFilial,
  alternarTodasFiliais,
  idsParaSelecionarAoEscolherMatriz,
} from "@/lib/utils/filial-selection";
import { FiliaisPanel } from "./FiliaisPanel";

/**
 * Filtro de empresa com estrutura matriz/filial:
 * - Selecionar uma matriz abre a lista das suas filiais.
 * - As filiais podem ser marcadas individualmente, todas de uma vez,
 *   ou filtradas por UF para facilitar achar um subconjunto.
 * - O escopo resultante (matrizId + empresaIds) fica no `useFilters`,
 *   pronto para virar `whereEmpresaGrupo` na chamada à API.
 */
export function EmpresaFilialFilter({ grupos }: { grupos: EmpresaGrupoDTO[] }) {
  const { matrizId, empresaIds, setMatriz, setEmpresaIds } = useFilters();
  const [ufFiltro, setUfFiltro] = useState("");

  const matrizAtual = useMemo(
    () => grupos.find((g) => g.id === matrizId) ?? null,
    [grupos, matrizId]
  );

  const filiais = matrizAtual?.filiais ?? [];

  function handleSelecionarMatriz(id: string) {
    setUfFiltro("");
    setMatriz(id || null);
    setEmpresaIds(idsParaSelecionarAoEscolherMatriz(grupos, id));
  }

  function handleAlternarFilial(filialId: string) {
    setEmpresaIds(alternarFilial(empresaIds, filialId));
  }

  function handleAlternarTodas(marcar: boolean) {
    setEmpresaIds(alternarTodasFiliais(filiais, marcar));
  }

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
        Empresa / matriz
      </label>
      <div className="relative">
        <Building2
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
          size={16}
        />
        <select
          value={matrizId ?? ""}
          onChange={(e) => handleSelecionarMatriz(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
        >
          <option value="">Todas as empresas</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nome}
              {g.cnpj ? ` — ${g.cnpj}` : ""}
            </option>
          ))}
        </select>
      </div>

      {matrizAtual && filiais.length > 0 && (
        <FiliaisPanel
          filiais={filiais}
          empresaIds={empresaIds}
          ufFiltro={ufFiltro}
          onUfFiltroChange={setUfFiltro}
          onAlternarFilial={handleAlternarFilial}
          onAlternarTodas={handleAlternarTodas}
        />
      )}
    </div>
  );
}
