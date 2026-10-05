import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveTokenInfo, empresaFromTokenInfo, type TokenInfo } from "../_internals/token-info";
import { protheusTokenProvider } from "@/lib/integration/protheus-token-provider";

vi.mock("@/lib/integration/protheus-token-provider", () => ({
  protheusTokenProvider: { getValidToken: vi.fn() },
}));

const getValidToken = vi.mocked(protheusTokenProvider.getValidToken);

function jwt(payload: Record<string, unknown>): string {
  const corpo = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${corpo}.assinatura`;
}

const tokenCheio = jwt({
  envId: "AMBI_TESTE",
  sub: "joao.silva",
  exp: Math.floor(Date.now() / 1000) + 3600,
});

const tokenInfo: TokenInfo = {
  ativo: true,
  clienteProtheus: "LC1 CONTADORES",
  clienteId: "141404",
  ambiente: "AMBI_TESTE",
  usuario: "joao.silva (admin)",
  expiraEm: "10:00:00",
  tokenPreview: "abcdefghij......stuvwxyz",
};

describe("resolveTokenInfo", () => {
  beforeEach(() => {
    getValidToken.mockReset();
    delete process.env.PROTHEUS_REST_ACCESS_TOKEN;
    delete process.env.PROTHEUS_REST_BASE_URL;
  });

  afterEach(() => {
    delete process.env.PROTHEUS_REST_ACCESS_TOKEN;
    delete process.env.PROTHEUS_REST_BASE_URL;
  });

  it("sem nenhum token disponivel retorna null", async () => {
    getValidToken.mockRejectedValue(new Error("sem token"));

    expect(await resolveTokenInfo("empresa-01")).toBeNull();
  });

  it("deriva ambiente, usuario e expiracao do payload JWT", async () => {
    getValidToken.mockResolvedValue(tokenCheio);

    const info = await resolveTokenInfo("empresa-01");

    expect(info?.ativo).toBe(true);
    expect(info?.ambiente).toBe("AMBI_TESTE");
    expect(info?.usuario).toBe("joao.silva (admin)");
    expect(info?.expiraEm).toMatch(/\d{2}:\d{2}:\d{2}/);
    expect(info?.tokenPreview).toBe(`${tokenCheio.slice(0, 16)}...${tokenCheio.slice(-8)}`);
  });

  it("payload sem sub e exp usa os valores padrao", async () => {
    getValidToken.mockResolvedValue(jwt({}));

    const info = await resolveTokenInfo("empresa-01");

    expect(info?.ambiente).toBe("CHVDPE_141403_PR_DV");
    expect(info?.usuario).toBe("Administrador (admin)");
    expect(info?.expiraEm).toBe("60 min");
  });

  it("token malformado cai nos padroes sem lancar erro", async () => {
    getValidToken.mockResolvedValue("sem-pontos");

    const info = await resolveTokenInfo("empresa-01");

    expect(info?.ativo).toBe(true);
    expect(info?.usuario).toBe("Administrador (admin)");
    expect(info?.tokenPreview).toBe(`${"sem-pontos".slice(0, 16)}...${"sem-pontos".slice(-8)}`);
  });

  it("payload invalido em base64 tambem cai nos padroes", async () => {
    getValidToken.mockResolvedValue("aaa.!!!invalido!!!.ccc");

    const info = await resolveTokenInfo("empresa-01");

    expect(info?.ambiente).toBe("CHVDPE_141403_PR_DV");
  });

  it("usa o token de ambiente como fallback quando o provider falha", async () => {
    getValidToken.mockRejectedValue(new Error("falhou"));
    process.env.PROTHEUS_REST_ACCESS_TOKEN = jwt({ envId: "ENV_FALLBACK" });

    const info = await resolveTokenInfo("empresa-01");

    expect(info?.ambiente).toBe("ENV_FALLBACK");
  });

  it("falha sincrona do provider tambem vira null ou fallback", async () => {
    getValidToken.mockImplementation(() => {
      throw new Error("sync boom");
    });

    expect(await resolveTokenInfo("empresa-01")).toBeNull();
  });

  it("hostname protheus alimenta o nome do cliente", async () => {
    getValidToken.mockResolvedValue(tokenCheio);
    process.env.PROTHEUS_REST_BASE_URL = "https://acme.protheus.local:8080";

    const info = await resolveTokenInfo("empresa-01");

    expect(info?.clienteProtheus).toBe("ACME");
  });

  it("host numerico de ambiente protheus cai no nome padrao", async () => {
    getValidToken.mockResolvedValue(tokenCheio);
    process.env.PROTHEUS_REST_BASE_URL = "https://141403.protheus.local";

    const info = await resolveTokenInfo("empresa-01");

    expect(info?.clienteProtheus).toContain("CONTADORES");
  });
});

describe("empresaFromTokenInfo", () => {
  it("com token monta o fallback completo da empresa", () => {
    const empresa = empresaFromTokenInfo(tokenInfo);

    expect(empresa).toEqual({
      nome: "LC1 CONTADORES",
      cnpj: "Cliente ID: 141404 • Ambiente: AMBI_TESTE",
      codigoEmpresa: "01",
      codigoFilial: "01",
      clienteId: "141404",
      usuarioLogado: "joao.silva (admin)",
      ambiente: "AMBI_TESTE",
    });
  });

  it("sem token retorna null", () => {
    expect(empresaFromTokenInfo(null)).toBeNull();
  });
});
