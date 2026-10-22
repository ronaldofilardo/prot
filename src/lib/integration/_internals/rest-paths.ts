export const EMPRESA_FALLBACK_PATHS: string[] = [
  "/rest/api/framework/v1/genericQuery?tables=SM0&fields=M0_CODIGO,M0_CODFIL,M0_NOME,M0_CGC&pageSize=1",
  "/rest/api/protheus/v1/companies",
  "/api/protheus/v1/companies",
  "/rest/api/protheus/v1/company",
  "/api/protheus/v1/company",
  "/rest/api/framework/v1/companies",
];

export const FILIAIS_FALLBACK_PATHS: string[] = [
  // SA1 com campos de filial, código, nome e CNPJ (validado no Protheus Cloud)
  "/rest/api/framework/v1/genericQuery?tables=SA1&fields=A1_COD,A1_NOME,A1_FILIAL,A1_CGC&pageSize=500",
  // SM0 = tabela oficial de cadastro de empresas/filiais no Protheus
  "/rest/api/framework/v1/genericQuery?tables=SM0&fields=M0_CODIGO,M0_CODFIL,M0_NOME,M0_NOMECOM,M0_CGC,M0_CIDENT,M0_FILIAL&pageSize=500",
  // Monitor NG / RH do Protheus Cloud (devolve CDFILIAL e CDFILDESC de todas as filiais ativas)
  "/rest/api/rh/v1/monitor-ng/filiais",
  "/rest/api/framework/v1/branches",
  "/api/framework/v1/branches",
  "/rest/api/protheus/v1/filiais",
  "/api/protheus/v1/filiais",
  "/rest/api/v1/branches",
];

// Filiais do usuario: SM0 (cadastro de empresas/filiais). NUNCA a SA1 (clientes).
export const SM0_FILIAIS_PATHS: string[] = [
  "/rest/api/framework/v1/genericQuery?tables=SM0&fields=M0_CODIGO,M0_CODFIL,M0_FILIAL,M0_NOME,M0_NOMECOM,M0_CGC,M0_CIDENT,M0_ESTENT&pageSize=500",
  // Em releases recentes a SM0 e fisicamente a tabela SYS_COMPANY (mesmos campos M0_*).
  "/rest/api/framework/v1/genericQuery?tables=SYS_COMPANY&fields=M0_CODIGO,M0_CODFIL,M0_FILIAL,M0_NOME,M0_NOMECOM,M0_CGC,M0_CIDENT,M0_ESTENT&pageSize=500",
  // Monitor NG / RH do Protheus Cloud (devolve CDFILIAL e CDFILDESC de todas as filiais ativas)
  "/rest/api/rh/v1/monitor-ng/filiais",
  "/rest/api/framework/v1/branches",
  "/api/framework/v1/branches",
];

// Cadastro de usuarios e de acesso a filiais (configurador do Protheus).
// Os nomes de tabela/campo podem variar por release: sobrescreva por .env
// (PROTHEUS_REST_USUARIOS_PATH / PROTHEUS_REST_FILIAIS_ACESSO_PATH).
export const USUARIOS_PATH =
  "/rest/api/framework/v1/genericQuery?tables=SYS_USR&fields=USR_ID,USR_CODIGO,USR_NOME&pageSize=500";
export const ACESSO_FILIAIS_PATH =
  "/rest/api/framework/v1/genericQuery?tables=SYS_USR_FILIAL&fields=USR_ID,USR_GRUPEMP,USR_FILIAL&pageSize=500";

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
  "/rest/api/framework/v1/genericQuery?tables=SE1&fields=E1_FILIAL,E1_PREFIXO,E1_NUM,E1_PARCELA,E1_TIPO,E1_CLIENTE,E1_LOJA,E1_EMISSAO,E1_VENCTO,E1_VALOR,E1_SALDO,E1_BAIXA",
  "/api/protheus/v1/financeiro/contasareceber",
  "/rest/api/protheus/v1/contas-receber",
  "/api/protheus/v1/contas-receber",
  "/rest/api/v1/bills-to-receive",
];

export const CONTAS_PAGAR_FALLBACK_PATHS: string[] = [
  "/rest/api/framework/v1/genericQuery?tables=SE2&fields=E2_FILIAL,E2_PREFIXO,E2_NUM,E2_PARCELA,E2_TIPO,E2_FORNECE,E2_LOJA,E2_NOMFOR,E2_EMISSAO,E2_VENCTO,E2_VALOR,E2_SALDO,E2_BAIXA",
  "/api/protheus/v1/financeiro/contasapagar",
  "/rest/api/protheus/v1/contas-pagar",
  "/api/protheus/v1/contas-pagar",
  "/rest/api/v1/bills-to-pay",
];

export const BAIXAS_FALLBACK_PATHS: string[] = [
  "/rest/api/framework/v1/genericQuery?tables=SE5&fields=E5_FILIAL,E5_PREFIXO,E5_NUMERO,E5_PARCELA,E5_TIPO,E5_VALOR,E5_DATA,E5_RECPAG,E5_SEQ,E5_CLIFOR,E5_LOJA,E5_TIPODOC,E5_SITUACA,E5_MOTBX",
  "/api/protheus/v1/financeiro/baixas",
  "/api/protheus/v1/financeiro/movimentos",
  "/rest/api/protheus/v1/baixas",
  "/api/protheus/v1/baixas",
];

export const SALDOS_CONTABEIS_FALLBACK_PATHS: string[] = [
  // CQ0 (Protheus 12+): saldo por conta no mês, colunas wide (CQ0_DEB01..12 etc).
  // Sem "fields" para o Protheus devolver todas as colunas; expandCq0ToLong converte para o formato longo.
  "/rest/api/framework/v1/genericQuery?tables=CQ0&pageSize=500",
  // Fallback: se o sem-fields falhar, pede só os campos de identificação (o adapter expande os meses que vierem)
  "/rest/api/framework/v1/genericQuery?tables=CQ0&fields=CQ0_FILIAL,CQ0_CONTA,CQ0_ANO,CQ0_MOEDA,CQ0_TPSALD,CQ0_SLDANT&pageSize=500",
  "/api/protheus/v1/contabilidade/saldos",
  "/rest/api/protheus/v1/saldos-contabeis",
];

export const ITENS_VENDA_FALLBACK_PATHS: string[] = [
  "/rest/api/framework/v1/genericQuery?tables=SD2&fields=D2_FILIAL,D2_DOC,D2_SERIE,D2_CLIENTE,D2_LOJA,D2_ITEM,D2_COD,D2_EMISSAO,D2_QUANT,D2_TOTAL,D2_CUSTO1,D2_CF,D2_TES,D2_TIPO,D2_QTDEDEV,D2_VALDEV",
  "/api/protheus/v1/faturamento/itens",
  "/rest/api/protheus/v1/itens-venda",
];

export function buildCandidatePaths(
  customPath: string | undefined,
  sources: Array<string | undefined>
): string[] {
  const result: string[] = [];
  if (customPath) {
    result.push(customPath);
  }
  for (const s of sources) {
    if (s && !result.includes(s)) {
      result.push(s);
    }
  }
  return result;
}
