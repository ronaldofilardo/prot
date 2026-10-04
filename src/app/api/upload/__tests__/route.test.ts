import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { POST } from "../route";

const {
  getServerSessionMock,
  transactionMock,
  syncLogCreateMock,
  syncClientesMock,
  syncFaturamentosMock,
  syncContasReceberMock,
  syncBaixasMock,
  logApiErrorMock,
} = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  transactionMock: vi.fn(),
  syncLogCreateMock: vi.fn(),
  syncClientesMock: vi.fn(),
  syncFaturamentosMock: vi.fn(),
  syncContasReceberMock: vi.fn(),
  syncBaixasMock: vi.fn(),
  logApiErrorMock: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db/prisma-client", () => ({
  prisma: { $transaction: transactionMock },
}));
vi.mock("@/lib/integration/sync-engine", () => ({
  syncClientes: syncClientesMock,
  syncFaturamentos: syncFaturamentosMock,
  syncContasReceber: syncContasReceberMock,
  syncBaixas: syncBaixasMock,
}));
vi.mock("@/lib/utils/logger", () => ({ logApiError: logApiErrorMock }));

const RESULTADO_OK = { entidade: "Cliente", processados: 1, criados: 1, atualizados: 0, erros: 0 };

function sessaoCom(empresaId?: string): Session {
  return { user: { empresaId }, expires: "" } as unknown as Session;
}

function arquivo(nome: string, conteudo: string): File {
  return new File([conteudo], nome, { type: "text/csv" });
}

/** A rota só consome `request.formData()`; o corpo é um FormData real. */
function uploadRequest(files: File[]): Request {
  const formData = new FormData();
  for (const file of files) formData.append("files", file);
  return { formData: async () => formData } as unknown as Request;
}

describe("API /api/upload POST (route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSessionMock.mockResolvedValue(sessaoCom("emp-01"));
    syncClientesMock.mockResolvedValue(RESULTADO_OK);
    syncFaturamentosMock.mockResolvedValue(RESULTADO_OK);
    syncContasReceberMock.mockResolvedValue(RESULTADO_OK);
    syncBaixasMock.mockResolvedValue(RESULTADO_OK);
    syncLogCreateMock.mockResolvedValue({});
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({ syncLog: { create: syncLogCreateMock } })
    );
  });

  it("retorna 401 quando não autenticado", async () => {
    getServerSessionMock.mockResolvedValue(null);

    const res = await POST(uploadRequest([arquivo("c.csv", "A;B")]));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Nao autenticado" });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("retorna 400 quando nenhum arquivo é enviado", async () => {
    const res = await POST(uploadRequest([]));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Nenhum arquivo enviado" });
  });

  it("detecta CSV de Cliente, converte via adapter e sincroniza dentro da transação", async () => {
    const csv = [
      "A1_COD;A1_LOJA;A1_NOME;A1_MUN;A1_EST;D_E_L_E_T_",
      "000001;01;CLIENTE A;SAO PAULO;SP;",
      "000002;02;CLIENTE B;RIO DE JANEIRO;RJ;",
    ].join("\n");

    const res = await POST(uploadRequest([arquivo("clientes.csv", csv)]));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.resultados).toHaveLength(1);
    expect(json.resultados[0]).toMatchObject({
      arquivo: "clientes.csv",
      entidade: "Cliente",
      registros: 2,
    });

    const registros = syncClientesMock.mock.calls[0][2] as Array<{ externalId: string }>;
    expect(registros.map((r) => r.externalId)).toEqual([
      "emp-01-CLI-000001-01",
      "emp-01-CLI-000002-02",
    ]);

    expect(syncLogCreateMock).toHaveBeenCalledWith({
      data: {
        empresaId: "emp-01",
        entidade: "Cliente",
        operacao: "csv_upload",
        idempotencyKey: expect.stringMatching(/^upload-clientes\.csv-\d+$/),
        status: "success",
        mensagem: "clientes.csv: 1 processados, 1 criados, 0 atualizados, 0 erros",
        tentativas: 1,
      },
    });
  });

  it("ignora linhas marcadas como deletadas (D_E_L_E_T_='*')", async () => {
    const csv = [
      "A1_COD;A1_LOJA;A1_NOME;A1_MUN;A1_EST;D_E_L_E_T_",
      "000001;01;CLIENTE A;SAO PAULO;SP;",
      "000002;01;CLIENTE B;RIO;RJ;*",
    ].join("\n");

    const res = await POST(uploadRequest([arquivo("clientes.csv", csv)]));
    const json = await res.json();

    expect(json.resultados[0].registros).toBe(1);
    const registros = syncClientesMock.mock.calls[0][2] as Array<{ externalId: string }>;
    expect(registros).toHaveLength(1);
    expect(registros[0].externalId).toBe("emp-01-CLI-000001-01");
  });

  it.each([
    ["Faturamento", syncFaturamentosMock, "F2_FILIAL;F2_DOC;F2_CLIENTE;F2_LOJA;F2_EMISSAO;F2_VALOR\n01;000100;000001;01;20260115;1500.75"],
    ["ContaReceber", syncContasReceberMock, "E1_FILIAL;E1_PREFIXO;E1_NUM;E1_PARCELA;E1_TIPO;E1_CLIENTE;E1_LOJA;E1_EMISSAO;E1_VENCTO;E1_VALOR\n01;FAT;000100;A;DUP;000001;01;20260110;20260210;350.5"],
    ["Baixa", syncBaixasMock, "E5_FILIAL;E5_PREFIXO;E5_NUM;E5_PARCELA;E5_TIPO;E5_VALOR;E5_BAIXA\n01;FAT;000100;A;DUP;350.5;20260120"],
  ])("detecta CSV de %s e chama o sync correspondente", async (entidade, syncMock, csv) => {
    const res = await POST(uploadRequest([arquivo(`${entidade}.csv`, csv)]));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.resultados[0].entidade).toBe(entidade);
    expect(json.resultados[0].registros).toBe(1);
    expect(syncMock).toHaveBeenCalledTimes(1);
  });

  it("marca o SyncLog como error quando o sync reporta erros", async () => {
    syncClientesMock.mockResolvedValue({
      entidade: "Cliente",
      processados: 1,
      criados: 0,
      atualizados: 0,
      erros: 1,
    });
    const csv = "A1_COD;A1_LOJA;A1_NOME;A1_MUN;A1_EST;D_E_L_E_T_\n000001;01;CLIENTE A;SAO PAULO;SP;";

    await POST(uploadRequest([arquivo("clientes.csv", csv)]));

    expect(syncLogCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "error" }) })
    );
  });

  it("retorna a entidade 'desconhecida' sem transacionar quando os headers não batem", async () => {
    const res = await POST(uploadRequest([arquivo("qualquer.csv", "CODIGO;DESCRICAO\n1;teste")]));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.resultados[0]).toEqual({
      arquivo: "qualquer.csv",
      entidade: "desconhecida",
      registros: 0,
      sync: { entidade: "?", processados: 0, criados: 0, atualizados: 0, erros: 0 },
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("ignora arquivo sem linhas de dados (só cabeçalho)", async () => {
    const res = await POST(uploadRequest([arquivo("vazio.csv", "A1_COD;A1_NOME")]));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.resultados).toEqual([]);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("retorna 500 e registra logApiError quando o processamento falha", async () => {
    const requestComErro = {
      formData: async () => {
        throw new Error("corpo inválido");
      },
    } as unknown as Request;

    const res = await POST(requestComErro);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Erro interno no upload" });
    expect(logApiErrorMock).toHaveBeenCalledWith("Erro no upload de CSV", expect.any(Error));
  });
});
