"use client";

import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useEmpresaProtheus } from "@/hooks/useEmpresaProtheus";
import type { EmpresaDados } from "@/hooks/useEmpresaProtheus";
import { EmpresaDadosCard } from "./common/EmpresaDadosCard";
import { EmpresaHeaderAction } from "./common/EmpresaHeaderAction";
import { TokenStatusCard } from "./common/TokenStatusCard";
import { EmpresaFiliaisCard } from "./common/EmpresaFiliaisCard";
import { EmpresaSyncBanner } from "./common/EmpresaSyncBanner";

function MensagensPainel({ success, error }: { success: string | null; error: string | null; temProtheus?: boolean }) {
  return (
    <>
      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-sm text-emerald-800 dark:text-emerald-300">{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Status da consulta de dados: </span>
            {error}
          </div>
        </div>
      )}
    </>
  );
}

function DadosGrid({ empresaAtual, empresaProtheus }: { empresaAtual: EmpresaDados | null; empresaProtheus: EmpresaDados | null }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <EmpresaDadosCard
        titulo="Cadastro no Sistema"
        badge="Atual"
        badgeColor="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
        dados={empresaAtual}
        emptyMessage="Nenhum dado cadastrado no sistema."
      />
      <EmpresaDadosCard
        titulo="Dados Retornados do Protheus"
        badge={empresaProtheus ? "Conectado" : "Pendente"}
        badgeColor={empresaProtheus ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"}
        dados={empresaProtheus}
        emptyMessage="Clique em 'Buscar no Protheus' para carregar os dados cadastrais do ERP."
      />
    </div>
  );
}

export function EmpresaProtheusPanel() {
  const { empresaAtual, empresaProtheus, tokenInfo, filiais, loading, salvando, error, success, buscarDadosProtheus, sincronizarComProtheus } = useEmpresaProtheus();
  return (
    <div className="space-y-6">
      <EmpresaHeaderAction loading={loading} onBuscar={buscarDadosProtheus} />
      <TokenStatusCard tokenInfo={tokenInfo} />
      <MensagensPainel success={success} error={error} temProtheus={Boolean(empresaProtheus)} />
      <DadosGrid empresaAtual={empresaAtual} empresaProtheus={empresaProtheus} />
      <EmpresaFiliaisCard filiais={filiais} loading={loading} />
      {empresaProtheus && (
        <EmpresaSyncBanner salvando={salvando} onSalvar={sincronizarComProtheus} />
      )}
    </div>
  );
}
