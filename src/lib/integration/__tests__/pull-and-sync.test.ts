import { beforeEach, describe, expect, it, vi } from "vitest";
import { pullAndSyncFromProtheus } from "../pull-and-sync";

const {
  getProtheusClientMock,
  transactionMock,
  syncLogCreateMock,
  syncClientesMock,
  syncFaturamentosMock,
  syncContasReceberMock,
  syncBaixasMock,
  syncSaldosContabeisMock,
  logApiErrorMock,
} = vi.hoisted(() => ({
  getProtheusClientMock: vi.fn(),
  transactionMock: vi.fn(),
  syncLogCreateMock: vi.fn(),
  syncClientesMock: vi.fn(),
  syncFaturamentosMock: vi.fn(),
  syncContasReceberMock: vi.fn(),
  syncBaixasMock: vi.fn(),
  syncSaldosContabeisMock: vi.fn(),
  logApiErrorMock: vi.fn(),
}));

vi.mock("../protheus-client-factory", () => ({ getProtheusClient: getProtheusClientMock }));
vi.mock("../sync-engine", () => ({
  syncClientes: syncClientesMock,
  syncFaturamentos: syncFaturamentosMock,
  syncContasReceber: syncContasReceberMock,
  syncBaixas: syncBaixasMock,
  syncSaldosContabeis: syncSaldosContabeisMock,
}));
vi.mock("@/lib/db/prisma-client", () => ({
  prisma: {
    $transaction: transactionMock,
    syncLog: { create: syncLogCreateMock },
  },
}));
vi.mock("@/lib/utils/logger", () => ({ logApiError: logApiErrorMock }));

const RESULTADO_OK = { entidade: "Cliente", processados: 1, criados: 1, atualizados: 0, erros: 0 };

function clientCom(rows: Partial<Record<"Clientes" | "Faturamentos" | "ContasReceber" | "Baixas" | "SaldosContabeis", unknown[]>>) {
  return {
    fetchClientes: vi.fn().mockResolvedValue(rows.Clientes ?? []),
    fetchFaturamentos: vi.fn().mockResolvedValue(rows.Faturamentos ?? []),
    fetchContasReceber: vi.fn().mockResolvedValue(rows.ContasReceber ?? []),
    fetchBaixas: vi.fn().mockResolvedValue(rows.Baixas ?? []),
    fetchSaldosContabeis: vi.fn().mockResolvedValue(rows.SaldosContabeis ?? []),
  };
}

describe("pullAndSyncFromProtheus (pull-and-sync.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    syncClientesMock.mockResolvedValue(RESULTADO_OK);
    syncFaturamentosMock.mockResolvedValue(RESULTADO_OK);
    syncContasReceberMock.mockResolvedValue(RESULTADO_OK);
    syncBaixasMock.mockResolvedValue(RESULTADO_OK);
    syncSaldosContabeisMock.mockResolvedValue(RESULTADO_OK);
    syncLogCreateMock.mockResolvedValue({});
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({ syncLog: { create: syncLogCreateMock } })
    );
  });

  it("processa as 4 entidades na ordem Cliente → Faturamento → ContaReceber → Baixa", async () => {
    getProtheusClientMock.mockResolvedValue(
      clientCom({
        Clientes: [
          { A1_COD: "000001", A1_LOJA: "01", A1_NOME: "CLIENTE A" },
          { A1_COD: "000002", A1_LOJA: "01", A1_NOME: "CLIENTE B", D_E_L_E_T_: "*" },
        ],
        Faturamentos: [{ F2_FILIAL: "01", F2_DOC: "000100", F2_CLIENTE: "000001", F2_LOJA: "01", F2_EMISSAO: "20260115", F2_VALOR: "1500.75" }],
        ContasReceber: [{ E1_FILIAL: "01", E1_PREFIXO: "FAT", E1_NUM: "000100", E1_PARCELA: "A", E1_CLIENTE: "000001", E1_LOJA: "01", E1_VENCTO: "20260210", E1_VALOR: "350.5" }],
        Baixas: [],
        SaldosContabeis: [],
      })
    );

    const resultados = await pullAndSyncFromProtheus("emp-01");

    expect(getProtheusClientMock).toHaveBeenCalledWith("emp-01");
    expect(resultados.map((r) => r.entidade)).toEqual(["Cliente", "Faturamento", "ContaReceber", "Baixa", "SaldoContabil"]);
    expect(resultados[0].registros).toBe(1);
    expect(resultados[2].registros).toBe(1);

    const clienteRegistros = syncClientesMock.mock.calls[0][2] as Array<{ externalId: string }>;
    expect(clienteRegistros.map((r) => r.externalId)).toEqual(["emp-01-CLI-000001-01"]);

    const tituloRegistros = syncContasReceberMock.mock.calls[0][2] as Array<{ dueDate: string; partyExternalId: string }>;
    expect(tituloRegistros[0]).toMatchObject({
      partyExternalId: "emp-01-CLI-000001-01",
      dueDate: "2026-02-10T00:00:00.000Z",
    });
  });

  it("registra um SyncLog de sucesso por entidade, com operacao manual_pull", async () => {
    getProtheusClientMock.mockResolvedValue(clientCom({ Clientes: [{ A1_COD: "000001", A1_LOJA: "01", A1_NOME: "A" }] }));

    await pullAndSyncFromProtheus("emp-01");

    expect(syncLogCreateMock).toHaveBeenCalledTimes(5);
    expect(
      syncLogCreateMock.mock.calls.map(([args]) => (args as { data: { entidade: string } }).data.entidade)
    ).toEqual(["Cliente", "Faturamento", "ContaReceber", "Baixa", "SaldoContabil"]);
    expect(syncLogCreateMock).toHaveBeenCalledWith({
      data: {
        empresaId: "emp-01",
        entidade: "Cliente",
        operacao: "manual_pull",
        idempotencyKey: expect.stringMatching(/^pull-Cliente-\d+$/),
        status: "success",
        mensagem: "Atualizacao manual: 1 processados, 1 criados, 0 atualizados, 0 erros",
        tentativas: 1,
      },
    });
  });

  it("captura falha de uma entidade, grava SyncLog de erro e continua com as demais", async () => {
    const client = clientCom({ Faturamentos: [{ F2_FILIAL: "01", F2_DOC: "000100", F2_VALOR: "10" }] });
    client.fetchClientes.mockRejectedValue(new Error("conexao recusada"));
    getProtheusClientMock.mockResolvedValue(client);

    const resultados = await pullAndSyncFromProtheus("emp-01");

    expect(logApiErrorMock).toHaveBeenCalledWith(
      "Erro ao puxar/sincronizar Cliente do Protheus",
      expect.any(Error)
    );
    expect(syncLogCreateMock).toHaveBeenCalledWith({
      data: {
        empresaId: "emp-01",
        entidade: "Cliente",
        operacao: "manual_pull",
        idempotencyKey: expect.stringMatching(/^pull-Cliente-\d+$/),
        status: "error",
        categoriaErro: "protheus_unreachable",
        mensagem: "conexao recusada",
        tentativas: 1,
      },
    });

    expect(resultados[0]).toEqual({
      entidade: "Cliente",
      registros: 0,
      sync: { entidade: "Cliente", processados: 0, criados: 0, atualizados: 0, erros: 1 },
      erro: "conexao recusada",
    });

    expect(client.fetchFaturamentos).toHaveBeenCalled();
    expect(syncFaturamentosMock).toHaveBeenCalledTimes(1);
    expect(resultados).toHaveLength(5);
    expect(resultados[1].erro).toBeUndefined();
  });

  it("não propaga erro quando o SyncLog de falha também não consegue ser gravado", async () => {
    const client = clientCom({});
    client.fetchClientes.mockRejectedValue(new Error("conexao recusada"));
    getProtheusClientMock.mockResolvedValue(client);
    syncLogCreateMock.mockImplementation((args: { data: { categoriaErro?: string } }) =>
      args.data.categoriaErro
        ? Promise.reject(new Error("log indisponivel"))
        : Promise.resolve({})
    );

    const resultados = await pullAndSyncFromProtheus("emp-01");

    expect(resultados).toHaveLength(5);
    expect(resultados[0].erro).toBe("conexao recusada");
    expect(resultados[1].erro).toBeUndefined();
  });

  it("sincroniza dentro da transação, com o mesmo tx usado pelo SyncLog", async () => {
    getProtheusClientMock.mockResolvedValue(clientCom({ Clientes: [{ A1_COD: "000001", A1_LOJA: "01", A1_NOME: "A" }] }));

    await pullAndSyncFromProtheus("emp-01");

    const tx = syncClientesMock.mock.calls[0][0] as { syncLog?: { create: unknown } };
    expect(typeof transactionMock.mock.calls[0][0]).toBe("function");
    expect(tx.syncLog?.create).toBe(syncLogCreateMock);
  });

  it("propaga o erro quando o próprio client não pode ser obtido (fora do try por entidade)", async () => {
    getProtheusClientMock.mockRejectedValue(new Error("sem credencial"));

    await expect(pullAndSyncFromProtheus("emp-01")).rejects.toThrow("sem credencial");
    expect(transactionMock).not.toHaveBeenCalled();
    expect(syncLogCreateMock).not.toHaveBeenCalled();
  });
});
