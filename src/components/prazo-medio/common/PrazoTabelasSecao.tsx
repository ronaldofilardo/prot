import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PrazoTabelaClientes } from "./PrazoTabelaClientes";
import { PrazoTabelaFornecedores } from "./PrazoTabelaFornecedores";
import type { PrazoClienteViewModel, PrazoFornecedorViewModel } from "../types";

interface PrazoTabelasSecaoProps {
  clientes: PrazoClienteViewModel[];
  fornecedores: PrazoFornecedorViewModel[];
}

export function PrazoTabelasSecao({ clientes, fornecedores }: PrazoTabelasSecaoProps) {
  const [aba, setAba] = useState<"clientes" | "fornecedores">("clientes");
  const isClientes = aba === "clientes";

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <Button
          variant={isClientes ? "default" : "outline"}
          size="sm"
          onClick={() => setAba("clientes")}
        >
          PMR por Cliente ({clientes.length})
        </Button>
        <Button
          variant={isClientes ? "outline" : "default"}
          size="sm"
          onClick={() => setAba("fornecedores")}
        >
          PMP por Fornecedor ({fornecedores.length})
        </Button>
      </div>

      {isClientes ? (
        <PrazoTabelaClientes clientes={clientes} />
      ) : (
        <PrazoTabelaFornecedores fornecedores={fornecedores} />
      )}
    </div>
  );
}
