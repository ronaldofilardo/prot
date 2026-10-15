export function formatDias(dias: number | null): string {
  if (dias === null || dias === undefined) return "Sem dados";
  return `${dias.toFixed(1).replace(".", ",")} dias`;
}

export function formatAtraso(dias: number | null): string {
  if (dias === null || dias === undefined) return "Sem dados";
  if (dias === 0) return "Em dia (0 d)";
  if (dias < 0) return `${Math.abs(dias).toFixed(1).replace(".", ",")} d antecipado`;
  return `${dias.toFixed(1).replace(".", ",")} d em atraso`;
}

export function formatBRL(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

export function formatPercent(valor: number | null): string {
  if (valor === null || valor === undefined) return "—";
  return `${valor.toFixed(1).replace(".", ",")}%`;
}

export function formatMesAno(competencia: string): string {
  if (!competencia || !competencia.includes("-")) return competencia;
  const [ano, mes] = competencia.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const mIndex = parseInt(mes, 10) - 1;
  return `${meses[mIndex] || mes}/${ano}`;
}
