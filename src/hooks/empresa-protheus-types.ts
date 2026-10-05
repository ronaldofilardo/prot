export interface EmpresaDados {
  id?: string;
  nome: string;
  cnpj: string | null;
  codigoEmpresa?: string;
  codigoFilial?: string;
  clienteId?: string;
  usuarioLogado?: string;
  ambiente?: string;
}

export interface TokenStatusInfo {
  ativo: boolean;
  clienteProtheus?: string;
  clienteId?: string;
  ambiente: string;
  usuario: string;
  expiraEm: string;
  tokenPreview: string;
}

export interface ProtheusFilialInfo {
  id?: string;
  codigoEmpresa: string;
  codigoFilial: string;
  nome: string;
  cnpj?: string;
  tipo: "Matriz" | "Filial";
  cidade?: string;
  uf?: string;
  status?: "Ativa" | "Inativa";
}
