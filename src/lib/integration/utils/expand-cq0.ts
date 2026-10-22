const MESES = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

function num(v: unknown): number {
  const n = parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

function get(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k] ?? row[k.toUpperCase()] ?? row[k.toLowerCase()];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return "";
}

function parseDataMes(data: string): { mes: string; ano: string } {
  const clean = data.replace(/[^\d]/g, "");
  if (clean.length !== 8) return { mes: "", ano: "" };
  return { ano: clean.substring(0, 4), mes: clean.substring(4, 6) };
}

function montarLinhaWide(filial: string, conta: string, mes: string, ano: string, abertura: number, deb: number, cre: number, sld: number): Record<string, string> {
  return {
    CQ_FILIAL: filial,
    CQ_CONTA: conta,
    CQ_MES: mes,
    CQ_ANO: ano,
    CQ_SALANT: String(abertura),
    CQ_DEB: String(deb),
    CQ_CRED: String(cre),
    CQ_SALDO: String(sld),
  };
}

function expandWideRow(row: Record<string, string>, filial: string, conta: string): Record<string, string>[] {
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

    out.push(montarLinhaWide(filial, conta, mes, ano, abertura, deb, cre, sld));
    abertura = sld;
  }

  return out;
}

/**
 * Converte uma linha da CQ0 no formato long (1 linha por conta/mês, colunas
 * CQ0_DATA, CQ0_DEBITO, CQ0_CREDIT) — formato real do Protheus Cloud 12.
 * O saldo não vem na API e é preenchido por expandCq0Rows (acumulado).
 */
function expandLongRow(row: Record<string, string>, filial: string, conta: string): Record<string, string>[] {
  const { mes, ano } = parseDataMes(get(row, "CQ0_DATA", "CQ_DATA"));
  if (!mes || !ano) return [];
  return [
    {
      CQ_FILIAL: filial,
      CQ_CONTA: conta,
      CQ_MES: mes,
      CQ_ANO: ano,
      CQ_DEB: String(num(get(row, "CQ0_DEBITO", "CQ_DEBITO"))),
      CQ_CRED: String(num(get(row, "CQ0_CREDIT", "CQ_CREDIT"))),
    },
  ];
}

function isWideRow(row: Record<string, string>): boolean {
  return MESES.some((m) => get(row, `CQ0_DEB${m}`) !== "" || get(row, `CQ0_SLD${m}`) !== "");
}

/**
 * CQ0 tem dois formatos possíveis:
 * - Long (Protheus Cloud 12): 1 linha por conta/mês com CQ0_DATA, CQ0_DEBITO, CQ0_CREDIT.
 * - Wide (on-prem): 1 linha por conta/ano com colunas CQ0_DEB01..12, CQ0_CRE01..12, CQ0_SLD01..12.
 * Ambos são convertidos para o formato long canônico CQ_* que o adapter entende.
 *
 * Filtra moeda 01 e tipo de saldo 1 (realizado) para não duplicar na chave
 * [filial, conta, competencia, empresaId].
 */
function ehSaldoRealizado(row: Record<string, string>): boolean {
  const moeda = get(row, "CQ0_MOEDA", "CQ_MOEDA") || "01";
  const tpsald = get(row, "CQ0_TPSALD", "CQ_TPSALD") || "1";
  return moeda === "01" && tpsald === "1";
}

type FormatoCq0 = "long" | "wide" | "desconhecido";

function detectarFormato(row: Record<string, string>): FormatoCq0 {
  if (get(row, "CQ0_DATA", "CQ_DATA")) return "long";
  if (isWideRow(row) || get(row, "CQ0_ANO", "CQ_ANO")) return "wide";
  return "desconhecido";
}

export function expandCq0ToLong(row: Record<string, string>): Record<string, string>[] {
  if (get(row, "CQ_MES")) return [row];

  const filial = get(row, "CQ0_FILIAL", "CQ_FILIAL");
  const conta = get(row, "CQ0_CONTA", "CQ_CONTA");
  if (!filial && !conta) return [];
  if (!ehSaldoRealizado(row)) return [];

  const formato = detectarFormato(row);
  if (formato === "long") return expandLongRow(row, filial, conta);
  if (formato === "wide") return expandWideRow(row, filial, conta);
  return [];
}

function computeAccumulatedBalances(rows: Record<string, string>[]): void {
  const groups = new Map<string, Record<string, string>[]>();
  for (const row of rows) {
    if (get(row, "CQ_SALDO")) continue;
    const key = `${get(row, "CQ_FILIAL")}|${get(row, "CQ_CONTA")}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => `${get(a, "CQ_ANO")}${get(a, "CQ_MES")}`.localeCompare(`${get(b, "CQ_ANO")}${get(b, "CQ_MES")}`));
    let saldo = 0;
    for (const row of list) {
      const deb = num(get(row, "CQ_DEB"));
      const cred = num(get(row, "CQ_CRED"));
      row.CQ_SALANT = String(money(saldo));
      saldo = money(saldo + deb - cred);
      row.CQ_SALDO = String(saldo);
    }
  }
}

export function expandCq0Rows(rows: Record<string, string>[]): Record<string, string>[] {
  const expanded = rows.flatMap(expandCq0ToLong);
  computeAccumulatedBalances(expanded);
  return expanded;
}
