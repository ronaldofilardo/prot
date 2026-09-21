"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFilters } from "@/hooks/useFilters";
import type { EmpresaGrupoDTO } from "@/lib/types/dashboard";

export interface DashboardData {
  totalClientes: number;
  clientesAtivosFiltrados: number;
  faturamentoTotal: number;
  valorVencido: number;
  ticketMedio: number;
  faturamentos: Array<{
    id: string;
    numeroNota: string;
    clienteNome: string;
    clienteCodigo: string;
    dataEmissao: string;
    valorTotal: number;
  }>;
  faturamentoMes: Array<{ mes: string; valor: number }>;
  faturamentoCliente: Array<{ nome: string; valor: number }>;
  regiaoParticipacao: Array<{ nome: string; valor: number }>;
  projecao: Array<{ mes: string; real: number | null; projetado: number | null }>;
  clientes: Array<{
    id: string;
    codigo: string;
    nome: string;
    cidade: string;
    estado: string;
  }>;
  grupos: EmpresaGrupoDTO[];
}

export interface UseDashboardResult {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  temFiltroAtivo: boolean;
  carregarDados: () => Promise<void>;
}

export function useDashboard(): UseDashboardResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const { cliente, dataInicial, dataFinal, matrizId, empresaIds, setCliente, setDataInicial, setDataFinal } =
    useFilters();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlCliente = searchParams.get("cliente");
    const urlInicial = searchParams.get("inicial");
    const urlFinal = searchParams.get("final");
    if (urlCliente) setCliente(urlCliente);
    if (urlInicial) setDataInicial(urlInicial);
    if (urlFinal) setDataFinal(urlFinal);
  }, [searchParams, setCliente, setDataInicial, setDataFinal]);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (cliente) params.set("cliente", cliente);
      if (dataInicial) params.set("inicial", dataInicial);
      if (dataFinal) params.set("final", dataFinal);
      if (matrizId) params.set("matriz", matrizId);
      empresaIds.forEach((id) => params.append("empresaId", id));

      const queryStr = params.toString();
      const novaUrl = queryStr ? `/dashboard?${queryStr}` : `/dashboard`;
      startTransition(() => router.replace(novaUrl));

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) throw new Error(`Erro na requisição: ${res.statusText}`);
      const json: DashboardData = await res.json();
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao conectar com a API";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [cliente, dataInicial, dataFinal, matrizId, empresaIds, router]);

  useEffect(() => {
    const timer = setTimeout(carregarDados, 350);
    return () => clearTimeout(timer);
  }, [carregarDados]);

  return { data, loading, error, temFiltroAtivo: Boolean(cliente || dataInicial || dataFinal), carregarDados };
}
