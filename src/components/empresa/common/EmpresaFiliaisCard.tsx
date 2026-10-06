"use client";

import React, { useState, useMemo } from "react";
import type { ProtheusFilialInfo } from "@/hooks/useEmpresaProtheus";
import { useFilters } from "@/hooks/useFilters";
import { FiliaisHeader } from "./FiliaisHeader";
import { FiliaisSearchInput } from "./FiliaisSearchInput";
import { FiliaisTable } from "./FiliaisTable";

interface EmpresaFiliaisCardProps {
  filiais: ProtheusFilialInfo[];
  loading?: boolean;
}

function useFiliaisFilter(filiais: ProtheusFilialInfo[], clienteAtivo: string) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const termo = (busca || clienteAtivo).trim().toLowerCase();
    if (!termo) return filiais;
    return filiais.filter(
      (f) =>
        f.nome?.toLowerCase().includes(termo) ||
        f.cnpj?.toLowerCase().includes(termo) ||
        f.id?.toLowerCase().includes(termo) ||
        f.codigoFilial?.toLowerCase().includes(termo)
    );
  }, [filiais, busca, clienteAtivo]);

  return { busca, setBusca, filtrados };
}

export function EmpresaFiliaisCard({ filiais, loading }: EmpresaFiliaisCardProps) {
  const { cliente: clienteAtivo, setCliente } = useFilters();
  const { busca, setBusca, filtrados } = useFiliaisFilter(filiais, clienteAtivo);

  const toggleCliente = (nome: string) => {
    setCliente(clienteAtivo === nome ? "" : nome);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <FiliaisHeader filiais={filiais} />
      {filiais.length > 0 && <FiliaisSearchInput busca={busca} setBusca={setBusca} filiais={filiais} filtrados={filtrados} />}
      <FiliaisTable
        filiais={filiais}
        filtrados={filtrados}
        loading={loading}
        clienteAtivo={clienteAtivo}
        onSelecionarCliente={toggleCliente}
      />
    </div>
  );
}