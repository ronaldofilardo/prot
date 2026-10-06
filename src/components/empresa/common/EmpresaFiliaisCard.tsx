"use client";

import React, { useState, useMemo } from "react";
import { GitBranch, Search, X } from "lucide-react";
import type { ProtheusFilialInfo } from "@/hooks/useEmpresaProtheus";
import { useFilters } from "@/hooks/useFilters";
import { FilialTableRow } from "./FilialTableRow";

interface EmpresaFiliaisCardProps {
  filiais: ProtheusFilialInfo[];
  loading?: boolean;
}

function useFiliaisFilter(filiais: ProtheusFilialInfo[], clienteAtivo: string) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const termo = (busca || clienteAtivo).trim().toLowerCase();
    if (!termo) return filiais;
    return filiais.filter(
      (f) =>
        f.nome?.toLowerCase().includes(termo) ||
        f.cnpj?.toLowerCase().includes(termo) ||
        f.id?.toLowerCase().includes(termo) ||
        f.codigoFilial?.toLowerCase().includes(termo)
    );
  }, [filiais, busca, clienteAtivo]);

  return { busca, setBusca, filtrados };
}

function Header({ filiais }: { filiais: ProtheusFilialInfo[] }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <GitBranch size={18} className="text-emerald-600 dark:text-emerald-400" />
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Carteira de Clientes no Protheus — LC1 Contadores
        </h4>
      </div>
      <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        {filiais.length} {filiais.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}
      </span>
    </div>
  );
}

function SearchInput({ busca, setBusca, filiais, filtrados }: { busca: string; setBusca: (v: string) => void; filiais: ProtheusFilialInfo[]; filtrados: ProtheusFilialInfo[] }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="relative flex-1 max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Filtrar clientes por nome, código ou CNPJ..."
          className="w-full text-xs pl-8 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {busca && (
          <button type="button" onClick={() => setBusca("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>
      <span className="text-[11px] text-slate-400">
        Exibindo {filtrados.length} de {filiais.length} clientes
      </span>
    </div>
  );
}

function LoadingState() {
  return <p className="text-xs text-slate-400 italic py-2">Carregando filiais...</p>;
}

function EmptyState() {
  return <p className="text-xs text-slate-400 italic py-2">Nenhuma filial encontrada para este cliente.</p>;
}

function TableHeader() {
  return (
    <thead className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-400">
      <tr>
        <th className="pb-2 font-medium w-24">Cód.</th>
        <th className="pb-2 font-medium">Nome / Razão Social</th>
        <th className="pb-2 font-medium w-48">CNPJ / Identificação</th>
        <th className="pb-2 font-medium w-24">Status</th>
        <th className="pb-2 font-medium text-right w-24">Ações</th>
      </tr>
    </thead>
  );
}

function TableBody({
  filtrados,
  clienteAtivo,
  onSelecionarCliente,
}: {
  filtrados: ProtheusFilialInfo[];
  clienteAtivo: string;
  onSelecionarCliente: (nome: string) => void;
}) {
  return (
    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
      {filtrados.map((f, i) => (
        <FilialTableRow
          key={f.id || `${f.codigoEmpresa}-${f.codigoFilial}-${i}`}
          f={f}
          isFiltroAtivo={clienteAtivo === f.nome}
          onSelecionarCliente={onSelecionarCliente}
        />
      ))}
    </tbody>
  );
}

function FiliaisTable({ filiais, filtrados, loading, clienteAtivo, onSelecionarCliente }: {
  filiais: ProtheusFilialInfo[];
  filtrados: ProtheusFilialInfo[];
  loading?: boolean;
  clienteAtivo: string;
  onSelecionarCliente: (nome: string) => void;
}) {
  if (loading) return <LoadingState />;
  if (filiais.length === 0) return <EmptyState />;

  return (
    <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
      <table className="w-full text-left text-xs">
        <TableHeader />
        <TableBody filtrados={filtrados} clienteAtivo={clienteAtivo} onSelecionarCliente={onSelecionarCliente} />
      </table>
    </div>
  );
}

function renderContent({
  filiais,
  loading,
  busca,
  setBusca,
  filtrados,
  clienteAtivo,
  onSelecionarCliente,
}: {
  filiais: ProtheusFilialInfo[];
  loading?: boolean;
  busca: string;
  setBusca: (v: string) => void;
  filtrados: ProtheusFilialInfo[];
  clienteAtivo: string;
  onSelecionarCliente: (nome: string) => void;
}) {
  return (
    <>
      <Header filiais={filiais} />
      {filiais.length > 0 && <SearchInput busca={busca} setBusca={setBusca} filiais={filiais} filtrados={filtrados} />}
      <FiliaisTable filiais={filiais} filtrados={filtrados} loading={loading} clienteAtivo={clienteAtivo} onSelecionarCliente={onSelecionarCliente} />
    </>
  );
}

export function EmpresaFiliaisCard({ filiais, loading }: EmpresaFiliaisCardProps) {
  const { cliente: clienteAtivo, setCliente } = useFilters();
  const { busca, setBusca, filtrados } = useFiliaisFilter(filiais, clienteAtivo);

  const toggleCliente = (nome: string) => {
    setCliente(clienteAtivo === nome ? "" : nome);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      {renderContent({ filiais, loading, busca, setBusca, filtrados, clienteAtivo, onSelecionarCliente: toggleCliente })}
    </div>
  );
}