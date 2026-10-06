export function parseClienteExternalId(externalId: string): { codigo: string; loja: string } {
  const idx = externalId.indexOf("-CLI-");
  if (idx === -1) {
    const parts = externalId.split("-");
    return { codigo: parts[0] || "", loja: parts[1] || "01" };
  }
  const suffix = externalId.substring(idx + 5);
  const [codigo, loja] = suffix.split("-");
  return { codigo: codigo || "", loja: loja || "01" };
}

export function parseFaturamentoExternalId(externalId: string): { filial: string; numeroNota: string } {
  const idx = externalId.indexOf("-NF-");
  if (idx === -1) {
    const parts = externalId.split("-");
    return { filial: parts[0] || "01", numeroNota: parts[1] || "" };
  }
  const suffix = externalId.substring(idx + 4);
  const [filial, numeroNota] = suffix.split("-");
  return { filial: filial || "01", numeroNota: numeroNota || "" };
}

export function parseContaReceberExternalId(externalId: string): {
  filial: string;
  prefixo: string;
  numero: string;
  parcela: string;
} {
  const idx = externalId.indexOf("-CR-");
  if (idx === -1) {
    const parts = externalId.split("-");
    return { filial: parts[0] || "01", prefixo: parts[1] || "", numero: parts[2] || "", parcela: parts[3] || "" };
  }
  const suffix = externalId.substring(idx + 4);
  const [filial, prefixo, numero, parcela] = suffix.split("-");
  return { filial: filial || "01", prefixo: prefixo || "", numero: numero || "", parcela: parcela || "" };
}

export function parseBaixaExternalId(externalId: string): {
  filial: string;
  prefixo: string;
  numero: string;
  parcela: string;
} {
  const idx = externalId.indexOf("-BX-");
  if (idx === -1) {
    const parts = externalId.split("-");
    return { filial: parts[0] || "01", prefixo: parts[1] || "", numero: parts[2] || "", parcela: parts[3] || "" };
  }
  const suffix = externalId.substring(idx + 4);
  const [filial, prefixo, numero, parcela] = suffix.split("-");
  return { filial: filial || "01", prefixo: prefixo || "", numero: numero || "", parcela: parcela || "" };
}

export function parseSaldoContabilExternalId(externalId: string): { filial: string; conta: string; competencia: string } {
  const idx = externalId.indexOf("-SC-");
  if (idx === -1) {
    const parts = externalId.split("-");
    return { filial: parts[0] || "01", conta: parts[1] || "", competencia: `${parts[2] || "0000"}-${parts[3] || "00"}` };
  }
  const suffix = externalId.substring(idx + 4);
  const parts = suffix.split("-");
  const mes = parts.pop();
  const ano = parts.pop();
  const competencia = `${ano}-${mes}`;
  const filial = parts[0] || "01";
  const conta = parts.slice(1).join("-") || "";

  return { filial, conta, competencia };
}
