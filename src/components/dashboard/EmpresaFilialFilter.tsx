"use client";

import React, { useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { useFilters } from "@/hooks/useFilters";
import type { EmpresaGrupoDTO } from "@/lib/types/dashboard";
import {
  listarUFs,
  filtrarFiliaisPorUF,
  todasSelecionadas,
  alternarFilial,
  alternarTodasFiliais,
  idsParaSelecionarAoEscolherMatriz,
} from "@/lib/utils/filial-selection";

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
  const ufs = useMemo(() => listarUFs(filiais), [filiais]);
  const filiaisVisiveis = useMemo(
    () => filtrarFiliaisPorUF(filiais, ufFiltro),
    [filiais, ufFiltro]
  );
  const marcarTodas = todasSelecionadas(filiais, empresaIds);

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
        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Filiais</span>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={marcarTodas}
                onChange={(e) => handleAlternarTodas(e.target.checked)}
              />
              Todas
            </label>
          </div>

          {ufs.length > 1 && (
            <select
              value={ufFiltro}
              onChange={(e) => setUfFiltro(e.target.value)}
              className="w-full mb-2 px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Todas as UFs</option>
              {ufs.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          )}

          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
            {filiaisVisiveis.map((filial) => (
              <label
                key={filial.id}
                className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 px-2 py-1 rounded-md border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={empresaIds.includes(filial.id)}
                  onChange={() => handleAlternarFilial(filial.id)}
                />
                {filial.nome} — {filial.cidade}/{filial.uf}
              </label>
            ))}
          </div>

          <p className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            Vendo {empresaIds.length} de {filiais.length} filiais selecionadas
          </p>
        </div>
      )}
    </div>
  );
}
