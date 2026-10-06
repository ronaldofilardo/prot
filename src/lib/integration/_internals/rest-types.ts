import type { IProtheusTokenProvider } from "../protheus-token-provider";

export interface ProtheusRestConfig {
  baseUrl: string;
  authMode: "bearer" | "basic" | "oauth2";
  username?: string;
  password?: string;
  token?: string;
  tokenProvider?: IProtheusTokenProvider;
  empresaSaaSId?: string;
  empresaId: string; // empresa Protheus (código da empresa no ERP, não o id do tenant SaaS)
  filial: string;
  paths: {
    empresa?: string;
    clientes?: string;
    faturamentos?: string;
    contasReceber?: string;
    baixas?: string;
    saldosContabeis?: string;
  };
}
