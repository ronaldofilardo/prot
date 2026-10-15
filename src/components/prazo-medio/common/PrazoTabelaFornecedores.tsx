import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDias, formatAtraso, formatBRL } from "../utils/formatPrazo";
import type { PrazoFornecedorViewModel } from "../types";

interface PrazoTabelaFornecedoresProps {
  fornecedores: PrazoFornecedorViewModel[];
}

export function PrazoTabelaFornecedores({ fornecedores }: PrazoTabelaFornecedoresProps) {
  if (fornecedores.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base font-semibold">PMP por Fornecedor</CardTitle></CardHeader>
        <CardContent className="h-32 flex items-center justify-center text-sm text-muted-foreground">
          Nenhum título a pagar encontrado para os filtros aplicados.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">PMP por Fornecedor ({fornecedores.length})</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b">
            <tr>
              <th className="py-3 px-4">Fornecedor</th>
              <th className="py-3 px-4 text-right">Volume a Pagar</th>
              <th className="py-3 px-4 text-center">PMP Concedido</th>
              <th className="py-3 px-4 text-center">PMP Realizado</th>
              <th className="py-3 px-4 text-center">Atraso Médio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fornecedores.slice(0, 50).map((forn) => {
              const atrasoPositivo = (forn.atrasoMedio ?? 0) > 0;
              return (
                <tr key={`${forn.fornecedorCodigo}-${forn.fornecedorLoja}`} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-800">
                    <div>{forn.nome || "Fornecedor sem nome"}</div>
                    <div className="text-xs text-muted-foreground font-normal">Cód: {forn.fornecedorCodigo}/{forn.fornecedorLoja}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-700">{formatBRL(forn.valorTotal)}</td>
                  <td className="py-3 px-4 text-center font-semibold text-indigo-700">{formatDias(forn.pmpConcedido)}</td>
                  <td className="py-3 px-4 text-center font-medium text-teal-700">{formatDias(forn.pmpRealizado)}</td>
                  <td className={`py-3 px-4 text-center font-medium ${atrasoPositivo ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatAtraso(forn.atrasoMedio)}
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
