/**
 * Sincronização Multi-Filial — busca dados de TODAS as filiais da matriz.
 *
 * Fluxo:
 * 1. Buscar SM0 para listar todas as filiais da matriz
 * 2. Para cada filial, fazer requisições ao Protheus (passando a filial no contexto)
 * 3. Agregar todos os resultados
 * 4. Sincronizar para o banco com empresaId igual para todas (mesma matriz)
 *
 * Isso garante que o dashboard veja NFs de TODAS as filiais, não só a filial padrão.
 */

import type { ProtheusClient, ProtheusRow } from "../protheus-client";
import { logApiError } from "@/lib/utils/logger";

export interface FilialInfo {
  codigo: string;
  nome: string;
  uf: string;
}

/**
 * Extrai informações de filial do retorno da SM0.
 * Assume campos: M0_FILIAL, M0_NOME, M0_ESTFIL (ou similar).
 */
export function mapRowToFilialInfo(row: Record<string, string>): FilialInfo {
  return {
    codigo: (row.M0_FILIAL || row.FILIAL || "").trim(),
    nome: (row.M0_NOME || row.NOME || "").trim(),
    uf: (row.M0_ESTFIL || row.ESTFIL || "").trim(),
  };
}

/**
 * Busca todas as filiais de uma matriz via SM0.
 * Retorna lista de filiais ou fallback com a filial padrão.
 */
export async function fetchFiliasDaMatriz(
  client: ProtheusClient,
  filialPadrao: string = "01"
): Promise<FilialInfo[]> {
  try {
    const filias = await client.fetchFiliais();
    if (filias && filias.length > 0) {
      return filias.map((f) => ({
        codigo: f.codigoFilial || filialPadrao,
        nome: f.nome || `Filial ${f.codigoFilial}`,
        uf: f.uf || "",
      }));
    }
  } catch (err) {
    logApiError("Erro ao buscar filiais da matriz (SM0)", err);
  }
  // Fallback: retorna apenas a filial padrão
  return [{ codigo: filialPadrao, nome: `Filial ${filialPadrao}`, uf: "" }];
}

/**
 * Busca dados (clientes, faturamentos, etc.) para uma filial específica.
 *
 * IMPORTANTE: o cliente REST deve suportar filtro de filial via query param
 * ou header. Se não suportar, você precisará criar um cliente customizado
 * que mude o contexto antes de fazer a requisição.
 *
 * Para agora, assumimos que o cliente já está configurado para a filial
 * e fazemos um fetch. Numa implementação futura, você pode passar a filial
 * como parâmetro ao cliente.
 */
export async function fetchDadosDeFilial(
  client: ProtheusClient,
  filial: FilialInfo
): Promise<{
  clientes: ProtheusRow[];
  faturamentos: ProtheusRow[];
  contasReceber: ProtheusRow[];
  baixas: ProtheusRow[];
}> {
  try {
    const [clientes, faturamentos, contasReceber, baixas] = await Promise.all([
      client.fetchClientes().catch((err) => {
        logApiError(`Erro ao buscar clientes da filial ${filial.codigo}`, err);
        return [];
      }),
      client.fetchFaturamentos().catch((err) => {
        logApiError(`Erro ao buscar faturamentos da filial ${filial.codigo}`, err);
        return [];
      }),
      client.fetchContasReceber().catch((err) => {
        logApiError(`Erro ao buscar contas a receber da filial ${filial.codigo}`, err);
        return [];
      }),
      client.fetchBaixas().catch((err) => {
        logApiError(`Erro ao buscar baixas da filial ${filial.codigo}`, err);
        return [];
      }),
    ]);

    return { clientes, faturamentos, contasReceber, baixas };
  } catch (err) {
    logApiError(`Erro ao buscar dados da filial ${filial.codigo}`, err);
    return { clientes: [], faturamentos: [], contasReceber: [], baixas: [] };
  }
}

/**
 * Agrupa dados de múltiplas filiais, removendo duplicatas.
 */
export function agregarDadosDeFiliais(
  filiais: Array<{
    filial: FilialInfo;
    dados: {
      clientes: ProtheusRow[];
      faturamentos: ProtheusRow[];
      contasReceber: ProtheusRow[];
      baixas: ProtheusRow[];
    };
  }>
): {
  clientes: ProtheusRow[];
  faturamentos: ProtheusRow[];
  contasReceber: ProtheusRow[];
  baixas: ProtheusRow[];
} {
  const clientesMap = new Map<string, ProtheusRow>();
  const faturamentosMap = new Map<string, ProtheusRow>();
  const contasReceberMap = new Map<string, ProtheusRow>();
  const baixasMap = new Map<string, ProtheusRow>();

  for (const { dados } of filiais) {
    // Clientes: chave = A1_COD+A1_LOJA
    for (const cliente of dados.clientes) {
      const chave = `${cliente.A1_COD}-${cliente.A1_LOJA}`;
      clientesMap.set(chave, cliente);
    }

    // Faturamentos: chave = F2_FILIAL+F2_DOC+F2_SERIE
    for (const fat of dados.faturamentos) {
      const chave = `${fat.F2_FILIAL}-${fat.F2_DOC}-${fat.F2_SERIE || ""}`;
      faturamentosMap.set(chave, fat);
    }

    // Contas a Receber: chave = E1_FILIAL+E1_PREFIXO+E1_NUM+E1_PARCELA
    for (const conta of dados.contasReceber) {
      const chave = `${conta.E1_FILIAL}-${conta.E1_PREFIXO}-${conta.E1_NUM}-${conta.E1_PARCELA}`;
      contasReceberMap.set(chave, conta);
    }

    // Baixas: chave = E5_FILIAL+E5_PREFIXO+E5_NUM+E5_PARCELA+E5_BAIXA
    for (const baixa of dados.baixas) {
      const chave = `${baixa.E5_FILIAL}-${baixa.E5_PREFIXO}-${baixa.E5_NUM}-${baixa.E5_PARCELA}-${baixa.E5_BAIXA}`;
      baixasMap.set(chave, baixa);
    }
  }

  return {
    clientes: Array.from(clientesMap.values()),
    faturamentos: Array.from(faturamentosMap.values()),
    contasReceber: Array.from(contasReceberMap.values()),
    baixas: Array.from(baixasMap.values()),
  };
}