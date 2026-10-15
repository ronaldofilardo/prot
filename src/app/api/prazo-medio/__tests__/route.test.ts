import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

const mocks = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  carregarHierarquiasMock: vi.fn(),
  carregarTitulosReceberMock: vi.fn(),
  carregarBaixasReceberMock: vi.fn(),
  carregarTitulosPagarMock: vi.fn(),
  logApiErrorMock: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSessionMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/utils/logger", () => ({ logApiError: mocks.logApiErrorMock }));
vi.mock("../../dashboard/_internals/dashboard-query", () => ({
  carregarHierarquias: mocks.carregarHierarquiasMock,
}));
vi.mock("../_internals/prazo-medio-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../_internals/prazo-medio-query")>();
  return {
    ...actual,
    carregarTitulosReceber: mocks.carregarTitulosReceberMock,
    carregarBaixasReceber: mocks.carregarBaixasReceberMock,
  };
});
vi.mock("../_internals/prazo-pagar-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../_internals/prazo-pagar-query")>();
  return {
    ...actual,
    carregarTitulosPagar: mocks.carregarTitulosPagarMock,
  };
});

describe("GET /api/prazo-medio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 se o usuário não estiver autenticado", async () => {
    mocks.getServerSessionMock.mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/prazo-medio");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("retorna 200 com kpis de PMR e baixas", async () => {
    mocks.getServerSessionMock.mockResolvedValue({
      user: { empresaId: "emp-01", usuarioId: "usr-01" },
    });
    mocks.carregarHierarquiasMock.mockResolvedValue({ hierarquias: [] });
    mocks.carregarTitulosReceberMock.mockResolvedValue([
      {
        id: "cr-1",
        filial: "01",
        tipo: "DUP",
        dataEmissao: new Date("2026-01-01T00:00:00.000Z"),
        vencimento: new Date("2026-01-31T00:00:00.000Z"),
        valor: "5000",
        clienteId: "cli-1",
        cliente: { codigo: "001", loja: "01", nome: "Cliente Teste" },
      },
    ]);
    mocks.carregarBaixasReceberMock.mockResolvedValue([
      {
        id: "bx-1",
        filial: "01",
        tipo: "DUP",
        valorBaixa: "5000",
        dataBaixa: new Date("2026-01-25T00:00:00.000Z"),
        contaReceber: {
          dataEmissao: new Date("2026-01-01T00:00:00.000Z"),
          vencimento: new Date("2026-01-31T00:00:00.000Z"),
          clienteId: "cli-1",
          cliente: { codigo: "001", loja: "01", nome: "Cliente Teste" },
        },
      },
    ]);
    mocks.carregarTitulosPagarMock.mockResolvedValue([
      {
        id: "cp-1",
        filial: "01",
        tipo: "NF",
        dataEmissao: new Date("2026-01-01T00:00:00.000Z"),
        vencimento: new Date("2026-02-15T00:00:00.000Z"),
        valor: "10000",
        fornecedorCodigo: "F01",
        fornecedorLoja: "01",
        fornecedorNome: "Fornecedor Teste",
      },
    ]);

    const req = new Request("http://localhost:3000/api/prazo-medio?filial=01");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.kpis.pmrConcedido).toBe(30);
    expect(body.kpis.pmrRealizado).toBe(24);
    expect(body.kpis.pmpConcedido).toBe(45);
    expect(body.kpis.atrasoMedio).toBe(-6); // adiantado 6 dias
    expect(body.kpis.percentualAtraso).toBe(0);
    expect(body.porCliente).toHaveLength(1);
    expect(body.porFornecedor).toHaveLength(1);
    expect(body.porFornecedor[0].nome).toBe("Fornecedor Teste");
    expect(body.porFornecedor[0].pmpConcedido).toBe(45);
    expect(body.tiposConsiderados).toHaveLength(1);
    expect(body.tiposConsiderados[0].tipo).toBe("DUP");
    expect(body.tiposConsiderados[0].considerado).toBe(true);
    expect(body.tiposConsideradosPagar).toHaveLength(1);
    expect(body.tiposConsideradosPagar[0].tipo).toBe("NF");
    expect(body.tiposConsideradosPagar[0].considerado).toBe(true);
  });
});
