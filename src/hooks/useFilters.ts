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
};

export const useFilters = create<FiltrosState>((set) => ({
  cliente: "",
  dataInicial: "",
  dataFinal: "",

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

  limparFiltros: () =>
    set({
      cliente: "",
      dataInicial: "",
      dataFinal: "",
      clienteFilter: { codigo: "", nome: "", selecao: "todos" },
    }),

  clienteFilter: { codigo: "", nome: "", selecao: "todos" },
  setClienteFilter: (filter: FiltroCliente) =>
    set({
      clienteFilter: filter,
      cliente: filter.nome || filter.codigo || "",
    }),
}));