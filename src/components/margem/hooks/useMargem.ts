import { useCallback, useEffect, useState } from "react";
import type { MargemDataViewModel, MargemFiltrosViewModel } from "../types";

export interface UseMargemReturn {
  data: MargemDataViewModel | null;
  loading: boolean;
  error: string | null;
  filtros: MargemFiltrosViewModel;
  setFiltros: React.Dispatch<React.SetStateAction<MargemFiltrosViewModel>>;
  recarregar: () => Promise<void>;
}

export function buildMargemQueryString(filtros: MargemFiltrosViewModel): string {
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

export function useMargem(initialFiltros: MargemFiltrosViewModel = {}): UseMargemReturn {
  const [filtros, setFiltros] = useState<MargemFiltrosViewModel>(initialFiltros);
  const [data, setData] = useState<MargemDataViewModel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildMargemQueryString(filtros);
      const url = qs ? `/api/margem?${qs}` : "/api/margem";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Falha ao carregar margem (${res.status})`);
      }
      const json: MargemDataViewModel = await res.json();
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
