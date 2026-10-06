import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { EmpresaDadosCard } from "../common/EmpresaDadosCard";
import { EmpresaFiliaisCard } from "../common/EmpresaFiliaisCard";
import { TokenStatusCard } from "../common/TokenStatusCard";
import { EmpresaSyncBanner } from "../common/EmpresaSyncBanner";
import { EmpresaHeaderAction } from "../common/EmpresaHeaderAction";

const cardProps = {
  titulo: "Cadastro no Sistema",
  badge: "Atual",
  badgeColor: "bg-slate-100",
  emptyMessage: "Sem dados cadastrais.",
};

describe("EmpresaDadosCard", () => {
  it("exibe dados completos com usuario conectado", () => {
    render(
      <EmpresaDadosCard {...cardProps} dados={{ nome: "ACME", cnpj: "11.111.111/0001-11", usuarioLogado: "admin" }} />
    );

    expect(screen.getByText("ACME")).toBeInTheDocument();
    expect(screen.getByText("11.111.111/0001-11")).toBeInTheDocument();
    expect(screen.getByText("Usuário Conectado:")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("sem dados exibe a mensagem vazia configurada", () => {
    render(<EmpresaDadosCard {...cardProps} dados={null} />);

    expect(screen.getByText("Sem dados cadastrais.")).toBeInTheDocument();
    expect(screen.queryByText("Razão Social / Nome do Cliente")).toBeNull();
  });

  it("nome e cnpj ausentes usam os textos de fallback", () => {
    render(<EmpresaDadosCard {...cardProps} dados={{ nome: "", cnpj: null }} />);

    expect(screen.getByText("Não informado")).toBeInTheDocument();
    expect(screen.getByText("Não cadastrado")).toBeInTheDocument();
    expect(screen.queryByText("Usuário Conectado:")).toBeNull();
  });
});

describe("EmpresaFiliaisCard", () => {
  const filialMatriz = { codigoEmpresa: "01", codigoFilial: "01", nome: "Matriz LC1", tipo: "Matriz" } as const;
  const filialComum = {
    codigoEmpresa: "02",
    codigoFilial: "02",
    nome: "Filial SP",
    tipo: "Filial",
    cnpj: "22.222.222/0001-22",
    status: "Inativa",
  } as const;

  it("lista filiais com badges e fallbacks de cnpj e status", () => {
    const { container } = render(<EmpresaFiliaisCard filiais={[filialMatriz, filialComum]} />);

    expect(screen.getByText("2 filiais cadastradas")).toBeInTheDocument();
    expect(screen.getByText("Filial 01")).toBeInTheDocument();
    expect(screen.getByText("Empresa 01")).toBeInTheDocument();
    expect(screen.getAllByText("Unidade 01").length).toBeGreaterThan(0);
    expect(screen.getByText("Mesmo da Matriz")).toBeInTheDocument();
    expect(screen.getByText("Inativa")).toBeInTheDocument();
    expect(container.querySelector(".text-indigo-700")).not.toBeNull();
    expect(container.querySelector(".text-slate-700")).not.toBeNull();
  });

  it("uma unica filial usa o rotulo singular", () => {
    render(<EmpresaFiliaisCard filiais={[filialMatriz]} />);

    expect(screen.getByText("1 filial cadastrada")).toBeInTheDocument();
    expect(screen.getByText("Ativa")).toBeInTheDocument();
    expect(screen.queryByText("22.222.222/0001-22")).toBeNull();
  });

  it("sem filiais em carregamento mostra o texto de loading", () => {
    render(<EmpresaFiliaisCard filiais={[]} loading />);

    expect(screen.getByText("Carregando filiais...")).toBeInTheDocument();
    expect(screen.getByText("0 filiais cadastradas")).toBeInTheDocument();
  });

  it("sem filiais parado mostra a mensagem de vazio", () => {
    render(<EmpresaFiliaisCard filiais={[]} />);

    expect(screen.getByText("Nenhuma filial encontrada para este cliente.")).toBeInTheDocument();
  });
});

describe("TokenStatusCard", () => {
  const token: Parameters<typeof TokenStatusCard>[0]["tokenInfo"] = {
    ativo: true,
    clienteProtheus: "ACME PROTHEUS",
    clienteId: "99",
    ambiente: "producao",
    usuario: "admin",
    expiraEm: "1h",
    tokenPreview: "abc",
  };

  it("sem token nao renderiza nada", () => {
    const { container } = render(<TokenStatusCard tokenInfo={null} />);

    expect(container.innerHTML).toBe("");
  });

  it("com token exibe cliente, usuario, ambiente e id", () => {
    render(<TokenStatusCard tokenInfo={token} />);

    expect(screen.getByText("ACME PROTHEUS")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("producao")).toBeInTheDocument();
    expect(screen.getByText("ID: 99")).toBeInTheDocument();
    expect(screen.getByText(/Expira em: 1h/)).toBeInTheDocument();
  });

  it("sem cliente e id usa os valores padrao", () => {
    render(<TokenStatusCard tokenInfo={{ ...token, clienteProtheus: undefined, clienteId: undefined }} />);

    expect(screen.getByText("LC1 CONTADORES")).toBeInTheDocument();
    expect(screen.getByText("ID: 141404")).toBeInTheDocument();
  });
});

describe("EmpresaSyncBanner e EmpresaHeaderAction", () => {
  it("banner permite salvar quando ocioso", () => {
    const onSalvar = vi.fn();
    render(<EmpresaSyncBanner salvando={false} onSalvar={onSalvar} />);

    fireEvent.click(screen.getByText("Salvar Dados no Sistema"));
    expect(onSalvar).toHaveBeenCalledTimes(1);
  });

  it("banner salvando desabilita o botao", () => {
    render(<EmpresaSyncBanner salvando onSalvar={vi.fn()} />);

    expect(screen.getByText("Salvando...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvando/ })).toBeDisabled();
  });

  it("header submete o path digitado sem espacos", () => {
    const onBuscar = vi.fn();
    render(<EmpresaHeaderAction loading={false} onBuscar={onBuscar} />);

    fireEvent.change(screen.getByPlaceholderText(/Rota REST/), { target: { value: "  /rest/x  " } });
    fireEvent.submit(document.querySelector("form")!);

    expect(onBuscar).toHaveBeenCalledWith("/rest/x");
  });

  it("header sem path chama undefined e loading mostra progresso", () => {
    const onBuscar = vi.fn();
    render(<EmpresaHeaderAction loading onBuscar={onBuscar} />);

    fireEvent.submit(document.querySelector("form")!);

    expect(onBuscar).toHaveBeenCalledWith(undefined);
    expect(screen.getByText("Consultando Protheus...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Consultando/ })).toBeDisabled();
  });
});
