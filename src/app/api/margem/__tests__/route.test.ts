import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

const mocks = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  carregarHierarquiasMock: vi.fn(),
  carregarItensMargemMock: vi.fn(),
  logApiErrorMock: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSessionMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/utils/logger", () => ({ logApiError: mocks.logApiErrorMock }));
vi.mock("../../dashboard/_internals/dashboard-query", () => ({
  carregarHierarquias: mocks.carregarHierarquiasMock,
}));
vi.mock("../_internals/margem-query", () => ({
  carregarItensMargem: mocks.carregarItensMargemMock,
}));

describe("GET /api/margem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 se o usuário não estiver autenticado", async () => {
    mocks.getServerSessionMock.mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/margem");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("retorna 200 com métricas e clientes agregados", async () => {
    mocks.getServerSessionMock.mockResolvedValue({
      user: { empresaId: "emp-01", usuarioId: "usr-01" },
    });
    mocks.carregarHierarquiasMock.mockResolvedValue({ hierarquias: [] });
    mocks.carregarItensMargemMock.mockResolvedValue([
      {
        id: "it-1",
        dataEmissao: new Date("2026-03-15T00:00:00.000Z"),
        valorTotal: "1000",
        custo: "600",
        clienteId: "cli-1",
        cliente: { codigo: "001", loja: "01", nome: "Alpha LTDA" },
      },
      {
        id: "it-2",
        dataEmissao: new Date("2026-03-20T00:00:00.000Z"),
        valorTotal: "500",
        custo: "0",
        clienteId: "cli-2",
        cliente: { codigo: "002", loja: "01", nome: "Beta SA" },
      },
    ]);

    const req = new Request("http://localhost:3000/api/margem?filial=01");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.kpis.receitaTotal).toBe(1500);
    expect(data.kpis.custoTotal).toBe(600);
    expect(data.kpis.margemBrutaValor).toBe(900);
    expect(data.kpis.margemBrutaPercentual).toBe(40);
    expect(data.kpis.coberturaCustoPercentual).toBeCloseTo(66.67, 2);
    expect(data.porCliente).toHaveLength(2);
    expect(data.evolucaoTemporal).toHaveLength(1);
    expect(data.evolucaoTemporal[0].competencia).toBe("2026-03");
  });
});
