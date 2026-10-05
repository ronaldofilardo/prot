"use client";

import React from "react";
import { Calendar, Search } from "lucide-react";
import type { EmpresaGrupoDTO } from "@/lib/types/dashboard";
import { EmpresaFilialFilter } from "./EmpresaFilialFilter";

export interface ClienteItem {
  id: string;
  codigo: string;
  nome: string;
  cidade: string;
  estado: string;
}

interface FilterFieldsProps {
  clientes: ClienteItem[];
  grupos: EmpresaGrupoDTO[];
  cliente: string;
  dataInicial: string;
  dataFinal: string;
  onClienteChange: (v: string) => void;
  onDataInicialChange: (v: string) => void;
  onDataFinalChange: (v: string) => void;
}

export function FilterFields({
  clientes,
  grupos,
  cliente,
  dataInicial,
  dataFinal,
  onClienteChange,
  onDataInicialChange,
  onDataFinalChange,
}: FilterFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 flex-1">
      {grupos.length > 0 && (
        <div>
          <EmpresaFilialFilter grupos={grupos} />
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Cliente / Empresa</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
          <input
            type="text"
            list="clientes-datalist"
            placeholder="Filtrar por nome ou código..."
            value={cliente}
            onChange={(e) => onClienteChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
          />
          <datalist id="clientes-datalist">
            {clientes.map((c) => (
              <option key={c.id} value={c.nome}>{c.codigo} - {c.cidade}/{c.estado}</option>
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Data Inicial</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
          <input
            type="date"
            value={dataInicial}
            onChange={(e) => onDataInicialChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Data Final</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
          <input
            type="date"
            value={dataFinal}
            onChange={(e) => onDataFinalChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
          />
        </div>
      </div>
    </div>
  );
}
