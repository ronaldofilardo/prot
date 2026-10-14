import { vi } from "vitest";
import type { Session } from "next-auth";

export type TxMock = {
  cliente: { findMany: ReturnType<typeof vi.fn> };
  faturamento: { findMany: ReturnType<typeof vi.fn> };
  contaReceber: { findMany: ReturnType<typeof vi.fn> };
};

export function makeTx(
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

export function sessaoCom(empresaId?: string, usuarioId?: string): Session {
  return { user: { empresaId, usuarioId }, expires: "" } as unknown as Session;
}

export function matrizIndependente(id = "emp-01", filiais: unknown[] = []) {
  return {
    id,
    nome: "Matriz Norte",
    cnpj: "11.111.111/0001-11",
    matrizId: null,
    filiais,
    matriz: null,
  };
}

export function setupRouteMocks(mocks: Record<string, ReturnType<typeof vi.fn>>) {
  mocks.empresaFindUniqueMock.mockResolvedValue(matrizIndependente());
  mocks.acessosFindManyMock.mockResolvedValue([]);
  mocks.resolveIdsPermitidosTotalMock.mockReturnValue(["emp-01"]);
  mocks.resolveEmpresaIdsConsultaMock.mockReturnValue(["emp-01"]);
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
}
