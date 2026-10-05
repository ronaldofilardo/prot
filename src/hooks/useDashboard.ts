"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFilters } from "@/hooks/useFilters";
import type { DashboardData, UseDashboardResult } from "./dashboard-types";

export type { DashboardData, UseDashboardResult } from "./dashboard-types";

type CargaContexto = {
  cliente: string;
  dataInicial: string;
  dataFinal: string;
  matrizId: string | null;
  empresaIds: string[];
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  setData: (v: DashboardData) => void;
  irParaUrl: (url: string) => void;
};

async function carregarDashboardApi(ctx: CargaContexto): Promise<void> {
  ctx.setLoading(true);
  ctx.setError(null);
  try {
    const params = new URLSearchParams();
    if (ctx.cliente) params.set("cliente", ctx.cliente);
    if (ctx.dataInicial) params.set("inicial", ctx.dataInicial);
    if (ctx.dataFinal) params.set("final", ctx.dataFinal);
    if (ctx.matrizId) params.set("matriz", ctx.matrizId);
    ctx.empresaIds.forEach((id) => params.append("empresaId", id));

    const queryStr = params.toString();
    ctx.irParaUrl(queryStr ? `/dashboard?${queryStr}` : `/dashboard`);

    const res = await fetch(`/api/dashboard?${params.toString()}`);
    if (!res.ok) throw new Error(`Erro na requisição: ${res.statusText}`);
    const json: DashboardData = await res.json();
    ctx.setData(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao conectar com a API";
    ctx.setError(message);
  } finally {
    ctx.setLoading(false);
  }
}

function useFiltrosDaUrl(searchParams: URLSearchParams): void {
  const { setCliente, setDataInicial, setDataFinal } = useFilters();
  useEffect(() => {
    const urlCliente = searchParams.get("cliente");
    const urlInicial = searchParams.get("inicial");
    const urlFinal = searchParams.get("final");
    if (urlCliente) setCliente(urlCliente);
    if (urlInicial) setDataInicial(urlInicial);
    if (urlFinal) setDataFinal(urlFinal);
  }, [searchParams, setCliente, setDataInicial, setDataFinal]);
}

export function useDashboard(): UseDashboardResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  useFiltrosDaUrl(searchParams);
  const { cliente, dataInicial, dataFinal, matrizId, empresaIds } = useFilters();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarDados = useCallback(
    () =>
      carregarDashboardApi({
        cliente, dataInicial, dataFinal, matrizId, empresaIds,
        setLoading, setError, setData,
        irParaUrl: (url) => startTransition(() => router.replace(url)),
      }),
    [cliente, dataInicial, dataFinal, matrizId, empresaIds, router, startTransition]
  );

  useEffect(() => {
    const timer = setTimeout(carregarDados, 350);
    return () => clearTimeout(timer);
  }, [carregarDados]);

  return { data, loading, error, temFiltroAtivo: Boolean(cliente || dataInicial || dataFinal), carregarDados };
}
