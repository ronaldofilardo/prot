import { useCallback, useEffect, useState } from "react";
import type { PrazoMedioDataViewModel, PrazoMedioFiltrosViewModel } from "../types";

export interface UsePrazoMedioReturn {
  data: PrazoMedioDataViewModel | null;
  loading: boolean;
  error: string | null;
  filtros: PrazoMedioFiltrosViewModel;
  setFiltros: React.Dispatch<React.SetStateAction<PrazoMedioFiltrosViewModel>>;
  recarregar: () => Promise<void>;
}

export function buildPrazoQueryString(filtros: PrazoMedioFiltrosViewModel): string {
  const params = new URLSearchParams();
  if (filtros.filial) params.set("filial", filtros.filial);
  if (filtros.clienteId) params.set("clienteId", filtros.clienteId);
  if (filtros.dataInicio) params.set("dataInicio", filtros.dataInicio);
  if (filtros.dataFim) params.set("dataFim", filtros.dataFim);
  if (filtros.empresaIds && filtros.empresaIds.length > 0) {
    for (const id of filtros.empresaIds) params.append("empresaId", id);
  }
  return params.toString();
}

export function usePrazoMedio(initialFiltros: PrazoMedioFiltrosViewModel = {}): UsePrazoMedioReturn {
  const [filtros, setFiltros] = useState<PrazoMedioFiltrosViewModel>(initialFiltros);
  const [data, setData] = useState<PrazoMedioDataViewModel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildPrazoQueryString(filtros);
      const url = qs ? `/api/prazo-medio?${qs}` : "/api/prazo-medio";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Falha ao carregar prazo médio (${res.status})`);
      }
      const json: PrazoMedioDataViewModel = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { data, loading, error, filtros, setFiltros, recarregar };
}
