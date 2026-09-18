import { describe, it, expect } from "vitest";
import {
  buildFaturamentoMes,
  buildFaturamentoCliente,
  buildRegiaoParticipacao,
  buildTabelaNotas,
} from "../metrics-grouping";
import type { Faturamento } from "@/lib/types/dashboard";

describe("Agrupamento de Faturamentos (metrics-grouping)", () => {
  const faturamentosMock: Faturamento[] = [
    {
      id: "fat-1",
      filial: "01",
      numeroNota: "NF-01",
      dataEmissao: "2026-01-15T10:00:00Z",
      valorTotal: 500,
      clienteId: "c1",
      empresaId: "e1",
      cliente: { id: "c1", nome: "Cliente Alpha", codigo: "A1", estado: "SP" },
    },
    {
      id: "fat-2",
      filial: "01",
      numeroNota: "NF-02",
      dataEmissao: "2026-01-20T10:00:00Z",
      valorTotal: 700,
      clienteId: "c1",
      empresaId: "e1",
      cliente: { id: "c1", nome: "Cliente Alpha", codigo: "A1", estado: "SP" },
    },
    {
      id: "fat-3",
      filial: "01",
      numeroNota: "NF-03",
      dataEmissao: "2026-02-10T10:00:00Z",
      valorTotal: 1200,
      clienteId: "c2",
      empresaId: "e1",
      cliente: { id: "c2", nome: "Cliente Beta", codigo: "B1", estado: "RJ" },
    },
  ];

  it("agrupa faturamento por mês em ordem cronológica", () => {
    const porMes = buildFaturamentoMes(faturamentosMock);
    expect(porMes).toHaveLength(2);
    expect(porMes[0].mes).toBe("Jan/2026");
    expect(porMes[0].valor).toBe(1200);
    expect(porMes[1].mes).toBe("Fev/2026");
    expect(porMes[1].valor).toBe(1200);
  });

  it("agrupa faturamento por cliente ordenado por maior valor", () => {
    const porCliente = buildFaturamentoCliente(faturamentosMock);
    expect(porCliente).toHaveLength(2);
    expect(porCliente[0].nome).toBe("Cliente Alpha");
    expect(porCliente[0].valor).toBe(1200);
  });

  it("agrupa por estado/região de faturamento", () => {
    const porRegiao = buildRegiaoParticipacao(faturamentosMock);
    expect(porRegiao).toHaveLength(2);
    expect(porRegiao[0].nome).toBe("SP");
    expect(porRegiao[0].valor).toBe(1200);
  });

  it("monta tabela das últimas notas ordenadas por data descrescente", () => {
    const tabela = buildTabelaNotas(faturamentosMock);
    expect(tabela).toHaveLength(3);
    expect(tabela[0].numeroNota).toBe("NF-03"); // Mais recente (fevereiro)
  });
});
