import type {
  FaturamentoComCliente,
  ContaReceberComClienteEBaixas,
} from "@/lib/types/dashboard";
import type { DashboardFilters } from "@/lib/types/dashboard";

export interface FilialMap {
  [empresaId: string]: string;
}

function filterByEmpresaIds(faturamentos: FaturamentoComCliente[], filters: DashboardFilters, filialMap?: FilialMap) {
  if (!filters.empresaIds || filters.empresaIds.length === 0 || !filialMap) return faturamentos;
  const codigosFiliais = filters.empresaIds.map((id) => filialMap[id]).filter(Boolean);
  if (codigosFiliais.length === 0) return faturamentos;
  return faturamentos.filter((f) => codigosFiliais.includes(f.filial));
}

function filterByCliente(faturamentos: FaturamentoComCliente[], filters: DashboardFilters) {
  if (!filters.cliente) return faturamentos;
  const termo = filters.cliente.toLowerCase().trim();
  return faturamentos.filter(
    (f) =>
      f.cliente.nome.toLowerCase().includes(termo) ||
      f.cliente.codigo.toLowerCase().includes(termo) ||
      f.clienteId === filters.cliente ||
      ("id" in f.cliente && f.cliente.id === filters.cliente),
  );
}

function filterByDateRange(faturamentos: FaturamentoComCliente[], filters: DashboardFilters) {
  if (!filters.dataInicial && !filters.dataFinal) return faturamentos;
  const init = filters.dataInicial ? new Date(filters.dataInicial) : null;
  const fim = filters.dataFinal ? new Date(filters.dataFinal + "T23:59:59.999Z") : null;
  return faturamentos.filter((fat) => {
    const d = new Date(fat.dataEmissao);
    return (!init || d >= init) && (!fim || d <= fim);
  });
}

export function filtrarFaturamentos(
  faturamentos: FaturamentoComCliente[],
  filters: DashboardFilters,
  filialMap?: FilialMap,
): FaturamentoComCliente[] {
  return filterByDateRange(filterByCliente(filterByEmpresaIds(faturamentos, filters, filialMap), filters), filters);
}

export function filtrarContasReceber(
  contas: ContaReceberComClienteEBaixas[],
  filters: DashboardFilters,
): ContaReceberComClienteEBaixas[] {
  if (filters.cliente) {
    const termo = filters.cliente.toLowerCase().trim();
    return contas.filter(
      (c) =>
        c.cliente.nome.toLowerCase().includes(termo) ||
        c.cliente.codigo.toLowerCase().includes(termo) ||
        c.clienteId === filters.cliente ||
        ("id" in c.cliente && c.cliente.id === filters.cliente),
    );
  }
  return contas;
}