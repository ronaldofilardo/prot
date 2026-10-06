export const EMPRESA_FALLBACK_PATHS: string[] = [
  "/rest/api/framework/v1/genericQuery?tables=SA1&fields=A1_NOME,A1_CGC&pageSize=1",
  "/rest/api/protheus/v1/companies",
  "/api/protheus/v1/companies",
  "/rest/api/protheus/v1/company",
  "/api/protheus/v1/company",
  "/rest/api/framework/v1/companies",
];

export const FILIAIS_FALLBACK_PATHS: string[] = [
  "/rest/api/framework/v1/genericQuery?tables=SA1&fields=A1_FILIAL,A1_MUN,A1_EST&pageSize=500",
  "/rest/api/framework/v1/genericQuery?tables=SF2&fields=F2_FILIAL&pageSize=500",
  "/rest/api/framework/v1/genericQuery?tables=SB1&fields=B1_FILIAL&pageSize=500",
  "/rest/api/framework/v1/branches",
  "/api/framework/v1/branches",
  "/rest/api/protheus/v1/filiais",
  "/api/protheus/v1/filiais",
  "/rest/api/v1/branches",
];

export const CLIENTES_FALLBACK_PATHS: string[] = [
  "/rest/api/framework/v1/genericQuery?tables=SA1&fields=A1_COD,A1_LOJA,A1_NOME,A1_CGC,A1_PESSOA,A1_TIPO,A1_MUN,A1_EST,A1_FILIAL",
  "/api/protheus/v1/comercial/clientes",
  "/api/protheus/v1/cadastros/clientes",
  "/rest/api/protheus/v1/clientes",
  "/api/protheus/v1/clientes",
  "/rest/api/v1/customers",
];

export const FATURAMENTOS_FALLBACK_PATHS: string[] = [
  "/rest/api/framework/v1/genericQuery?tables=SF2&fields=F2_DOC,F2_SERIE,F2_CLIENTE,F2_LOJA,F2_EMISSAO,F2_VALMERC,F2_VALBRUT,F2_FILIAL",
  "/api/protheus/v1/fiscal/notas",
  "/api/protheus/v1/faturamento/notas",
  "/rest/api/protheus/v1/faturamentos",
  "/api/protheus/v1/faturamentos",
  "/rest/api/v1/invoices",
];

export const CONTAS_RECEBER_FALLBACK_PATHS: string[] = [
  "/rest/api/framework/v1/genericQuery?tables=SE1&fields=E1_FILIAL,E1_PREFIXO,E1_NUM,E1_PARCELA,E1_TIPO,E1_CLIENTE,E1_LOJA,E1_EMISSAO,E1_VENCTO,E1_VALOR",
  "/api/protheus/v1/financeiro/contasareceber",
  "/rest/api/protheus/v1/contas-receber",
  "/api/protheus/v1/contas-receber",
  "/rest/api/v1/bills-to-receive",
];

export const BAIXAS_FALLBACK_PATHS: string[] = [
  "/rest/api/framework/v1/genericQuery?tables=SE5&fields=E5_FILIAL,E5_PREFIXO,E5_NUM,E5_PARCELA,E5_TIPO,E5_VALOR,E5_BAIXA,E5_FILBAI",
  "/api/protheus/v1/financeiro/baixas",
  "/api/protheus/v1/financeiro/movimentos",
  "/rest/api/protheus/v1/baixas",
  "/api/protheus/v1/baixas",
];

export function buildCandidatePaths(
  customPath: string | undefined,
  sources: Array<string | undefined>
): string[] {
  if (customPath) {
    return [customPath];
  }
  return Array.from(new Set(sources.filter((p): p is string => Boolean(p))));
}
