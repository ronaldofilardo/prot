import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { FormEvent } from "react";
import { useLogin } from "../useLogin";

const { replace, signInMock } = vi.hoisted(() => ({
  replace: vi.fn(),
  signInMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("next-auth/react", () => ({ signIn: signInMock }));

const evento = { preventDefault: vi.fn() } as unknown as FormEvent;

describe("useLogin — autenticação por credenciais", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("inicia com campos vazios, sem loading e sem erro", () => {
    const { result } = renderHook(() => useLogin());

    expect(result.current.email).toBe("");
    expect(result.current.cpf).toBe("");
    expect(result.current.password).toBe("");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sucesso: envia e-mail normalizado e redireciona para /dashboard", async () => {
    signInMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.setEmail("  Ana@Empresa.COM  ");
      result.current.setPassword("s3nh4");
    });
    await act(async () => {
      await result.current.handleSubmit(evento);
    });

    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "ana@empresa.com",
      password: "s3nh4",
      redirect: false,
    });
    expect(replace).toHaveBeenCalledWith("/dashboard");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sem e-mail usa o CPF como identificador", async () => {
    signInMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.setCpf(" 12345 ");
      result.current.setPassword("s3nh4");
    });
    await act(async () => {
      await result.current.handleSubmit(evento);
    });

    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "12345",
      password: "s3nh4",
      redirect: false,
    });
    expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("credenciais recusadas exibe mensagem e não redireciona", async () => {
    signInMock.mockResolvedValue({ error: "CredentialsSignin" });
    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.setEmail("ana@empresa.com");
      result.current.setPassword("errada");
    });
    await act(async () => {
      await result.current.handleSubmit(evento);
    });

    expect(result.current.error).toBe("Credenciais invalidas. Verifique seu e-mail e senha.");
    expect(replace).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it("falha inesperada do signIn exibe mensagem de erro genérica", async () => {
    signInMock.mockRejectedValue(new Error("rede fora"));
    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.setEmail("ana@empresa.com");
      result.current.setPassword("s3nh4");
    });
    await act(async () => {
      await result.current.handleSubmit(evento);
    });

    expect(result.current.error).toBe("Nao foi possivel autenticar. Verifique suas credenciais.");
    expect(replace).not.toHaveBeenCalled();
  });

  it("limpa o erro automaticamente após 5 segundos", async () => {
    vi.useFakeTimers();
    signInMock.mockResolvedValue({ error: "CredentialsSignin" });
    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.setEmail("ana@empresa.com");
      result.current.setPassword("errada");
    });
    await act(async () => {
      await result.current.handleSubmit(evento);
    });
    expect(result.current.error).not.toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(result.current.error).toBeNull();
  });
});
