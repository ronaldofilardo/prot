/**
 * Facade / Barrel para cálculos e transformações de métricas do Dashboard.
 * Encapsula os módulos especializados de domínio (Clean Architecture & Facade Pattern).
 */

export {
  filtrarFaturamentos,
  filtrarContasReceber,
} from "./metrics-filter";

export {
  calcularKPIs,
  type KPIsCalculados,
} from "./metrics-kpi";

export {
  formatMesAno,
  proximoMes,
  parseMesAno,
  buildProjecao,
} from "./metrics-projection";

export {
  buildFaturamentoMes,
  buildFaturamentoCliente,
  buildRegiaoParticipacao,
  buildTabelaNotas,
} from "./metrics-grouping";
