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

function makeTx(clientes: unknown[] = [], faturamentos: unknown[] = [], contas: unknown[] = []): TxMock {
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
  return { id, nome: "Matriz Norte", cnpj: "11.111.111/0001-11", matrizId: null, filiais, matriz: null };
}

describe("API /api/dashboard GET (route.ts) — escopo de empresas e grupos", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getServerSessionMock.mockResolvedValue(sessaoCom("emp-01", "usr-1"));
    empresaFindUniqueMock.mockResolvedValue(matrizIndependente());
    acessosFindManyMock.mockResolvedValue([]);
    resolveIdsPermitidosTotalMock.mockReturnValue(["emp-01"]);
    resolveEmpresaIdsConsultaMock.mockReturnValue(["emp-01"]);
    withEmpresaRLSMock.mockImplementation(async (id: string, fn: (tx: TxMock) => Promise<unknown>) => {
      return fn(makeTx());
    });
    filtrarFaturamentosMock.mockReturnValue([{ clienteId: "cli-1" }, { clienteId: "cli-1" }, { clienteId: "cli-2" }]);
    filtrarContasReceberMock.mockReturnValue([]);
    calcularKPIsMock.mockReturnValue({ faturamentoTotal: 100, valorVencido: 10, ticketMedio: 50 });
    buildFaturamentoMesMock.mockReturnValue([{ mes: "2026-01", valor: 100 }]);
    buildTabelaNotasMock.mockReturnValue([{ id: "nota-1" }]);
    buildFaturamentoClienteMock.mockReturnValue([{ nome: "Cliente", valor: 100 }]);
    buildRegiaoParticipacaoMock.mockReturnValue([{ nome: "SP", valor: 100 }]);
    buildProjecaoMock.mockReturnValue([{ mes: "2026-01", real: 100, projetado: 120 }]);
    buildGruposEmpresaMock.mockReturnValue([{ id: "emp-01", nome: "Matriz Norte", cnpj: "11.111.111/0001-11", filiais: [] }]);
  });

  it("carrega acessos extras do usuario e soma os ids no carregamento de empresas", async () => {
    empresaFindUniqueMock.mockResolvedValue(null);
    acessosFindManyMock.mockResolvedValue([{ empresaId: "emp-extra" }]);

    await GET(new Request("http://localhost/api/dashboard"));

    expect(acessosFindManyMock).toHaveBeenCalledWith({
      where: { usuarioId: "usr-1" },
      select: { empresaId: true },
    });
    expect(empresaFindUniqueMock).toHaveBeenCalledTimes(2);
    expect(empresaFindUniqueMock.mock.calls.map(([args]) => args.where.id)).toEqual(["emp-01", "emp-extra"]);
  });

  it("não consulta acessos extras quando a sessão não tem usuarioId", async () => {
    getServerSessionMock.mockResolvedValue(sessaoCom("emp-01"));

    await GET(new Request("http://localhost/api/dashboard"));

    expect(acessosFindManyMock).not.toHaveBeenCalled();
    expect(empresaFindUniqueMock).toHaveBeenCalledTimes(1);
  });

  it("ignora empresas inexistentes e cai para [empresaId] quando nenhuma hierarquia carrega", async () => {
    empresaFindUniqueMock.mockResolvedValue(null);

    await GET(new Request("http://localhost/api/dashboard"));

    expect(resolveIdsPermitidosTotalMock).not.toHaveBeenCalled();
    expect(resolveEmpresaIdsConsultaMock).toHaveBeenCalledWith(["emp-01"], []);
    expect(buildGruposEmpresaMock).toHaveBeenCalledWith([]);
  });

  it("usa a própria empresa como matriz quando ela é independente (matrizId null)", async () => {
    empresaFindUniqueMock.mockResolvedValue(matrizIndependente("emp-01", [{ id: "fil-1" }]));

    await GET(new Request("http://localhost/api/dashboard"));

    expect(buildGruposEmpresaMock).toHaveBeenCalledWith([
      { id: "emp-01", nome: "Matriz Norte", cnpj: "11.111.111/0001-11", matrizId: null, filiais: [{ id: "fil-1" }] },
    ]);
  });

  it("usa a matriz da hierarquia quando a empresa da sessão é filial", async () => {
    empresaFindUniqueMock.mockResolvedValue({
      id: "fil-1",
      nome: "Filial Sul",
      cnpj: "22.222.222/0001-22",
      matrizId: "emp-01",
      filiais: [],
      matriz: { id: "emp-01", nome: "Matriz Norte", cnpj: "11.111.111/0001-11", filiais: [{ id: "fil-1" }] },
    });

    await GET(new Request("http://localhost/api/dashboard"));

    expect(buildGruposEmpresaMock).toHaveBeenCalledWith([
      { id: "emp-01", nome: "Matriz Norte", cnpj: "11.111.111/0001-11", matrizId: null, filiais: [{ id: "fil-1" }] },
    ]);
  });

  it("não gera grupo quando a filial foi carregada sem a matriz correspondente", async () => {
    empresaFindUniqueMock.mockResolvedValue({
      id: "fil-1",
      nome: "Filial Órfã",
      cnpj: "22.222.222/0001-22",
      matrizId: "emp-01",
      filiais: [],
      matriz: null,
    });

    await GET(new Request("http://localhost/api/dashboard"));

    expect(buildGruposEmpresaMock).toHaveBeenCalledWith([]);
  });
});
