"use client";

import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useEmpresaProtheus } from "@/hooks/useEmpresaProtheus";
import { EmpresaDadosCard } from "./common/EmpresaDadosCard";
import { EmpresaHeaderAction } from "./common/EmpresaHeaderAction";
import { TokenStatusCard } from "./common/TokenStatusCard";
import { ProtheusCredenciaisCard } from "./common/ProtheusCredenciaisCard";
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

export function EmpresaProtheusPanel() {
  const {
    empresaAtual,
    empresaProtheus,
    tokenInfo,
    filiais,
    loading,
    salvando,
    error,
    success,
    buscarDadosProtheus,
    sincronizarComProtheus,
  } = useEmpresaProtheus();

  const dadosExibicao = empresaAtual || empresaProtheus;
  const temDivergencia = Boolean(empresaProtheus && empresaAtual && empresaProtheus.nome !== empresaAtual.nome);

  return (
    <div className="space-y-6">
      <EmpresaHeaderAction loading={loading} onBuscar={buscarDadosProtheus} />
      <TokenStatusCard tokenInfo={tokenInfo} />
      <ProtheusCredenciaisCard onSuccess={buscarDadosProtheus} />
      <MensagensPainel success={success} error={error} temProtheus={Boolean(empresaProtheus)} />
      <EmpresaDadosCard
        dados={dadosExibicao}
        filialPadrao={filiais[0]}
        badge={tokenInfo?.ativo ? "Conectado" : "Pendente"}
        badgeColor={tokenInfo?.ativo ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"}
      />
      <EmpresaFiliaisCard filiais={filiais} loading={loading} />
      {temDivergencia && (
        <EmpresaSyncBanner
          salvando={salvando}
          onSalvar={sincronizarComProtheus}
          empresaProtheusNome={empresaProtheus?.nome}
        />
      )}
    </div>
  );
}

