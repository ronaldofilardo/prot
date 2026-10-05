import type {
  FaturamentoComCliente,
  ContaReceberComClienteEBaixas,
} from "@/lib/types/dashboard";
import type { DashboardFilters } from "@/lib/types/dashboard";

export interface FilialMap {
  [empresaId: string]: string;
}

export function filtrarFaturamentos(
  faturamentos: FaturamentoComCliente[],
  filters: DashboardFilters,
  filialMap?: FilialMap,
): FaturamentoComCliente[] {
  let resultado = faturamentos;

  if (filters.empresaIds && filters.empresaIds.length > 0 && filialMap) {
    const codigosFiliais = filters.empresaIds
      .map((id) => filialMap[id])
      .filter(Boolean);

    if (codigosFiliais.length > 0) {
      resultado = resultado.filter((f) => codigosFiliais.includes(f.filial));
    }
  }

  if (filters.cliente) {
    const termo = filters.cliente.toLowerCase().trim();
    resultado = resultado.filter(
      (f) =>
        f.cliente.nome.toLowerCase().includes(termo) ||
        f.cliente.codigo.toLowerCase().includes(termo) ||
        f.clienteId === filters.cliente ||
        ("id" in f.cliente && f.cliente.id === filters.cliente),
    );
  }

  if (filters.dataInicial || filters.dataFinal) {
    const init = filters.dataInicial ? new Date(filters.dataInicial) : null;
    const fim = filters.dataFinal
      ? new Date(filters.dataFinal + "T23:59:59.999Z")
      : null;

    resultado = resultado.filter((fat) => {
      const d = new Date(fat.dataEmissao);
      return (!init || d >= init) && (!fim || d <= fim);
    });
  }

  return resultado;
}

export function filtrarContasReceber(
  contas: ContaReceberComClienteEBaixas[],
  filters: DashboardFilters,
): ContaReceberComClienteEBaixas[] {
  let resultado = contas;

  if (filters.cliente) {
    const termo = filters.cliente.toLowerCase().trim();
    resultado = resultado.filter(
      (c) =>
        c.cliente.nome.toLowerCase().includes(termo) ||
        c.cliente.codigo.toLowerCase().includes(termo) ||
        c.clienteId === filters.cliente ||
        ("id" in c.cliente && c.cliente.id === filters.cliente),
    );
  }

  return resultado;
}
