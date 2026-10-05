import type { ProjecaoDados } from "@/components/charts/ProjecaoAreaChart";
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

function projecaoFormatter(c: ThemeColors) {
  return (params: EChartsTooltipParam[]) => {
    const ponto = params[0];
    let html = `<div>
          <span style="font-size:11px;color:${c.tooltipTitle};font-weight:600;">${ponto.axisValue || ponto.name}</span><br/>`;
    params.forEach((item: EChartsTooltipParam) => {
      if (item.value !== null && item.value !== undefined) {
        const cor = item.color;
        const valStr = brl(Number(item.value));
        html += `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
              <span style="display:inline-block;border-radius:50%;width:8px;height:8px;background-color:${cor};"></span>
              <span style="font-size:11px;color:${c.tooltipTitle};">${item.seriesName}:</span>
              <span style="font-size:12px;font-weight:700;color:${c.tooltipText};margin-left:auto;">R$ ${valStr}</span>
            </div>`;
      }
    });
    html += `</div>`;
    return html;
  };
}

function serieHistoricoReal(c: ThemeColors, dados: ProjecaoDados[]) {
  return {
    name: "Histórico Real",
    type: "line",
    smooth: 0.35,
    showSymbol: false,
    symbolSize: 6,
    lineStyle: { width: 3, color: c.blue },
    areaStyle: {
      color: verticalGradient([
        { offset: 0, color: "rgba(59, 130, 246, 0.35)" },
        { offset: 1, color: "rgba(59, 130, 246, 0.01)" },
      ]),
    },
    data: dados.map((d) => d.real),
  };
}

function serieProjetadoMediaMovel(c: ThemeColors, dados: ProjecaoDados[]) {
  return {
    name: "Projeção Média Móvel",
    type: "line",
    smooth: 0.35,
    showSymbol: true,
    symbolSize: 6,
    lineStyle: { width: 3, type: "dashed", color: c.purple },
    areaStyle: {
      color: verticalGradient([
        { offset: 0, color: "rgba(168, 85, 247, 0.25)" },
        { offset: 1, color: "rgba(168, 85, 247, 0.01)" },
      ]),
    },
    data: dados.map((d) => d.projetado),
  };
}

export function buildProjecaoAreaOption(dados: ProjecaoDados[], isDark = false) {
  const c = getThemeColors(isDark);

  return {
    backgroundColor: "transparent",
    color: [c.blue, c.purple],
    tooltip: { ...tooltipFrame(c, "axis"), formatter: projecaoFormatter(c) },
    legend: legendTopRight(c),
    grid: gridTop18(),
    xAxis: categoryAxis(
      dados.map((d) => d.mes),
      c
    ),
    yAxis: valueAxis(c),
    series: [serieHistoricoReal(c, dados), serieProjetadoMediaMovel(c, dados)],
  };
}
