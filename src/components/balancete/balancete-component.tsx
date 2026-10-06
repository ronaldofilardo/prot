"use client";

import { useEffect } from "react";
import { useBalancete } from "./hooks/useBalancete";
import { BalanceteFiltros } from "./common/BalanceteFiltros";
import { BalanceteTable } from "./common/BalanceteTable";

export function BalancetePrincipal() {
  const { loading, error, saldos, filters, setFilters, fetchSaldos } = useBalancete();

  useEffect(() => {
    fetchSaldos();
  }, [fetchSaldos]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Balancete de Verificação</h2>
        <p className="text-muted-foreground">Consulta aos saldos contábeis extraídos do ERP (CQ0).</p>
      </div>

      <BalanceteFiltros 
        filters={filters} 
        onChange={setFilters} 
        onSearch={fetchSaldos} 
        loading={loading} 
      />

      {error && <div className="text-destructive font-medium p-4 bg-destructive/10 rounded-md">{error}</div>}

      <BalanceteTable data={saldos} />
    </div>
  );
}
