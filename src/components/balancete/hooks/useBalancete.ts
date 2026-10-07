import { useState, useCallback } from "react";
import type { SaldoContabilRow, BalanceteDTO, BalanceteFilters } from "../types";
import { formatarMoeda } from "../utils/formatBalancete";

function formatSaldoContabilRow(row: SaldoContabilRow): BalanceteDTO {
  return {
    id: row.id,
    filial: row.filial,
    conta: row.conta,
    competencia: row.competencia,
    saldoAnteriorFormatado: formatarMoeda(row.saldoAnterior),
    debitosFormatados: formatarMoeda(row.debitos),
    creditosFormatados: formatarMoeda(row.creditos),
    saldoAtualFormatado: formatarMoeda(row.saldoAtual),
  };
}

async function fetchSaldosData(filters: BalanceteFilters): Promise<BalanceteDTO[]> {
  const params = new URLSearchParams();
  if (filters.exercicio) params.append("exercicio", filters.exercicio);
  if (filters.filial) params.append("filial", filters.filial);

  const res = await fetch("/api/saldos?" + params.toString());
  if (!res.ok) {
    throw new Error("Falha ao buscar saldos");
  }
  const data = await res.json();
  return (data.saldos || []).map(formatSaldoContabilRow);
}

export function useBalancete() {
  const [loading, setLoading] = useState(false);
  const [saldos, setSaldos] = useState<BalanceteDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<BalanceteFilters>({
    exercicio: new Date().getFullYear().toString(),
    filial: "",
  });

  const fetchSaldos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const formatados = await fetchSaldosData(filters);
      setSaldos(formatados);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  return { loading, error, saldos, filters, setFilters, fetchSaldos };
}