import type { Dispatch, SetStateAction } from "react";

export interface SyncResult {
  entidade: string;
  processados: number;
  criados: number;
  atualizados: number;
  erros: number;
}

export interface PullEntityResult {
  arquivo: string;
  entidade: string;
  registros: number;
  sync: SyncResult;
  erro?: string;
}

export type PullSetters = {
  setPulling: Dispatch<SetStateAction<boolean>>;
  setPullError: Dispatch<SetStateAction<string | null>>;
  setPullResults: Dispatch<SetStateAction<PullEntityResult[] | null>>;
};

export const ENTIDADES_SYNC_ORDEM = [
  "Cliente",
  "Faturamento",
  "ContaReceber",
  "ContaPagar",
  "Baixa",
  "BaixaPagar",
  "ItemVenda",
  "SaldoContabil",
];

async function puxarEntidadeIndividual(entidade: string): Promise<PullEntityResult[]> {
  const res = await fetch("/api/protheus/pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entidade }),
  });
  const data = await res.json();
  if (res.ok && Array.isArray(data.resultados)) return data.resultados;
  return [{
    arquivo: entidade,
    entidade,
    registros: 0,
    sync: { entidade, processados: 0, criados: 0, atualizados: 0, erros: 1 },
    erro: data.error || `Erro ao puxar ${entidade}`,
  }];
}

export async function puxarDoProtheus(
  s: PullSetters,
  onSuccess?: () => void,
  modo: "sequencial" | "lote" = "sequencial",
): Promise<void> {
  s.setPulling(true);
  s.setPullError(null);
  s.setPullResults(null);

  try {
    if (modo === "sequencial") {
      const acumulados: PullEntityResult[] = [];
      let clienteSucesso = true;
      let teveSucesso = false;

      for (const entidade of ENTIDADES_SYNC_ORDEM) {
        if (!clienteSucesso && (entidade === "Faturamento" || entidade === "ContaReceber" || entidade === "ItemVenda")) {
          acumulados.push({
            arquivo: entidade,
            entidade,
            registros: 0,
            sync: { entidade, processados: 0, criados: 0, atualizados: 0, erros: 1 },
            erro: "Ignorado pois a sincronização de Clientes falhou",
          });
          s.setPullResults([...acumulados]);
          continue;
        }

        const resultados = await puxarEntidadeIndividual(entidade);
        acumulados.push(...resultados);
        const falhou = resultados.some((r) => r.erro);
        if (entidade === "Cliente" && falhou) clienteSucesso = false;
        if (!falhou) teveSucesso = true;
        s.setPullResults([...acumulados]);
      }

      if (teveSucesso && onSuccess) onSuccess();
      return;
    }

    const res = await fetch("/api/protheus/pull", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      s.setPullError(data.error || "Erro ao atualizar do Protheus");
      return;
    }

    s.setPullResults(data.resultados);
    const teveSucesso = data.resultados?.some((r: PullEntityResult) => !r.erro);
    if ((data.success || teveSucesso) && onSuccess) {
      onSuccess();
    }
  } catch {
    s.setPullError("Falha ao conectar com o servidor");
  } finally {
    s.setPulling(false);
  }
}
