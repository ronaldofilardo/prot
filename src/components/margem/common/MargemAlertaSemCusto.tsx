import React from "react";
import { Info } from "lucide-react";

export function MargemAlertaSemCusto() {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs">
      <Info size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-sm mb-0.5">Notas de Prestação de Serviços (CFOP 5933 / 6933)</p>
        <p className="leading-relaxed opacity-90">
          Os itens faturados nesta base do Protheus são de prestação de serviços (produto PS00101702). No TOTVS Protheus,
          serviços não movimentam estoque físico nem registram Custo das Mercadorias Vendidas no campo{" "}
          <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">D2_CUSTO1</code>. Por isso, o custo
          apurado na tabela SD2 é R$ 0,00 e o faturamento bruto é integralmente considerado sem dedução de CMV.
        </p>
      </div>
    </div>
  );
}
