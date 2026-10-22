const MESES = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

function num(v: string | undefined): number {
  const n = parseFloat(v || "0");
  return Number.isFinite(n) ? n : 0;
}

function get(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
}

/**
 * CQ0 armazena 12 meses em colunas (CQ0_DEB01..12, CQ0_CRE01..12, CQ0_SLD01..12).
 * O sync espera 1 linha por competência (YYYY-MM). Esta função expande uma linha
 * wide da CQ0 em até 12 linhas no formato CQ_* que o adapter já entende.
 *
 * Filtra moeda 01 e tipo de saldo 1 (realizado) para não duplicar na chave
 * [filial, conta, competencia, empresaId].
 *
 * saldoAnterior do mês N = saldo atual do mês N-1 (ano anterior usa CQ0_SLDANT).
 * Retorna [] se a linha já estiver no formato longo (compatibilidade) ou se
 * moeda/tipo não correspondem.
 */
export function expandCq0ToLong(row: Record<string, string>): Record<string, string>[] {
  const filial = get(row, "CQ0_FILIAL", "CQ_FILIAL");
  const conta = get(row, "CQ0_CONTA", "CQ_CONTA");

  if (!filial && !conta) return [];

  const mesRef = get(row, "CQ_MES");
  if (mesRef) return [row];

  const moeda = get(row, "CQ0_MOEDA", "CQ_MOEDA") || "01";
  const tpsald = get(row, "CQ0_TPSALD", "CQ_TPSALD") || "1";
  if (moeda !== "01" || tpsald !== "1") return [];

  const ano = get(row, "CQ0_ANO", "CQ_ANO");
  if (!ano) return [];

  const sldAnt = num(get(row, "CQ0_SLDANT", "CQ_SALANT"));
  const out: Record<string, string>[] = [];
  let abertura = sldAnt;

  for (const mes of MESES) {
    const deb = num(get(row, `CQ0_DEB${mes}`));
    const cre = num(get(row, `CQ0_CRE${mes}`));
    const sld = num(get(row, `CQ0_SLD${mes}`));
    const temMovimento = deb !== 0 || cre !== 0 || sld !== 0 || abertura !== 0;
    if (!temMovimento && mes !== "01") {
      abertura = sld;
      continue;
    }

    out.push({
      CQ_FILIAL: filial,
      CQ_CONTA: conta,
      CQ_MES: mes,
      CQ_ANO: ano,
      CQ_SALANT: String(abertura),
      CQ_DEB: String(deb),
      CQ_CRED: String(cre),
      CQ_SALDO: String(sld),
    });
    abertura = sld;
  }

  return out;
}

export function expandCq0Rows(rows: Record<string, string>[]): Record<string, string>[] {
  return rows.flatMap(expandCq0ToLong);
}
