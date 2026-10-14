import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatBRL, formatPercent } from "../utils/formatMargem";
import type { MargemClienteViewModel } from "../types";

interface MargemTabelaClientesProps {
  clientes: MargemClienteViewModel[];
}

export function MargemTabelaClientes({ clientes }: MargemTabelaClientesProps) {
  const [busca, setBusca] = useState("");

  const filtrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.codigo.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Rentabilidade por Cliente (SA1)</CardTitle>
        <div className="w-64">
          <Input
            placeholder="Buscar por cliente ou código..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase font-medium border-b">
            <tr>
              <th className="py-2.5 px-3">Cliente</th>
              <th className="py-2.5 px-3">Código/Loja</th>
              <th className="py-2.5 px-3 text-right">Receita (SD2)</th>
              <th className="py-2.5 px-3 text-right">Custo</th>
              <th className="py-2.5 px-3 text-right">Margem (R$)</th>
              <th className="py-2.5 px-3 text-right">Margem (%)</th>
              <th className="py-2.5 px-3 text-center">Status Custo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-muted-foreground">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              filtrados.map((cli) => (
                <tr key={cli.clienteId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-slate-900">{cli.nome}</td>
                  <td className="py-2.5 px-3 text-muted-foreground font-mono">{cli.codigo}/{cli.loja}</td>
                  <td className="py-2.5 px-3 text-right font-semibold">{formatBRL(cli.receita)}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600">{formatBRL(cli.custo)}</td>
                  <td className={`py-2.5 px-3 text-right font-bold ${cli.margemValor >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {formatBRL(cli.margemValor)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold">
                    {cli.possuiCustoApurado ? formatPercent(cli.margemPercentual) : "-"}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {cli.possuiCustoApurado ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                        Apurado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                        Sem Custo
                      </Badge>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
