import type { EmpresaAtual } from "./empresa-query";
import type { TokenInfo } from "./token-info";

export interface FilialView {
  id?: string;
  codigoEmpresa: string;
  codigoFilial: string;
  nome: string;
  cnpj?: string;
  tipo: "Matriz" | "Filial";
  status: "Ativa";
}

export function buildFiliaisLocais(filiais: EmpresaAtual["filiais"]): FilialView[] {
  return (filiais || []).map((f, idx) => ({
    id: f.id,
    codigoEmpresa: "01",
    codigoFilial: String(idx + 2).padStart(2, "0"),
    nome: f.nome,
    cnpj: f.cnpj || undefined,
    tipo: "Filial" as const,
    status: "Ativa" as const,
  }));
}

export function buildFiliaisPadrao(
  empresaAtual: EmpresaAtual,
  tokenInfo: TokenInfo | null
): FilialView[] {
  return [
    {
      codigoEmpresa: process.env.PROTHEUS_EMPRESA_ID || "001",
      codigoFilial: process.env.PROTHEUS_FILIAL || "00101001",
      nome: tokenInfo?.clienteProtheus ? `${tokenInfo.clienteProtheus} - MATRIZ` : "LC1 CONTADORES - MATRIZ",
      cnpj: empresaAtual.cnpj || undefined,
      tipo: "Matriz" as const,
      status: "Ativa" as const,
    },
    ...buildFiliaisLocais(empresaAtual.filiais),
  ];
}
