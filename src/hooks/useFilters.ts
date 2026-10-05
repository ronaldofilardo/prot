"use client";

import { create } from "zustand";

export type FiltroCliente = {
  codigo: string;
  nome: string;
  selecao: "todos" | "especifico";
};

export type FiltrosState = {
  // Filtros ativos
  cliente: string;
  dataInicial: string;
  dataFinal: string;

  setCliente: (cliente: string) => void;
  setDataInicial: (data: string) => void;
  setDataFinal: (data: string) => void;
  limparFiltros: () => void;

  // Compatibilidade com estrutura anterior
  clienteFilter: FiltroCliente;
  setClienteFilter: (filter: FiltroCliente) => void;

  // Filtro de empresa: matriz selecionada + filiais marcadas dentro dela.
  // Ver src/lib/utils/empresa-grupo.ts e filial-selection.ts.
  matrizId: string | null;
  empresaIds: string[];
  setMatriz: (matrizId: string | null) => void;
  setEmpresaIds: (empresaIds: string[]) => void;
};

type EstadoInicial = Pick<
  FiltrosState,
  "cliente" | "dataInicial" | "dataFinal" | "clienteFilter" | "matrizId" | "empresaIds"
>;

const ESTADO_INICIAL: EstadoInicial = {
  cliente: "",
  dataInicial: "",
  dataFinal: "",
  clienteFilter: { codigo: "", nome: "", selecao: "todos" },
  matrizId: null,
  empresaIds: [],
};

export const useFilters = create<FiltrosState>((set) => ({
  ...ESTADO_INICIAL,

  setCliente: (cliente: string) =>
    set({
      cliente,
      clienteFilter: {
        codigo: cliente,
        nome: cliente,
        selecao: cliente ? "especifico" : "todos",
      },
    }),

  setDataInicial: (dataInicial: string) => set({ dataInicial }),
  setDataFinal: (dataFinal: string) => set({ dataFinal }),

  limparFiltros: () => set({ ...ESTADO_INICIAL }),

  setClienteFilter: (filter: FiltroCliente) =>
    set({
      clienteFilter: filter,
      cliente: filter.nome || filter.codigo || "",
    }),

  // Trocar de matriz reseta as filiais marcadas: a seleção anterior
  // pertence a outro grupo e não deve "vazar" para o novo.
  setMatriz: (matrizId: string | null) => set({ matrizId, empresaIds: [] }),
  setEmpresaIds: (empresaIds: string[]) => set({ empresaIds }),
}));
