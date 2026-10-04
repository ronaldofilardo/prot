import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { GET, POST } from "../route";

const { empresaMock, getProtheusClientMock } = vi.hoisted(() => ({
  empresaMock: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  getProtheusClientMock: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/prisma-client", () => ({
  prisma: { empresa: empresaMock },
}));

vi.mock("@/lib/integration/protheus-client-factory", () => ({
  getProtheusClient: getProtheusClientMock,
}));

describe("API /api/protheus/empresa", () => {
  const mockedGetServerSession = vi.mocked(getServerSession);

  const sessionComEmpresa = {
    user: { empresaId: "empresa-01" },
    expires: "",
  } as unknown as Session;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retorna 401 para usuario nao autenticado", async () => {
    mockedGetServerSession.mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/protheus/empresa");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("retorna dados da empresa atual e dados do Protheus", async () => {
    mockedGetServerSession.mockResolvedValueOnce(sessionComEmpresa);

    empresaMock.findUnique.mockResolvedValueOnce({
      id: "empresa-01",
      nome: "Empresa Local LTDA",
      cnpj: "11.111.111/0001-11",
    });

    const mockClient = {
      fetchEmpresa: vi.fn().mockResolvedValueOnce({
        nome: "EMPRESA PROTHEUS OFICIAL S/A",
        cnpj: "22.222.222/0001-22",
        codigoEmpresa: "01",
        codigoFilial: "01",
      }),
      fetchFiliais: vi.fn().mockResolvedValueOnce([
        {
          codigoEmpresa: "01",
          codigoFilial: "01",
          nome: "LC1 CONTADORES - MATRIZ",
          tipo: "Matriz",
          status: "Ativa",
        },
      ]),
    };
    getProtheusClientMock.mockResolvedValueOnce(mockClient);

    const req = new Request("http://localhost/api/protheus/empresa");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.empresaAtual.nome).toBe("Empresa Local LTDA");
    expect(json.empresaProtheus.nome).toBe("EMPRESA PROTHEUS OFICIAL S/A");
    expect(json.empresaProtheus.cnpj).toBe("22.222.222/0001-22");
    expect(json.filiais).toHaveLength(1);
    expect(json.filiais[0].nome).toBe("LC1 CONTADORES - MATRIZ");
  });

  it("atualiza nome e cnpj no banco via POST", async () => {
    mockedGetServerSession.mockResolvedValueOnce(sessionComEmpresa);

    empresaMock.update.mockResolvedValueOnce({
      id: "empresa-01",
      nome: "NOVA RAZAO SOCIAL DO PROTHEUS",
      cnpj: "22.222.222/0001-22",
    });

    const req = new Request("http://localhost/api/protheus/empresa", {
      method: "POST",
      body: JSON.stringify({
        nome: "NOVA RAZAO SOCIAL DO PROTHEUS",
        cnpj: "22.222.222/0001-22",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.empresa.nome).toBe("NOVA RAZAO SOCIAL DO PROTHEUS");
  });
});
