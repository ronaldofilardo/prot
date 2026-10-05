import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { GET } from "../route";

const {
  getServerSessionMock,
  empresaFindUniqueMock,
  acessosFindManyMock,
  withEmpresaRLSMock,
  filtrarFaturamentosMock,
  filtrarContasReceberMock,
  calcularKPIsMock,
  buildFaturamentoMesMock,
  buildTabelaNotasMock,
  buildFaturamentoClienteMock,
  buildRegiaoParticipacaoMock,
  buildProjecaoMock,
  buildGruposEmpresaMock,
  resolveIdsPermitidosTotalMock,
  resolveEmpresaIdsConsultaMock,
  logApiErrorMock,
} = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  empresaFindUniqueMock: vi.fn(),
  acessosFindManyMock: vi.fn(),
  withEmpresaRLSMock: vi.fn(),
  filtrarFaturamentosMock: vi.fn(),
  filtrarContasReceberMock: vi.fn(),
  calcularKPIsMock: vi.fn(),
  buildFaturamentoMesMock: vi.fn(),
  buildTabelaNotasMock: vi.fn(),
  buildFaturamentoClienteMock: vi.fn(),
  buildRegiaoParticipacaoMock: vi.fn(),
  buildProjecaoMock: vi.fn(),
  buildGruposEmpresaMock: vi.fn(),
  resolveIdsPermitidosTotalMock: vi.fn(),
  resolveEmpresaIdsConsultaMock: vi.fn(),
  logApiErrorMock: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db/prisma-client", () => ({
  prisma: {
    empresa: { findUnique: empresaFindUniqueMock },
    usuarioEmpresaAcesso: { findMany: acessosFindManyMock },
  },
  withEmpresaRLS: withEmpresaRLSMock,
}));
vi.mock("@/lib/utils/dashboardMetrics", () => ({
  filtrarFaturamentos: filtrarFaturamentosMock,
  filtrarContasReceber: filtrarContasReceberMock,
  calcularKPIs: calcularKPIsMock,
  buildFaturamentoMes: buildFaturamentoMesMock,
  buildFaturamentoCliente: buildFaturamentoClienteMock,
  buildRegiaoParticipacao: buildRegiaoParticipacaoMock,
  buildProjecao: buildProjecaoMock,
  buildTabelaNotas: buildTabelaNotasMock,
}));
vi.mock("@/lib/utils/empresa-grupo-dto", () => ({
  buildGruposEmpresa: buildGruposEmpresaMock,
}));
vi.mock("@/lib/utils/empresa-grupo", () => ({
  resolveEmpresaIdsConsulta: resolveEmpresaIdsConsultaMock,
  resolveIdsPermitidosTotal: resolveIdsPermitidosTotalMock,
}));
vi.mock("@/lib/utils/logger", () => ({ logApiError: logApiErrorMock }));

type TxMock = {
  cliente: { findMany: ReturnType<typeof vi.fn> };
  faturamento: { findMany: ReturnType<typeof vi.fn> };
  contaReceber: { findMany: ReturnType<typeof vi.fn> };
};

function makeTx(
  clientes: unknown[] = [],
  faturamentos: unknown[] = [],
  contas: unknown[] = [],
): TxMock {
  return {
    cliente: { findMany: vi.fn().mockResolvedValue(clientes) },
    faturamento: { findMany: vi.fn().mockResolvedValue(faturamentos) },
    contaReceber: { findMany: vi.fn().mockResolvedValue(contas) },
  };
}

function sessaoCom(empresaId?: string, usuarioId?: string): Session {
  return { user: { empresaId, usuarioId }, expires: "" } as unknown as Session;
}

function matrizIndependente(id = "emp-01", filiais: unknown[] = []) {
  return {
    id,
    nome: "Matriz Norte",
    cnpj: "11.111.111/0001-11",
    matrizId: null,
    filiais,
    matriz: null,
  };
}

describe("API /api/dashboard GET (route.ts)", () => {
  let txs: Array<{ id: string; tx: TxMock }>;

  beforeEach(() => {
    vi.clearAllMocks();
    txs = [];

    getServerSessionMock.mockResolvedValue(sessaoCom("emp-01", "usr-1"));
    empresaFindUniqueMock.mockResolvedValue(matrizIndependente());
    acessosFindManyMock.mockResolvedValue([]);
    resolveIdsPermitidosTotalMock.mockReturnValue(["emp-01"]);
    resolveEmpresaIdsConsultaMock.mockReturnValue(["emp-01"]);
    withEmpresaRLSMock.mockImplementation(
      async (id: string, fn: (tx: TxMock) => Promise<unknown>) => {
        const tx = makeTx();
        txs.push({ id, tx });
        return fn(tx);
      },
    );
    filtrarFaturamentosMock.mockReturnValue([
      { clienteId: "cli-1" },
      { clienteId: "cli-1" },
      { clienteId: "cli-2" },
    ]);
    filtrarContasReceberMock.mockReturnValue([]);
    calcularKPIsMock.mockReturnValue({
      faturamentoTotal: 100,
      valorVencido: 10,
      ticketMedio: 50,
    });
    buildFaturamentoMesMock.mockReturnValue([{ mes: "2026-01", valor: 100 }]);
    buildTabelaNotasMock.mockReturnValue([
      {
        id: "nota-1",
        filial: "01",
        numeroNota: "NF-001",
        clienteNome: "Cliente",
        clienteCodigo: "001",
        dataEmissao: "2026-01-15",
        valorTotal: 100,
      },
    ]);
    buildFaturamentoClienteMock.mockReturnValue([
      { nome: "Cliente", valor: 100 },
    ]);
    buildRegiaoParticipacaoMock.mockReturnValue([{ nome: "SP", valor: 100 }]);
    buildProjecaoMock.mockReturnValue([
      { mes: "2026-01", real: 100, projetado: 120 },
    ]);
    buildGruposEmpresaMock.mockReturnValue([
      {
        id: "emp-01",
        nome: "Matriz Norte",
        cnpj: "11.111.111/0001-11",
        filiais: [],
      },
    ]);
  });

  it("retorna 401 quando a sessão não tem empresaId", async () => {
    getServerSessionMock.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/dashboard"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Não autenticado" });
    expect(empresaFindUniqueMock).not.toHaveBeenCalled();
  });

  it("monta a resposta completa com todos os campos do DashboardResponse", async () => {
    txs.length = 0;
    withEmpresaRLSMock.mockImplementation(
      async (id: string, fn: (tx: TxMock) => Promise<unknown>) => {
        const tx = makeTx(
          [
            { id: "cli-1", nome: "A" },
            { id: "cli-2", nome: "B" },
          ],
          [{ id: "fat-1" }],
          [{ id: "cr-1" }],
        );
        txs.push({ id, tx });
        return fn(tx);
      },
    );

    const res = await GET(new Request("http://localhost/api/dashboard"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Object.keys(json).sort()).toEqual(
      [
        "clientes",
        "clientesAtivosFiltrados",
        "faturamentoCliente",
        "faturamentoMes",
        "faturamentoTotal",
        "faturamentos",
        "grupos",
        "projecao",
        "regiaoParticipacao",
        "ticketMedio",
        "totalClientes",
        "valorVencido",
      ].sort(),
    );
    expect(json.totalClientes).toBe(2);
    // Set de clienteId únicos sobre o resultado filtrado
    expect(json.clientesAtivosFiltrados).toBe(2);
    expect(json.faturamentoTotal).toBe(100);
    expect(json.ticketMedio).toBe(50);
    expect(json.clientes).toHaveLength(2);
    expect(json.faturamentos).toEqual([
      {
        id: "nota-1",
        filial: "01",
        numeroNota: "NF-001",
        clienteNome: "Cliente",
        clienteCodigo: "001",
        dataEmissao: "2026-01-15",
        valorTotal: 100,
      },
    ]);
    expect(json.grupos).toHaveLength(1);
  });

  it("aplica escopo de tenant em cada consulta (RLS por empresa, ativo:true)", async () => {
    txs.length = 0;
    await GET(new Request("http://localhost/api/dashboard"));

    expect(withEmpresaRLSMock).toHaveBeenCalledTimes(1);
    expect(txs[0].id).toBe("emp-01");
    expect(txs[0].tx.cliente.findMany).toHaveBeenCalledWith({
      where: { ativo: true, empresaId: "emp-01" },
      orderBy: { nome: "asc" },
    });
    expect(txs[0].tx.faturamento.findMany).toHaveBeenCalledWith({
      where: { empresaId: "emp-01" },
      include: { cliente: true },
      orderBy: { dataEmissao: "asc" },
    });
    expect(txs[0].tx.contaReceber.findMany).toHaveBeenCalledWith({
      where: { empresaId: "emp-01" },
      include: { baixas: true, cliente: true },
      orderBy: { vencimento: "asc" },
    });
  });

  it("converte a query string em filtros e repassa para os builders de métricas", async () => {
    const url =
      "http://localhost/api/dashboard?cliente=ACME&inicial=2026-01-01&final=2026-01-31&matriz=emp-01&empresaId=fil-1&empresaId=fil-2";

    await GET(new Request(url));

    const filtros = {
      cliente: "ACME",
      dataInicial: "2026-01-01",
      dataFinal: "2026-01-31",
      matrizId: "emp-01",
      empresaIds: ["fil-1", "fil-2"],
    };
    expect(filtrarFaturamentosMock).toHaveBeenCalledWith(
      expect.any(Array),
      filtros,
    );
    expect(filtrarContasReceberMock).toHaveBeenCalledWith(
      expect.any(Array),
      filtros,
    );
    expect(resolveEmpresaIdsConsultaMock).toHaveBeenCalledWith(
      ["emp-01"],
      ["fil-1", "fil-2"],
    );
  });

  it("executa uma consulta RLS por empresa em idsConsulta e mescla os resultados", async () => {
    resolveEmpresaIdsConsultaMock.mockReturnValue(["emp-01", "emp-02"]);
    txs.length = 0;
    let chamada = 0;
    withEmpresaRLSMock.mockImplementation(
      async (id: string, fn: (tx: TxMock) => Promise<unknown>) => {
        const tx = makeTx([{ id: `cli-${++chamada}` }]);
        txs.push({ id, tx });
        return fn(tx);
      },
    );

    const res = await GET(new Request("http://localhost/api/dashboard"));
    const json = await res.json();

    expect(txs.map((t) => t.id)).toEqual(["emp-01", "emp-02"]);
    expect(json.totalClientes).toBe(2);
    expect(json.clientes.map((c: { id: string }) => c.id)).toEqual([
      "cli-1",
      "cli-2",
    ]);
  });

  it("retorna 500 e registra logApiError quando a consulta RLS falha", async () => {
    withEmpresaRLSMock.mockRejectedValue(new Error("banco indisponível"));

    const res = await GET(new Request("http://localhost/api/dashboard"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Erro interno" });
    expect(logApiErrorMock).toHaveBeenCalledWith(
      "Erro ao buscar dados do dashboard",
      expect.any(Error),
    );
  });
});
