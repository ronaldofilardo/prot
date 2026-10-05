import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EmpresaProtheusPanel } from "../EmpresaProtheusPanel";

const fetchMock = vi.fn();

const jsonCompleto = {
  success: true,
  empresaAtual: { id: "e1", nome: "ACME Sistemas", cnpj: "11.111.111/0001-11", usuarioLogado: "admin" },
  empresaProtheus: { nome: "ACME Protheus", cnpj: "22.222.222/0001-22" },
  tokenInfo: {
    ativo: true,
    clienteProtheus: "ACME PROTHEUS",
    clienteId: "99",
    ambiente: "producao",
    usuario: "admin",
    expiraEm: "1h",
    tokenPreview: "abc",
  },
  filiais: [{ codigoEmpresa: "01", codigoFilial: "01", nome: "Matriz LC1", tipo: "Matriz" }],
};

async function avancarCarga() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe("EmpresaProtheusPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("estado inicial mostra carregamento e cards vazios", () => {
    render(<EmpresaProtheusPanel />);

    expect(screen.getByText("Consultando Protheus...")).toBeInTheDocument();
    expect(screen.getByText("Nenhum dado cadastrado no sistema.")).toBeInTheDocument();
    expect(screen.getByText("Clique em 'Buscar no Protheus' para carregar os dados cadastrais do ERP.")).toBeInTheDocument();
    expect(screen.getByText("Carregando filiais...")).toBeInTheDocument();
    expect(screen.queryByText(/Conexão e Token Protheus/)).toBeNull();
    expect(screen.queryByText(/Deseja atualizar a razão social/)).toBeNull();
  });

  it("carga completa exibe token, cards, filiais e banner de sync", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => jsonCompleto });
    render(<EmpresaProtheusPanel />);
    await avancarCarga();

    expect(screen.getByText(/Conexão e Token Protheus/)).toBeInTheDocument();
    expect(screen.getByText("ACME Protheus")).toBeInTheDocument();
    expect(screen.getByText("Conectado")).toBeInTheDocument();
    expect(screen.getByText("1 filial cadastrada")).toBeInTheDocument();
    expect(screen.getByText(/Deseja atualizar a razão social/)).toBeInTheDocument();
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Status da consulta/)).toBeNull();
  });

  it("falha na consulta mostra o banner de erro com badge pendente", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: false, error: "Sem credenciais" }) });
    render(<EmpresaProtheusPanel />);
    await avancarCarga();

    expect(screen.getByText("Status da consulta de dados:")).toBeInTheDocument();
    expect(screen.getByText("Sem credenciais")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.queryByText(/Deseja atualizar a razão social/)).toBeNull();
  });

  it("sincronizar com sucesso exibe o banner verde", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => jsonCompleto });
    render(<EmpresaProtheusPanel />);
    await avancarCarga();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ empresa: { id: "e2", nome: "Salva", cnpj: "33" } }) });

    await act(async () => {
      fireEvent.click(screen.getByText("Salvar Dados no Sistema"));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText("Dados da empresa atualizados com sucesso no sistema!")).toBeInTheDocument();
    expect(screen.getByText("Salva")).toBeInTheDocument();
  });
});
