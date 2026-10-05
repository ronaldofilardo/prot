import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { DashboardFilterBar } from "../DashboardFilterBar";
import { EmpresaFilialFilter } from "../EmpresaFilialFilter";
import { useFilters } from "@/hooks/useFilters";
import type { EmpresaGrupoDTO } from "@/lib/types/dashboard";

const clientes = [{ id: "c1", codigo: "001", nome: "ACME", cidade: "Sao Paulo", estado: "SP" }];

const grupos: EmpresaGrupoDTO[] = [
  {
    id: "m1",
    nome: "Matriz Alfa",
    cnpj: null,
    filiais: [
      { id: "f1", nome: "Filial SP", cidade: "Sao Paulo", uf: "SP" },
      { id: "f2", nome: "Filial RJ", cidade: "Rio", uf: "RJ" },
    ],
  },
  { id: "m2", nome: "Grupo Beta", cnpj: "22.222.222/0001-22", filiais: [] },
];

const inicial = useFilters.getState();

describe("DashboardFilterBar — inputs, badge e limpeza", () => {
  beforeEach(() => {
    useFilters.setState(inicial, true);
  });

  it("sem filtros ativos nao mostra limpar nem badge nem seletor de grupo", () => {
    render(<DashboardFilterBar clientes={clientes} />);

    expect(screen.getByPlaceholderText(/Filtrar por nome/)).toHaveValue("");
    expect(screen.getByText("Data Inicial")).toBeInTheDocument();
    expect(screen.queryByText("Limpar")).toBeNull();
    expect(screen.queryByText("Filtros aplicados:")).toBeNull();
    expect(screen.queryByText("Empresa / matriz")).toBeNull();
  });

  it("digitar cliente e datas reflete no store e habilita a limpeza", () => {
    render(<DashboardFilterBar clientes={clientes} grupos={grupos} />);

    fireEvent.change(screen.getByPlaceholderText(/Filtrar por nome/), {
      target: { value: "ACME" },
    });
    const datas = document.querySelectorAll<HTMLInputElement>('input[type="date"]');
    fireEvent.change(datas[0], { target: { value: "2026-01-01" } });
    fireEvent.change(datas[1], { target: { value: "2026-01-31" } });

    expect(useFilters.getState().cliente).toBe("ACME");
    expect(useFilters.getState().dataInicial).toBe("2026-01-01");
    expect(useFilters.getState().dataFinal).toBe("2026-01-31");
    expect(screen.getByText("Limpar")).toBeInTheDocument();
    expect(screen.getByText("Cliente: ACME")).toBeInTheDocument();
    expect(screen.getByText("Empresa / matriz")).toBeInTheDocument();
  });

  it("botao limpar zera o store e recolhe os controles de filtro", () => {
    render(<DashboardFilterBar clientes={clientes} grupos={grupos} />);
    fireEvent.change(screen.getByPlaceholderText(/Filtrar por nome/), {
      target: { value: "ACME" },
    });

    fireEvent.click(screen.getByText("Limpar"));

    expect(useFilters.getState().cliente).toBe("");
    expect(screen.queryByText("Limpar")).toBeNull();
    expect(screen.queryByText("Filtros aplicados:")).toBeNull();
  });
});

describe("EmpresaFilialFilter — matriz, filiais e UF", () => {
  beforeEach(() => {
    useFilters.setState(inicial, true);
  });

  it("lista grupos com e sem cnpj na opcao do seletor", () => {
    render(<EmpresaFilialFilter grupos={grupos} />);

    expect(screen.getByRole("option", { name: "Todas as empresas" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Matriz Alfa" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Grupo Beta/ })).toBeInTheDocument();
  });

  it("escolher matriz marca todas as filiais e mostra o contador", () => {
    render(<EmpresaFilialFilter grupos={grupos} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "m1" } });

    expect(useFilters.getState().matrizId).toBe("m1");
    expect(useFilters.getState().empresaIds).toEqual(["m1", "f1", "f2"]);
    expect(screen.getByText("Vendo 3 de 2 filiais selecionadas")).toBeInTheDocument();
    expect(screen.getByLabelText(/Filial SP/)).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Todas" })).toBeChecked();
  });

  it("desmarcar todas zera a selecao e remarcar volta ao total", () => {
    render(<EmpresaFilialFilter grupos={grupos} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "m1" } });

    fireEvent.click(screen.getByRole("checkbox", { name: "Todas" }));
    expect(useFilters.getState().empresaIds).toEqual([]);
    expect(screen.getByText("Vendo 0 de 2 filiais selecionadas")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Todas" }));
    expect(useFilters.getState().empresaIds).toEqual(["f1", "f2"]);
    expect(screen.getByText("Vendo 2 de 2 filiais selecionadas")).toBeInTheDocument();
  });

  it("desmarcar uma filial ajusta apenas ela no store", () => {
    render(<EmpresaFilialFilter grupos={grupos} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "m1" } });

    fireEvent.click(screen.getByLabelText(/Filial SP/));

    expect(useFilters.getState().empresaIds).toEqual(["m1", "f2"]);
    expect(screen.getByText("Vendo 2 de 2 filiais selecionadas")).toBeInTheDocument();
  });

  it("filtro de UF esconde filiais de outras UFs", () => {
    render(<EmpresaFilialFilter grupos={grupos} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "m1" } });

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[1], { target: { value: "SP" } });

    expect(screen.getByText(/Filial SP/)).toBeInTheDocument();
    expect(screen.queryByText(/Filial RJ/)).toBeNull();
  });

  it("empresa sem filiais nao abre o painel e fica restrita a ela", () => {
    render(<EmpresaFilialFilter grupos={grupos} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "m2" } });

    expect(screen.queryByText("Filiais")).toBeNull();
    expect(useFilters.getState().empresaIds).toEqual(["m2"]);
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("voltar para todas as empresas limpa matriz e selecao", () => {
    render(<EmpresaFilialFilter grupos={grupos} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "m1" } });

    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "" } });

    expect(useFilters.getState().matrizId).toBeNull();
    expect(useFilters.getState().empresaIds).toEqual([]);
    expect(screen.queryByText("Filiais")).toBeNull();
  });
});
