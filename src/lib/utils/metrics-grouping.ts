import type {
  Faturamento,
  FaturamentoMes,
  FaturamentoCliente,
  RegiaoParticipacao,
  FaturamentoItemDTO,
} from "@/lib/types/dashboard";
import { formatMesAno } from "./metrics-projection";

export function buildFaturamentoMes(faturamentosFiltrados: Faturamento[]): FaturamentoMes[] {
  const mesMap = new Map<string, { orderKey: string; mes: string; valor: number }>();

  for (const f of faturamentosFiltrados) {
    const d = new Date(f.dataEmissao);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const orderKey = `${year}-${month}`;
    const label = formatMesAno(d);

    const existing = mesMap.get(orderKey);
    if (existing) {
      existing.valor += Number(f.valorTotal);
    } else {
      mesMap.set(orderKey, { orderKey, mes: label, valor: Number(f.valorTotal) });
    }
  }

  return Array.from(mesMap.values())
    .sort((a, b) => a.orderKey.localeCompare(b.orderKey))
    .map((m) => ({ mes: m.mes, valor: Math.round(m.valor * 100) / 100 }));
}

export function buildFaturamentoCliente(faturamentosFiltrados: Faturamento[]): FaturamentoCliente[] {
  const clienteMap = new Map<string, { nome: string; valor: number }>();
  for (const f of faturamentosFiltrados) {
    const nome = f.cliente.nome;
    const current = clienteMap.get(nome) || { nome, valor: 0 };
    current.valor += Number(f.valorTotal);
    clienteMap.set(nome, current);
  }
  return Array.from(clienteMap.values())
    .map((c) => ({ nome: c.nome, valor: Math.round(c.valor * 100) / 100 }))
    .sort((a, b) => b.valor - a.valor);
}

export function buildRegiaoParticipacao(faturamentosFiltrados: Faturamento[]): RegiaoParticipacao[] {
  const regiaoMap = new Map<string, { nome: string; valor: number }>();
  for (const f of faturamentosFiltrados) {
    const estado = f.cliente.estado?.trim() || "Outros";
    const current = regiaoMap.get(estado) || { nome: estado, valor: 0 };
    current.valor += Number(f.valorTotal);
    regiaoMap.set(estado, current);
  }
  return Array.from(regiaoMap.values())
    .map((r) => ({ nome: r.nome, valor: Math.round(r.valor * 100) / 100 }))
    .sort((a, b) => b.valor - a.valor);
}

export function buildTabelaNotas(faturamentosFiltrados: Faturamento[]): FaturamentoItemDTO[] {
  return faturamentosFiltrados
    .slice()
    .sort((a, b) => new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime())
    .slice(0, 10)
    .map((f) => ({
      id: f.id,
      numeroNota: f.numeroNota,
      clienteNome: f.cliente.nome,
      clienteCodigo: f.cliente.codigo,
      dataEmissao: f.dataEmissao,
      valorTotal: Number(f.valorTotal),
    }));
}
