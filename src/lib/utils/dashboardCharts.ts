/**
 * Facade para geradores de opções de gráficos ECharts.
 * Decompõe os submódulos específicos em charts/ (Clean Architecture & Facade Pattern).
 */

export {
  getThemeColors,
  type EChartsTooltipParam,
} from "./charts/theme";

export { buildFaturamentoTempoOption } from "./charts/faturamento-tempo-option";
export { buildFaturamentoClienteOption } from "./charts/faturamento-cliente-option";
export { buildParticipacaoDonutOption } from "./charts/participacao-donut-option";
export { buildProjecaoAreaOption } from "./charts/projecao-area-option";
