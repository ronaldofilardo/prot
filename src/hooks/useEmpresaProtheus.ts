import { useState, useCallback, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { EmpresaDados, TokenStatusInfo, ProtheusFilialInfo } from "./empresa-protheus-types";

export type { EmpresaDados, TokenStatusInfo, ProtheusFilialInfo } from "./empresa-protheus-types";

type EmpresaCarga = {
  setEmpresaAtual: Dispatch<SetStateAction<EmpresaDados | null>>;
  setEmpresaProtheus: Dispatch<SetStateAction<EmpresaDados | null>>;
  setTokenInfo: Dispatch<SetStateAction<TokenStatusInfo | null>>;
  setFiliais: Dispatch<SetStateAction<ProtheusFilialInfo[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
};

type EmpresaSync = {
  setSalvando: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setSuccess: Dispatch<SetStateAction<string | null>>;
  setEmpresaAtual: Dispatch<SetStateAction<EmpresaDados | null>>;
};

async function carregarEmpresaApi(s: EmpresaCarga, customPath?: string): Promise<void> {
  s.setLoading(true);
  s.setError(null);
  try {
    const url = customPath
      ? `/api/protheus/empresa?path=${encodeURIComponent(customPath)}`
      : "/api/protheus/empresa";
    const res = await fetch(url, { method: "GET" });
    const json = await res.json();
    if (json.empresaAtual) s.setEmpresaAtual(json.empresaAtual);
    if (json.empresaProtheus) s.setEmpresaProtheus(json.empresaProtheus);
    if (json.tokenInfo) s.setTokenInfo(json.tokenInfo);
    if (json.filiais) s.setFiliais(json.filiais);
    if (!json.success && json.error) s.setError(json.error);
  } catch {
    s.setError("Falha de comunicacao com o servidor");
  } finally {
    s.setLoading(false);
  }
}

async function sincronizarEmpresaApi(s: EmpresaSync, empresaProtheus: EmpresaDados | null): Promise<void> {
  if (!empresaProtheus) return;
  s.setSalvando(true);
  s.setError(null);
  s.setSuccess(null);
  try {
    const res = await fetch("/api/protheus/empresa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: empresaProtheus.nome, cnpj: empresaProtheus.cnpj }),
    });
    const json = await res.json();
    if (!res.ok) {
      s.setError(json.error || "Erro ao salvar dados");
      return;
    }
    s.setEmpresaAtual(json.empresa);
    s.setSuccess("Dados da empresa atualizados com sucesso no sistema!");
  } catch {
    s.setError("Falha ao salvar dados da empresa");
  } finally {
    s.setSalvando(false);
  }
}

export function useEmpresaProtheus() {
  const [empresaAtual, setEmpresaAtual] = useState<EmpresaDados | null>(null);
  const [empresaProtheus, setEmpresaProtheus] = useState<EmpresaDados | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenStatusInfo | null>(null);
  const [filiais, setFiliais] = useState<ProtheusFilialInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const buscarDadosProtheus = useCallback(
    (customPath?: string) => carregarEmpresaApi({ setEmpresaAtual, setEmpresaProtheus, setTokenInfo, setFiliais, setError, setLoading }, customPath),
    [setEmpresaAtual, setEmpresaProtheus, setTokenInfo, setFiliais, setError, setLoading]
  );

  useEffect(() => {
    // Initial load is deferred so state updates land outside the effect body,
    // avoiding the cascading render that a synchronous setState would cause.
    const timer = setTimeout(() => void buscarDadosProtheus(), 0);
    return () => clearTimeout(timer);
  }, [buscarDadosProtheus]);

  const sincronizarComProtheus = () =>
    sincronizarEmpresaApi({ setSalvando, setError, setSuccess, setEmpresaAtual }, empresaProtheus);

  return {
    empresaAtual, empresaProtheus, tokenInfo, filiais, loading, salvando, error, success,
    buscarDadosProtheus, sincronizarComProtheus,
  };
}
