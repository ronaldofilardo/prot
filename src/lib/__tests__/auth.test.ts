import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockCompare } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockCompare: vi.fn(),
}));

vi.mock("@/lib/db/prisma-client", () => ({
  prisma: {
    usuario: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  compare: mockCompare,
}));

import { authOptions } from "@/lib/auth";

type AuthorizeFn = (
  credentials: Record<string, string> | undefined,
  req?: unknown
) => Promise<unknown>;

interface CredentialsProviderOptions {
  options: {
    authorize: AuthorizeFn;
  };
}

describe("Autenticação e Authorize (auth.ts)", () => {
  const provider = authOptions.providers[0] as unknown as CredentialsProviderOptions;
  const authorizeFn = provider.options.authorize;

  const usuarioMock = {
    id: "usr-1",
    email: "gestor@empresademo.com.br",
    senhaHash: "hash123",
    nome: "Gestor",
    empresaId: "emp-1",
    ativo: true,
    criadoEm: new Date(),
    empresa: { id: "emp-1", nome: "Empresa 1", tenantId: "tenant-1" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna null se email ou senha/password estiverem ausentes", async () => {
    const result1 = await authorizeFn({ email: "" });
    const result2 = await authorizeFn(undefined);
    expect(result1).toBeNull();
    expect(result2).toBeNull();
  });

  it("aceita credencial passada com a chave 'password'", async () => {
    mockFindUnique.mockResolvedValue(usuarioMock);
    mockCompare.mockResolvedValue(true);

    const user = await authorizeFn({
      email: "gestor@empresademo.com.br",
      password: "TrocarNoPrimeiroAcesso!123",
    });

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "gestor@empresademo.com.br" },
      include: { empresa: true },
    });
    expect(mockCompare).toHaveBeenCalledWith("TrocarNoPrimeiroAcesso!123", "hash123");

    expect(user).toEqual({
      id: "usr-1",
      email: "gestor@empresademo.com.br",
      name: "Gestor",
      empresaId: "emp-1",
      tenantId: "tenant-1",
    });
  });

  it("aceita credencial passada com a chave 'senha'", async () => {
    mockFindUnique.mockResolvedValue(usuarioMock);
    mockCompare.mockResolvedValue(true);

    const user = await authorizeFn({
      email: "gestor@empresademo.com.br",
      senha: "TrocarNoPrimeiroAcesso!123",
    });

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "gestor@empresademo.com.br" },
      include: { empresa: true },
    });
    expect(mockCompare).toHaveBeenCalledWith("TrocarNoPrimeiroAcesso!123", "hash123");

    expect(user).toEqual({
      id: "usr-1",
      email: "gestor@empresademo.com.br",
      name: "Gestor",
      empresaId: "emp-1",
      tenantId: "tenant-1",
    });
  });

  it("retorna null se a senha estiver incorreta", async () => {
    mockFindUnique.mockResolvedValue(usuarioMock);
    mockCompare.mockResolvedValue(false);

    const user = await authorizeFn({
      email: "gestor@empresademo.com.br",
      password: "senha-errada",
    });

    expect(user).toBeNull();
  });

  it("popula empresaId e tenantId nos callbacks jwt e session", async () => {
    const jwtCallback = authOptions.callbacks?.jwt;
    const sessionCallback = authOptions.callbacks?.session;

    if (!jwtCallback || !sessionCallback) {
      throw new Error("Callbacks JWT ou Session não definidos");
    }

    const token = await jwtCallback({
      token: {},
      user: { id: "usr-1", empresaId: "emp-1", tenantId: "tenant-1" } as never,
      account: null,
    });

    expect(token).toEqual({ empresaId: "emp-1", tenantId: "tenant-1" });

    const session = await sessionCallback({
      session: { user: { name: "Gestor", email: "gestor@empresademo.com.br" }, expires: "" },
      token,
      user: { id: "usr-1" } as never,
      newSession: undefined,
      trigger: "update",
    });

    expect((session.user as { empresaId?: string }).empresaId).toBe("emp-1");
    expect((session.user as { tenantId?: string }).tenantId).toBe("tenant-1");
  });
});
