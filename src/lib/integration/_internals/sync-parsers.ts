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

export function parseFaturamentoExternalId(externalId: string): { filial: string; numeroNota: string; serie?: string } {
  const idx = externalId.indexOf("-NF-");
  const suffix = idx === -1 ? externalId : externalId.substring(idx + 4);
  const parts = suffix.split("-");
  const res: { filial: string; numeroNota: string; serie?: string } = {
    filial: parts[0] || "01",
    numeroNota: parts[1] || "",
  };
  if (parts[2] !== undefined && parts[2] !== "") {
    res.serie = parts[2];
  }
  return res;
}

export function parseContaReceberExternalId(externalId: string): {
  filial: string;
  prefixo: string;
  numero: string;
  parcela: string;
  tipo?: string;
} {
  const idx = externalId.indexOf("-CR-");
  const suffix = idx === -1 ? externalId : externalId.substring(idx + 4);
  const parts = suffix.split("-");
  const res: { filial: string; prefixo: string; numero: string; parcela: string; tipo?: string } = {
    filial: parts[0] || "01",
    prefixo: parts[1] || "",
    numero: parts[2] || "",
    parcela: parts[3] || "",
  };
  if (parts[4] !== undefined && parts[4] !== "") {
    res.tipo = parts[4];
  }
  return res;
}

export function parseBaixaExternalId(externalId: string): {
  filial: string;
  prefixo: string;
  numero: string;
  parcela: string;
  tipo?: string;
} {
  const idx = externalId.indexOf("-BX-");
  const suffix = idx === -1 ? externalId : externalId.substring(idx + 4);
  const parts = suffix.split("-");
  const res: { filial: string; prefixo: string; numero: string; parcela: string; tipo?: string } = {
    filial: parts[0] || "01",
    prefixo: parts[1] || "",
    numero: parts[2] || "",
    parcela: parts[3] || "",
  };
  if (parts.length >= 6 && parts[4]) {
    res.tipo = parts[4];
  }
  return res;
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

export function parseItemVendaExternalId(externalId: string): {
  filial: string;
  numeroNota: string;
  serie: string;
  clienteCodigo: string;
  clienteLoja: string;
  item: string;
} {
  const idx = externalId.indexOf("-IT-");
  const suffix = idx === -1 ? externalId : externalId.substring(idx + 4);
  const [filial, numeroNota, serie, clienteCodigo, clienteLoja, item] = suffix.split("-");
  return {
    filial: filial || "01",
    numeroNota: numeroNota || "",
    serie: serie || "",
    clienteCodigo: clienteCodigo || "",
    clienteLoja: clienteLoja || "01",
    item: item || "01",
  };
}

export function parseContaPagarExternalId(externalId: string): {
  filial: string;
  prefixo: string;
  numero: string;
  parcela: string;
  tipo: string;
  fornecedorCodigo: string;
  fornecedorLoja: string;
} {
  const idx = externalId.indexOf("-CP-");
  const suffix = idx === -1 ? externalId : externalId.substring(idx + 4);
  const [filial, prefixo, numero, parcela, tipo, fornecedorCodigo, fornecedorLoja] = suffix.split("-");
  return {
    filial: filial || "01",
    prefixo: prefixo || "",
    numero: numero || "",
    parcela: parcela || "",
    tipo: tipo || "NF",
    fornecedorCodigo: fornecedorCodigo || "",
    fornecedorLoja: fornecedorLoja || "01",
  };
}

export function parseBaixaPagarExternalId(externalId: string): {
  filial: string;
  prefixo: string;
  numero: string;
  parcela: string;
  tipo: string;
  fornecedorCodigo: string;
  fornecedorLoja: string;
} {
  const idx = externalId.indexOf("-BXP-");
  const suffix = idx === -1 ? externalId : externalId.substring(idx + 5);
  const [filial, prefixo, numero, parcela, tipo, fornecedorCodigo, fornecedorLoja] = suffix.split("-");
  return {
    filial: filial || "01",
    prefixo: prefixo || "",
    numero: numero || "",
    parcela: parcela || "",
    tipo: tipo || "NF",
    fornecedorCodigo: fornecedorCodigo || "",
    fornecedorLoja: fornecedorLoja || "01",
  };
}
