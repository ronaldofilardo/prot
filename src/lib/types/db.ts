export type DecimalValue = number | string | { toNumber?: () => number; toString?: () => string };

export interface ClienteDB {
  id: string;
  codigo: string;
  loja: string;
  nome: string;
  cidade: string;
  estado: string;
  ativo: boolean;
  empresaId: string;
}

export interface FaturamentoDB {
  id: string;
  filial: string;
  numeroNota: string;
  dataEmissao: Date | string;
  valorTotal: DecimalValue;
  clienteId: string;
  empresaId: string;
  cliente: {
    id: string;
    nome: string;
    codigo: string;
    estado: string | null;
  };
}

export interface BaixaDB {
  id: string;
  filial: string;
  filialBaixa: string;
  prefixo: string;
  numero: string;
  parcela: string;
  tipo: string;
  valorBaixa: DecimalValue;
  dataBaixa: Date | string;
  contaReceberId: string;
  empresaId: string;
}

export interface ContaReceberDB {
  id: string;
  filial: string;
  prefixo: string;
  numero: string;
  parcela: string;
  tipo: string;
  dataEmissao: Date | string;
  vencimento: Date | string;
  valor: DecimalValue;
  clienteId: string;
  empresaId: string;
  cliente: {
    id: string;
    nome: string;
    codigo: string;
  };
  baixas: Array<{
    valorBaixa: DecimalValue;
  }>;
}
