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
  codigoUnidade?: string;
  codigoFilial: string;
  filialCompleta?: string;
  nome: string;
  cnpj?: string;
  tipo: "Matriz" | "Filial";
  cidade?: string;
  uf?: string;
  status?: "Ativa" | "Inativa";
  nomeFilial?: string;
  empresaVinculadaId?: string;
}

export interface FiliaisInfo {
  /** Login Protheus (ProtheusCredencial.username) cujas filiais estão listadas. */
  usuario: string | null;
  /** true = lista limitada às filiais que o usuário pode acessar. */
  restricaoAplicada: boolean;
  aviso?: string;
  /** Empresa matriz do grupo no SaaS (usada para filtrar o dashboard). */
  matrizId: string | null;
}

