import type { ProtheusFilialInfo, ProtheusRow } from "../protheus-client";

export function buildFallbackClientesRows(): ProtheusRow[] {
  return [];
}

export function buildFallbackFaturamentosRows(): ProtheusRow[] {
  return [];
}

export function buildFallbackContasReceberRows(): ProtheusRow[] {
  return [];
}

export function buildFallbackContasPagarRows(): ProtheusRow[] {
  return [];
}

export function buildFallbackFilial(empresaId: string, filial: string): ProtheusFilialInfo {
  const raw = (filial || "00101001").trim();
  const is8 = raw.length === 8;
  const codFilial = is8 ? raw.substring(5, 8) : raw;
  return {
    codigoEmpresa: is8 ? raw.substring(0, 3) : (empresaId || "001"),
    codigoUnidade: is8 ? raw.substring(3, 5) : "01",
    codigoFilial: codFilial,
    filialCompleta: raw,
    nome: `Filial ${codFilial}`,
    tipo: "Filial",
    status: "Ativa",
  };
}
