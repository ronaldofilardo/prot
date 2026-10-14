"use client";

import { useState, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import type { ProtheusFilialInfo, FiliaisInfo } from "@/hooks/useEmpresaProtheus";
import { useFilters } from "@/hooks/useFilters";
import { FiliaisHeader } from "./FiliaisHeader";
import { FiliaisSearchInput } from "./FiliaisSearchInput";
import { FiliaisTable } from "./FiliaisTable";

interface EmpresaFiliaisCardProps {
  filiais: ProtheusFilialInfo[];
  filiaisInfo?: FiliaisInfo | null;
  loading?: boolean;
}

function matchesBusca(f: ProtheusFilialInfo, termo: string): boolean {
  const t = termo.toLowerCase();
  const contem = (v: string | undefined) => v?.toLowerCase().includes(t);
  return Boolean(
    contem(f.nome) ||
      contem(f.nomeFilial) ||
      contem(f.cnpj) ||
      contem(f.cidade) ||
      contem(f.id) ||
      contem(f.codigoFilial) ||
      contem(f.filialCompleta)
  );
}

function useFiliaisFilter(filiais: ProtheusFilialInfo[]) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return filiais;
    return filiais.filter((f) => matchesBusca(f, termo));
  }, [filiais, busca]);

  return { busca, setBusca, filtrados };
}

function criarSeletorFilial(
  empresaIds: string[],
  filiaisInfo: FiliaisInfo | null | undefined,
  setEmpresaIds: (ids: string[]) => void,
  setMatriz: (id: string | null) => void
) {
  return (f: ProtheusFilialInfo) => {
    const id = f.empresaVinculadaId;
    if (!id) return;
    // Filtra o dashboard pela filial (Empresa vinculada). Trocar a matriz limpa a
    // selecao, entao ela e definida primeiro.
    if (empresaIds.length === 1 && empresaIds[0] === id) {
      setEmpresaIds([]);
      return;
    }
    if (filiaisInfo?.matrizId) setMatriz(filiaisInfo.matrizId);
    setEmpresaIds([id]);
  };
}

export function EmpresaFiliaisCard({ filiais, filiaisInfo, loading }: EmpresaFiliaisCardProps) {
  const { empresaIds, setEmpresaIds, setMatriz } = useFilters();
  const { busca, setBusca, filtrados } = useFiliaisFilter(filiais);
  const selecionarFilial = criarSeletorFilial(empresaIds, filiaisInfo, setEmpresaIds, setMatriz);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <FiliaisHeader filiais={filiais} info={filiaisInfo} />
      {filiaisInfo?.aviso && (
        <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{filiaisInfo.aviso}</span>
        </div>
      )}
      {filiais.length > 0 && <FiliaisSearchInput busca={busca} setBusca={setBusca} filiais={filiais} filtrados={filtrados} />}
      <FiliaisTable
        filiais={filiais}
        filtrados={filtrados}
        loading={loading}
        empresaIdsAtivos={empresaIds}
        onSelecionarFilial={selecionarFilial}
      />
    </div>
  );
}
