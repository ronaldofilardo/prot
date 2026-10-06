import type { EmpresaAtual } from "./empresa-query";
import type { TokenInfo } from "./token-info";

export interface FilialView {
  id?: string;
  codigoEmpresa: string;
  codigoUnidade?: string;
  codigoFilial: string;
  filialCompleta?: string;
  nome: string;
  cnpj?: string;
  tipo: "Matriz" | "Filial";
  status: "Ativa";
}

function decomporFilial(raw: string, fallbackEmpresa: string = "001") {
  const f = raw.trim();
  if (f.length === 8) {
    return {
      codigoEmpresa: f.substring(0, 3),
      codigoUnidade: f.substring(3, 5),
      codigoFilial: f.substring(5, 8),
      filialCompleta: f,
    };
  }
  return {
    codigoEmpresa: fallbackEmpresa,
    codigoUnidade: "01",
    codigoFilial: f || "01",
    filialCompleta: f || `${fallbackEmpresa}0101`,
  };
}

export function buildFiliaisLocais(filiais: EmpresaAtual["filiais"]): FilialView[] {
  return (filiais || []).map((f, idx) => {
    const cod = String(idx + 2).padStart(3, "0");
    return {
      id: f.id,
      codigoEmpresa: "001",
      codigoUnidade: "01",
      codigoFilial: cod,
      filialCompleta: `00101${cod}`,
      nome: f.nome,
      cnpj: f.cnpj || undefined,
      tipo: "Filial" as const,
      status: "Ativa" as const,
    };
  });
}

export function buildFiliaisPadrao(
  empresaAtual: EmpresaAtual,
  tokenInfo: TokenInfo | null
): FilialView[] {
  const rawFilial = process.env.PROTHEUS_FILIAL || "00101001";
  const rawEmpresa = process.env.PROTHEUS_EMPRESA_ID || "001";
  const { codigoEmpresa, codigoUnidade, codigoFilial, filialCompleta } = decomporFilial(rawFilial, rawEmpresa);

  return [
    {
      codigoEmpresa,
      codigoUnidade,
      codigoFilial,
      filialCompleta,
      nome: tokenInfo?.clienteProtheus ? `${tokenInfo.clienteProtheus} - MATRIZ` : "LC1 CONTADORES - MATRIZ",
      cnpj: empresaAtual.cnpj || undefined,
      tipo: "Matriz" as const,
      status: "Ativa" as const,
    },
    ...buildFiliaisLocais(empresaAtual.filiais),
  ];
}
