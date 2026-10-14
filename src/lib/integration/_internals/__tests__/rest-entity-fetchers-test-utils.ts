import type { ProtheusRestConfig } from "../rest-types";

export const mockConfig: ProtheusRestConfig = {
  baseUrl: "https://api.example.com",
  empresaId: "emp-01",
  filial: "01",
  authMode: "basic",
  paths: {
    empresa: "/api/empresa",
    clientes: "/api/clientes",
    faturamentos: "/api/faturamentos",
    contasReceber: "/api/contas-receber",
    baixas: "/api/baixas",
    saldosContabeis: "/api/saldos",
  },
};
