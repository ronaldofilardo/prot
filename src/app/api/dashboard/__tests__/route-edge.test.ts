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

describe("API /api/dashboard GET — edge cases (route.ts)", () => {
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
      { id: "nota-1", filial: "01", numeroNota: "NF-001",
        clienteNome: "Cliente", clienteCodigo: "001",
        dataEmissao: "2026-01-15", valorTotal: 100 },
    ]);
    mocks.buildFaturamentoClienteMock.mockReturnValue([{ nome: "Cliente", valor: 100 }]);
    mocks.buildRegiaoParticipacaoMock.mockReturnValue([{ nome: "SP", valor: 100 }]);
    mocks.buildProjecaoMock.mockReturnValue([{ mes: "2026-01", real: 100, projetado: 120 }]);
    mocks.buildGruposEmpresaMock.mockReturnValue([
      { id: "emp-01", nome: "Matriz Norte", cnpj: "11.111.111/0001-11", filiais: [] },
    ]);
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

    expect(mocks.filtrarFaturamentosMock).toHaveBeenCalled();
    const calls = mocks.filtrarFaturamentosMock.mock.calls[0];
    expect(calls[0]).toEqual(expect.any(Array));
    expect(calls[1]).toEqual(filtros);
    expect(mocks.filtrarContasReceberMock).toHaveBeenCalledWith(expect.any(Array), filtros);
    expect(mocks.resolveEmpresaIdsConsultaMock).toHaveBeenCalledWith(["emp-01"], ["fil-1", "fil-2"]);
  });

  it("executa uma consulta RLS por empresa em idsConsulta e mescla os resultados", async () => {
    mocks.resolveEmpresaIdsConsultaMock.mockReturnValue(["emp-01", "emp-02"]);
    txs.length = 0;
    let chamada = 0;
    mocks.withEmpresaRLSMock.mockImplementation(
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
    expect(json.clientes.map((c: { id: string }) => c.id)).toEqual(["cli-1", "cli-2"]);
  });

  it("retorna 500 e registra logApiError quando a consulta RLS falha", async () => {
    mocks.withEmpresaRLSMock.mockRejectedValue(new Error("banco indisponível"));

    const res = await GET(new Request("http://localhost/api/dashboard"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Erro interno" });
    expect(mocks.logApiErrorMock).toHaveBeenCalledWith("Erro ao buscar dados do dashboard", expect.any(Error));
  });
});
