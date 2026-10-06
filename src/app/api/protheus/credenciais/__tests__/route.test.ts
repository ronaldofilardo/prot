import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("../handlers/credenciais", () => ({
  getCredenciaisStatus: vi.fn(),
  salvarCredenciaisProtheus: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getCredenciaisStatus, salvarCredenciaisProtheus } from "../handlers/credenciais";

describe("API /api/protheus/credenciais", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 se o usuario nao estiver autenticado no GET", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("retorna status das credenciais se autenticado", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { empresaId: "empresa-123" },
    } as unknown as { user: { empresaId: string } });

    vi.mocked(getCredenciaisStatus).mockResolvedValue({
      configurado: true,
      username: "Administrador",
      baseUrl: "https://protheus.example.com",
      clientId: "admin",
      atualizadoEm: new Date(),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.username).toBe("Administrador");
  });

  it("retorna 401 se nao autenticado no POST", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = new Request("http://localhost:3000/api/protheus/credenciais", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("salva credenciais e retorna sucesso", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { empresaId: "empresa-123" },
    } as unknown as { user: { empresaId: string } });

    vi.mocked(salvarCredenciaisProtheus).mockResolvedValue({
      success: true,
      tokenPreview: "token123...",
    });

    const req = new Request("http://localhost:3000/api/protheus/credenciais", {
      method: "POST",
      body: JSON.stringify({ username: "Administrador", password: "secret_password" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("Credenciais salvas");
  });
});
