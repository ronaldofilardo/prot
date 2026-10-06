import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProtheusCredenciaisCard } from "../common/ProtheusCredenciaisCard";

describe("ProtheusCredenciaisCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza campos de usuario e senha do Protheus", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ configurado: false }),
      })
    );

    render(<ProtheusCredenciaisCard />);

    expect(screen.getByText("Credenciais do Protheus — Renovação Automática Contínua")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ex: Administrador")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Digite a senha")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar e Atualizar Token/i })).toBeInTheDocument();
  });

  it("envia credenciais ao submeter o formulario e chama onSuccess", async () => {
    const onSuccessMock = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ configurado: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: "Token renovado" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProtheusCredenciaisCard onSuccess={onSuccessMock} />);

    fireEvent.change(screen.getByPlaceholderText("Ex: Administrador"), {
      target: { value: "Administrador" },
    });
    fireEvent.change(screen.getByPlaceholderText("Digite a senha"), {
      target: { value: "minhasenha123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Salvar e Atualizar Token/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/protheus/credenciais",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ username: "Administrador", password: "minhasenha123" }),
        })
      );
    });

    await waitFor(() => {
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });
  });
});
