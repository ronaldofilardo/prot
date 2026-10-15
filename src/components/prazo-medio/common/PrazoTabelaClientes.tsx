import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDias, formatAtraso, formatBRL } from "../utils/formatPrazo";
import type { PrazoClienteViewModel } from "../types";

interface PrazoTabelaClientesProps {
  clientes: PrazoClienteViewModel[];
}

export function PrazoTabelaClientes({ clientes }: PrazoTabelaClientesProps) {
  if (clientes.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base font-semibold">PMR por Cliente</CardTitle></CardHeader>
        <CardContent className="h-32 flex items-center justify-center text-sm text-muted-foreground">
          Nenhum cliente com movimentação encontrada para os filtros aplicados.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">PMR por Cliente ({clientes.length})</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b">
            <tr>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4 text-right">Volume de Títulos</th>
              <th className="py-3 px-4 text-center">PMR Concedido</th>
              <th className="py-3 px-4 text-center">PMR Realizado</th>
              <th className="py-3 px-4 text-center">Atraso Médio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clientes.slice(0, 50).map((cli) => {
              const atrasoPositivo = (cli.atrasoMedio ?? 0) > 0;
              return (
                <tr key={cli.clienteId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-800">
                    <div>{cli.nome || "Cliente sem nome"}</div>
                    <div className="text-xs text-muted-foreground font-normal">Cód: {cli.codigo}/{cli.loja}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-700">{formatBRL(cli.valorTotal)}</td>
                  <td className="py-3 px-4 text-center text-slate-700">{formatDias(cli.pmrConcedido)}</td>
                  <td className="py-3 px-4 text-center font-medium text-emerald-700">{formatDias(cli.pmrRealizado)}</td>
                  <td className={`py-3 px-4 text-center font-medium ${atrasoPositivo ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatAtraso(cli.atrasoMedio)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
