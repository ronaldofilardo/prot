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

function ClienteField({ clientes, cliente, onClienteChange }: { clientes: ClienteItem[]; cliente: string; onClienteChange: (v: string) => void }) {
  const handleChange = (valor: string) => {
    const match = clientes.find((c) => c.nome.toLowerCase() === valor.toLowerCase() || c.codigo === valor);
    onClienteChange(match ? match.nome : valor);
  };

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Cliente / Empresa</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
        <input
          type="text"
          list="clientes-datalist"
          placeholder="Filtrar por nome ou código..."
          value={cliente}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
        />
        <datalist id="clientes-datalist">
          {clientes.map((c) => {
            const detalhe = c.cidade ? `— ${c.cidade}${c.estado ? `/${c.estado}` : ""}` : "";
            return (
              <option key={c.id} value={c.nome}>
                {c.codigo ? `Cód: ${c.codigo} ` : ""}{detalhe}
              </option>
            );
          })}
        </datalist>
      </div>
    </div>
  );
}

function DataField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">{label}</label>
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
        />
      </div>
    </div>
  );
}

export function FilterFields({ clientes, grupos, cliente, dataInicial, dataFinal, onClienteChange, onDataInicialChange, onDataFinalChange }: FilterFieldsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 flex-1">
      {grupos.length > 0 && (
        <div>
          <EmpresaFilialFilter grupos={grupos} />
        </div>
      )}
      <ClienteField clientes={clientes} cliente={cliente} onClienteChange={onClienteChange} />
      <DataField label="Data Inicial" value={dataInicial} onChange={onDataInicialChange} />
      <DataField label="Data Final" value={dataFinal} onChange={onDataFinalChange} />
    </div>
  );
}
