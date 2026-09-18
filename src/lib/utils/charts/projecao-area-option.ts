import type { ProjecaoDados } from "@/components/charts/ProjecaoAreaChart";
import { getThemeColors, type EChartsTooltipParam } from "./theme";

export function buildProjecaoAreaOption(dados: ProjecaoDados[], isDark = false) {
  const c = getThemeColors(isDark);

  return {
    backgroundColor: "transparent",
    color: [c.blue, c.purple],
    tooltip: {
      trigger: "axis",
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: c.tooltipText },
      padding: [8, 12],
      formatter: (params: EChartsTooltipParam[]) => {
        const ponto = params[0];
        let html = `<div>
          <span style="font-size:11px;color:${c.tooltipTitle};font-weight:600;">${ponto.axisValue || ponto.name}</span><br/>`;
        params.forEach((item: EChartsTooltipParam) => {
          if (item.value !== null && item.value !== undefined) {
            const cor = item.color;
            const valStr = Number(item.value).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            html += `<div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
              <span style="display:inline-block;border-radius:50%;width:8px;height:8px;background-color:${cor};"></span>
              <span style="font-size:11px;color:${c.tooltipTitle};">${item.seriesName}:</span>
              <span style="font-size:12px;font-weight:700;color:${c.tooltipText};margin-left:auto;">R$ ${valStr}</span>
            </div>`;
          }
        });
        html += `</div>`;
        return html;
      },
    },
    legend: {
      show: true,
      top: 0,
      right: "4%",
      textStyle: { color: c.textMuted, fontSize: 12 },
    },
    grid: { left: "3%", right: "4%", bottom: "3%", top: "18%", containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: dados.map((d) => d.mes),
      axisLine: { lineStyle: { color: c.border } },
      axisLabel: { color: c.textMuted, fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: c.grid, type: "dashed" } },
      axisLabel: {
        color: c.textMuted,
        fontSize: 11,
        formatter: (val: number) => {
          if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
          if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
          return `R$ ${val}`;
        },
      },
    },
    series: [
      {
        name: "Histórico Real",
        type: "line",
        smooth: 0.35,
        showSymbol: false,
        symbolSize: 6,
        lineStyle: { width: 3, color: c.blue },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(59, 130, 246, 0.35)" },
              { offset: 1, color: "rgba(59, 130, 246, 0.01)" },
            ],
          },
        },
        data: dados.map((d) => d.real),
      },
      {
        name: "Projeção Média Móvel",
        type: "line",
        smooth: 0.35,
        showSymbol: true,
        symbolSize: 6,
        lineStyle: { width: 3, type: "dashed", color: c.purple },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(168, 85, 247, 0.25)" },
              { offset: 1, color: "rgba(168, 85, 247, 0.01)" },
            ],
          },
        },
        data: dados.map((d) => d.projetado),
      },
    ],
  };
}
