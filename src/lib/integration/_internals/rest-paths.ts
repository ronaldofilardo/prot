export const EMPRESA_FALLBACK_PATHS: string[] = [
  "/rest/api/protheus/v1/companies",
  "/api/protheus/v1/companies",
  "/rest/api/protheus/v1/company",
  "/api/protheus/v1/company",
  "/rest/api/protheus/v1/customers",
  "/api/protheus/v1/customers",
  "/rest/api/framework/v1/companies",
];

export const FILIAIS_FALLBACK_PATHS: string[] = [
  "/rest/api/framework/v1/branches",
  "/api/framework/v1/branches",
  "/rest/api/protheus/v1/filiais",
  "/api/protheus/v1/filiais",
  "/rest/api/v1/branches",
  "/api/v1/branches",
  "/rest/api/framework/v1/companies",
];

export const CLIENTES_FALLBACK_PATHS: string[] = [
  "/api/protheus/v1/comercial/clientes",
  "/api/protheus/v1/cadastros/clientes",
  "/rest/api/protheus/v1/clientes",
  "/api/protheus/v1/clientes",
  "/rest/api/v1/customers",
  "/api/v1/customers",
  "/rest/api/framework/v1/customers",
  "/rest/clientes",
  "/rest/customers",
];

export const FATURAMENTOS_FALLBACK_PATHS: string[] = [
  "/api/protheus/v1/fiscal/notas",
  "/api/protheus/v1/faturamento/notas",
  "/rest/api/protheus/v1/faturamentos",
  "/api/protheus/v1/faturamentos",
  "/rest/api/v1/invoices",
  "/api/v1/invoices",
  "/rest/api/framework/v1/invoices",
  "/rest/faturamentos",
  "/rest/invoices",
];

export const CONTAS_RECEBER_FALLBACK_PATHS: string[] = [
  "/api/protheus/v1/financeiro/contasareceber",
  "/rest/api/protheus/v1/contas-receber",
  "/api/protheus/v1/contas-receber",
  "/rest/api/v1/bills-to-receive",
  "/api/v1/bills-to-receive",
  "/rest/api/framework/v1/billsToReceive",
  "/rest/contas-receber",
  "/rest/titulos",
];

export const BAIXAS_FALLBACK_PATHS: string[] = [
  "/api/protheus/v1/financeiro/baixas",
  "/api/protheus/v1/financeiro/movimentos",
  "/rest/api/protheus/v1/baixas",
  "/api/protheus/v1/baixas",
  "/rest/api/v1/write-offs",
  "/api/v1/write-offs",
  "/rest/api/framework/v1/writeOffs",
  "/rest/baixas",
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
