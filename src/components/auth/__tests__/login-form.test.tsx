import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LoginForm } from "../LoginForm";

const onSubmit = vi.fn();

function montar(overrides: Partial<Parameters<typeof LoginForm>[0]> = {}) {
  const props = {
    cpf: "",
    setCpf: vi.fn(),
    email: "",
    setEmail: vi.fn(),
    password: "",
    setPassword: vi.fn(),
    loading: false,
    error: null,
    onSubmit,
    ...overrides,
  };
  render(<LoginForm {...props} />);
  return props;
}

describe("LoginForm", () => {
  it("renderiza os tres campos com dicas e botao de acesso", () => {
    montar();

    expect(screen.getByLabelText("CPF")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(screen.getByText("Somente números (11 dígitos)")).toBeInTheDocument();
    expect(screen.getByText("Formato: usuario@dominio.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acessar Dashboard" })).toBeInTheDocument();
  });

  it("digitar em cada campo aciona o callback correspondente", () => {
    const props = montar();

    fireEvent.change(screen.getByLabelText("CPF"), { target: { value: "12345678900" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "segredo" } });

    expect(props.setCpf).toHaveBeenCalledWith("12345678900");
    expect(props.setEmail).toHaveBeenCalledWith("a@b.com");
    expect(props.setPassword).toHaveBeenCalledWith("segredo");
  });

  it("erro exibe o alerta vermelho", () => {
    montar({ error: "Credenciais inválidas. Verifique seu e-mail e senha." });

    expect(screen.getByText("Credenciais inválidas. Verifique seu e-mail e senha.")).toBeInTheDocument();
  });

  it("loading mostra progresso e desabilita campos e botao", () => {
    montar({ loading: true });

    expect(screen.getByRole("button", { name: "Entrando..." })).toBeDisabled();
    expect(screen.getByLabelText("CPF")).toBeDisabled();
    expect(screen.getByLabelText("E-mail")).toBeDisabled();
    expect(screen.getByLabelText("Senha")).toBeDisabled();
  });

  it("submeter o formulario chama o onSubmit", () => {
    onSubmit.mockClear();
    montar();

    fireEvent.submit(document.querySelector("form")!);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
