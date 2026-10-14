import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

import {
  makeTx, sessaoCom, matrizIndependente, type TxMock,
} from "./route-test-utils";

const mocks = vi.hoisted(() => ({
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

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSessionMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db/prisma-client", () => ({
  prisma: {
    empresa: { findUnique: mocks.empresaFindUniqueMock },
    usuarioEmpresaAcesso: { findMany: mocks.acessosFindManyMock },
  },
  withEmpresaRLS: mocks.withEmpresaRLSMock,
}));
vi.mock("@/lib/utils/dashboardMetrics", () => ({
  filtrarFaturamentos: mocks.filtrarFaturamentosMock,
  filtrarContasReceber: mocks.filtrarContasReceberMock,
  calcularKPIs: mocks.calcularKPIsMock,
  buildFaturamentoMes: mocks.buildFaturamentoMesMock,
  buildFaturamentoCliente: mocks.buildFaturamentoClienteMock,
  buildRegiaoParticipacao: mocks.buildRegiaoParticipacaoMock,
  buildProjecao: mocks.buildProjecaoMock,
  buildTabelaNotas: mocks.buildTabelaNotasMock,
}));
vi.mock("@/lib/utils/empresa-grupo-dto", () => ({
  buildGruposEmpresa: mocks.buildGruposEmpresaMock,
}));
vi.mock("@/lib/utils/empresa-grupo", () => ({
  resolveEmpresaIdsConsulta: mocks.resolveEmpresaIdsConsultaMock,
  resolveIdsPermitidosTotal: mocks.resolveIdsPermitidosTotalMock,
}));
vi.mock("@/lib/utils/logger", () => ({ logApiError: mocks.logApiErrorMock }));

describe("API /api/dashboard GET (route.ts)", () => {
  let txs: Array<{ id: string; tx: TxMock }>;

  beforeEach(() => {
    vi.clearAllMocks();
    txs = [];
    mocks.getServerSessionMock.mockResolvedValue(sessaoCom("emp-01", "usr-1"));
    mocks.empresaFindUniqueMock.mockResolvedValue(matrizIndependente());
    mocks.acessosFindManyMock.mockResolvedValue([]);
    mocks.resolveIdsPermitidosTotalMock.mockReturnValue(["emp-01"]);
    mocks.resolveEmpresaIdsConsultaMock.mockReturnValue(["emp-01"]);
    mocks.withEmpresaRLSMock.mockImplementation(
      async (id: string, fn: (tx: TxMock) => Promise<unknown>) => {
        const tx = makeTx();
        txs.push({ id, tx });
        return fn(tx);
      },
    );
    mocks.filtrarFaturamentosMock.mockReturnValue([
      { clienteId: "cli-1" }, { clienteId: "cli-1" }, { clienteId: "cli-2" },
    ]);
    mocks.filtrarContasReceberMock.mockReturnValue([]);
    mocks.calcularKPIsMock.mockReturnValue({
      faturamentoTotal: 100, valorVencido: 10, ticketMedio: 50,
    });
    mocks.buildFaturamentoMesMock.mockReturnValue([{ mes: "2026-01", valor: 100 }]);
    mocks.buildTabelaNotasMock.mockReturnValue([
      {
        id: "nota-1", filial: "01", numeroNota: "NF-001",
        clienteNome: "Cliente", clienteCodigo: "001",
        dataEmissao: "2026-01-15", valorTotal: 100,
      },
    ]);
    mocks.buildFaturamentoClienteMock.mockReturnValue([{ nome: "Cliente", valor: 100 }]);
    mocks.buildRegiaoParticipacaoMock.mockReturnValue([{ nome: "SP", valor: 100 }]);
    mocks.buildProjecaoMock.mockReturnValue([{ mes: "2026-01", real: 100, projetado: 120 }]);
    mocks.buildGruposEmpresaMock.mockReturnValue([
      { id: "emp-01", nome: "Matriz Norte", cnpj: "11.111.111/0001-11", filiais: [] },
    ]);
  });

  it("retorna 401 quando a sessão não tem empresaId", async () => {
    mocks.getServerSessionMock.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/dashboard"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Não autenticado" });
    expect(mocks.empresaFindUniqueMock).not.toHaveBeenCalled();
  });

  it("monta a resposta completa com todos os campos do DashboardResponse", async () => {
    txs.length = 0;
    mocks.withEmpresaRLSMock.mockImplementation(
      async (id: string, fn: (tx: TxMock) => Promise<unknown>) => {
        const tx = makeTx(
          [{ id: "cli-1", nome: "A" }, { id: "cli-2", nome: "B" }],
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
        "clientes", "clientesAtivosFiltrados", "faturamentoCliente",
        "faturamentoMes", "faturamentoTotal", "faturamentos",
        "grupos", "projecao", "regiaoParticipacao",
        "ticketMedio", "totalClientes", "valorVencido",
      ].sort(),
    );
    expect(json.totalClientes).toBe(2);
    expect(json.clientesAtivosFiltrados).toBe(2);
    expect(json.faturamentoTotal).toBe(100);
    expect(json.ticketMedio).toBe(50);
    expect(json.clientes).toHaveLength(2);
    expect(json.faturamentos).toEqual([
      {
        id: "nota-1", filial: "01", numeroNota: "NF-001",
        clienteNome: "Cliente", clienteCodigo: "001",
        dataEmissao: "2026-01-15", valorTotal: 100,
      },
    ]);
    expect(json.grupos).toHaveLength(1);
  });

  it("aplica escopo de tenant em cada consulta (RLS por empresa, ativo:true)", async () => {
    txs.length = 0;
    await GET(new Request("http://localhost/api/dashboard"));

    expect(mocks.withEmpresaRLSMock).toHaveBeenCalledTimes(1);
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
});
