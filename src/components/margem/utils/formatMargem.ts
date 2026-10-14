export function formatBRL(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

export function formatPercent(valor: number): string {
  return `${(valor || 0).toFixed(1)}%`;
}

export function formatMesAno(competencia: string): string {
  if (!competencia || !competencia.includes("-")) return competencia;
  const [ano, mes] = competencia.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const idx = parseInt(mes, 10) - 1;
  const nomeMes = meses[idx] || mes;
  return `${nomeMes}/${ano.slice(2)}`;
}
