import type { FaturamentoTempo } from "@/components/charts/FaturamentoTempoChart";
import { getThemeColors, type EChartsTooltipParam } from "./theme";
import {
  brl,
  categoryAxis,
  gridTop18,
  legendTopRight,
  tooltipFrame,
  valueAxis,
  verticalGradient,
  type ThemeColors,
} from "./option-common";

function tempoFormatter(c: ThemeColors) {
  return (params: EChartsTooltipParam[]) => {
    const p = params[0];
    return `<div>
          <span style="font-size:11px;color:${c.tooltipTitle};font-weight:600;">${p.name}</span><br/>
          <span style="font-size:13px;color:${c.blue};font-weight:700;">R$ ${brl(Number(p.value))}</span>
        </div>`;
  };
}

function serieFaturamentoReal(c: ThemeColors, dados: FaturamentoTempo[]) {
  return {
    name: "Faturamento Real",
    type: "line",
    smooth: 0.35,
    showSymbol: false,
    symbolSize: 6,
    lineStyle: { width: 3, color: c.blue },
    areaStyle: {
      color: verticalGradient([
        { offset: 0, color: "rgba(59, 130, 246, 0.38)" },
        { offset: 1, color: "rgba(59, 130, 246, 0.01)" },
      ]),
    },
    data: dados.map((d) => d.valor),
  };
}

export function buildFaturamentoTempoOption(dados: FaturamentoTempo[], isDark = false) {
  const c = getThemeColors(isDark);

  return {
    backgroundColor: "transparent",
    color: [c.blue],
    tooltip: { ...tooltipFrame(c, "axis"), formatter: tempoFormatter(c) },
    legend: legendTopRight(c),
    grid: gridTop18(),
    xAxis: categoryAxis(
      dados.map((d) => d.mes),
      c
    ),
    yAxis: valueAxis(c),
    series: [serieFaturamentoReal(c, dados)],
  };
}
