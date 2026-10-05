import { useState, useCallback, useEffect } from "react";
import type { EmpresaDados, TokenStatusInfo, ProtheusFilialInfo } from "./empresa-protheus-types";

export type { EmpresaDados, TokenStatusInfo, ProtheusFilialInfo } from "./empresa-protheus-types";

export function useEmpresaProtheus() {
  const [empresaAtual, setEmpresaAtual] = useState<EmpresaDados | null>(null);
  const [empresaProtheus, setEmpresaProtheus] = useState<EmpresaDados | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenStatusInfo | null>(null);
  const [filiais, setFiliais] = useState<ProtheusFilialInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const carregarDados = useCallback(async (customPath?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = customPath
        ? `/api/protheus/empresa?path=${encodeURIComponent(customPath)}`
        : "/api/protheus/empresa";
      const res = await fetch(url, { method: "GET" });
      const json = await res.json();

      if (json.empresaAtual) {
        setEmpresaAtual(json.empresaAtual);
      }
      if (json.empresaProtheus) {
        setEmpresaProtheus(json.empresaProtheus);
      }
      if (json.tokenInfo) {
        setTokenInfo(json.tokenInfo);
      }
      if (json.filiais) {
        setFiliais(json.filiais);
      }
      if (!json.success && json.error) {
        setError(json.error);
      }
    } catch {
      setError("Falha de comunicacao com o servidor");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load is deferred so state updates land outside the effect body,
    // avoiding the cascading render that a synchronous setState would cause.
    const timer = setTimeout(() => void carregarDados(), 0);
    return () => clearTimeout(timer);
  }, [carregarDados]);

  const sincronizarComProtheus = async () => {
    if (!empresaProtheus) return;
    setSalvando(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/protheus/empresa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: empresaProtheus.nome,
          cnpj: empresaProtheus.cnpj,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Erro ao salvar dados");
        return;
      }

      setEmpresaAtual(json.empresa);
      setSuccess("Dados da empresa atualizados com sucesso no sistema!");
    } catch {
      setError("Falha ao salvar dados da empresa");
    } finally {
      setSalvando(false);
    }
  };

  return {
    empresaAtual,
    empresaProtheus,
    tokenInfo,
    filiais,
    loading,
    salvando,
    error,
    success,
    buscarDadosProtheus: carregarDados,
    sincronizarComProtheus,
  };
}
