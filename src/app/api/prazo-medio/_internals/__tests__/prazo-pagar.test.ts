import { describe, expect, it } from "vitest";
import { isTipoElegivelPagar, type TituloPagarAgregacao } from "../prazo-pagar-query";
import {
  agruparPrazoPorFornecedor,
  agruparPrazoPagarPorMes,
  extrairTiposConsideradosPagar,
} from "../prazo-pagar-aggregator";
import { Prisma } from "@prisma/client";

describe("prazo-pagar domain & aggregation", () => {
  it("valida elegibilidade de tipos de contas a pagar", () => {
    expect(isTipoElegivelPagar("NF")).toBe(true);
    expect(isTipoElegivelPagar("TF")).toBe(true);
    expect(isTipoElegivelPagar("ADI")).toBe(false);
    expect(isTipoElegivelPagar("PA")).toBe(false);
    expect(isTipoElegivelPagar("NF-")).toBe(false);
    expect(isTipoElegivelPagar("")).toBe(false);
  });

  const titulosMock: TituloPagarAgregacao[] = [
    {
      id: "cp-1",
      filial: "01",
      tipo: "TF",
      dataEmissao: new Date("2026-03-01T00:00:00.000Z"),
      vencimento: new Date("2026-03-31T00:00:00.000Z"),
      valor: new Prisma.Decimal(50000),
      saldo: new Prisma.Decimal(50000),
      fornecedorCodigo: "F001",
      fornecedorLoja: "01",
      fornecedorNome: "Fornecedor Alpha",
    },
    {
      id: "cp-2",
      filial: "01",
      tipo: "TF",
      dataEmissao: new Date("2026-03-01T00:00:00.000Z"),
      vencimento: new Date("2026-04-30T00:00:00.000Z"),
      valor: new Prisma.Decimal(50000),
      saldo: new Prisma.Decimal(50000),
      fornecedorCodigo: "F001",
      fornecedorLoja: "01",
      fornecedorNome: "Fornecedor Alpha",
    },
    {
      id: "cp-3",
      filial: "01",
      tipo: "NF",
      dataEmissao: new Date("2026-04-01T00:00:00.000Z"),
      vencimento: new Date("2026-04-21T00:00:00.000Z"),
      valor: new Prisma.Decimal(20000),
      saldo: new Prisma.Decimal(20000),
      fornecedorCodigo: "F002",
      fornecedorLoja: "01",
      fornecedorNome: "Fornecedor Beta",
    },
    {
      id: "cp-4",
      filial: "01",
      tipo: "ADI",
      dataEmissao: new Date("2026-04-05T00:00:00.000Z"),
      vencimento: new Date("2026-04-05T00:00:00.000Z"),
      valor: new Prisma.Decimal(5000),
      saldo: new Prisma.Decimal(5000),
      fornecedorCodigo: "F001",
      fornecedorLoja: "01",
      fornecedorNome: "Fornecedor Alpha",
    },
  ];

  it("agrupa PMP por fornecedor calculando prazo ponderado", () => {
    const elegiveis = titulosMock.filter((t) => isTipoElegivelPagar(t.tipo));
    const porFornecedor = agruparPrazoPorFornecedor(elegiveis);

    expect(porFornecedor).toHaveLength(2);
    // Alpha: 50k a 30 dias + 50k a 60 dias = média 45 dias
    expect(porFornecedor[0].fornecedorCodigo).toBe("F001");
    expect(porFornecedor[0].valorTotal).toBe(100000);
    expect(porFornecedor[0].pmpConcedido).toBe(45);
    expect(porFornecedor[0].quantidadeTitulos).toBe(2);

    // Beta: 20k a 20 dias
    expect(porFornecedor[1].fornecedorCodigo).toBe("F002");
    expect(porFornecedor[1].valorTotal).toBe(20000);
    expect(porFornecedor[1].pmpConcedido).toBe(20);
    expect(porFornecedor[1].quantidadeTitulos).toBe(1);
  });

  it("agrupa PMP por mês", () => {
    const elegiveis = titulosMock.filter((t) => isTipoElegivelPagar(t.tipo));
    const meses = agruparPrazoPagarPorMes(elegiveis);

    expect(meses.has("2026-03")).toBe(true);
    expect(meses.get("2026-03")?.pmpConcedido).toBe(45);
    expect(meses.get("2026-03")?.valorTitulosPagar).toBe(100000);

    expect(meses.has("2026-04")).toBe(true);
    expect(meses.get("2026-04")?.pmpConcedido).toBe(20);
    expect(meses.get("2026-04")?.valorTitulosPagar).toBe(20000);
  });

  it("extrai tipos considerados em contas a pagar", () => {
    const tipos = extrairTiposConsideradosPagar(titulosMock, isTipoElegivelPagar);
    expect(tipos).toHaveLength(3);
    const tf = tipos.find((t) => t.tipo === "TF");
    expect(tf?.considerado).toBe(true);
    expect(tf?.quantidade).toBe(2);
    expect(tf?.total).toBe(100000);

    const adi = tipos.find((t) => t.tipo === "ADI");
    expect(adi?.considerado).toBe(false);
    expect(adi?.quantidade).toBe(1);
    expect(adi?.total).toBe(5000);
  });

  it("calcula PMP Realizado e atraso por fornecedor e mês com baixas a pagar", () => {
    const elegiveis = titulosMock.filter((t) => isTipoElegivelPagar(t.tipo));
    const baixasMock = [
      {
        id: "bxp-1",
        filial: "01",
        tipo: "TF",
        valorBaixa: new Prisma.Decimal(50000),
        dataBaixa: new Date("2026-04-05T00:00:00.000Z"),
        contaPagar: {
          id: "cp-1",
          dataEmissao: new Date("2026-03-01T00:00:00.000Z"),
          vencimento: new Date("2026-03-31T00:00:00.000Z"),
          fornecedorCodigo: "F001",
          fornecedorLoja: "01",
          fornecedorNome: "Fornecedor Alpha",
        },
      },
    ];

    const porForn = agruparPrazoPorFornecedor(elegiveis, baixasMock);
    const alpha = porForn.find((f) => f.fornecedorCodigo === "F001");
    expect(alpha).toBeDefined();
    // Emissão 2026-03-01 até baixa 2026-04-05 = 35 dias
    expect(alpha?.pmpRealizado).toBe(35);
    // Vencimento 2026-03-31 até baixa 2026-04-05 = 5 dias de atraso
    expect(alpha?.atrasoMedio).toBe(5);
    expect(alpha?.quantidadeBaixas).toBe(1);

    const meses = agruparPrazoPagarPorMes(elegiveis, baixasMock);
    const abril = meses.get("2026-04");
    expect(abril?.pmpRealizado).toBe(35);
    expect(abril?.valorBaixasPagar).toBe(50000);
  });
});

