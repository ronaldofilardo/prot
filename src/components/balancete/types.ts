export interface SaldoContabilRow {
  id: string;
  filial: string;
  conta: string;
  competencia: string;
  exercicio: string;
  saldoAnterior: number;
  debitos: number;
  creditos: number;
  saldoAtual: number;
  empresaId: string;
}

export interface BalanceteDTO {
  id: string;
  filial: string;
  conta: string;
  competencia: string;
  saldoAnteriorFormatado: string;
  debitosFormatados: string;
  creditosFormatados: string;
  saldoAtualFormatado: string;
}

export interface BalanceteFilters {
  exercicio: string;
  filial: string;
}
