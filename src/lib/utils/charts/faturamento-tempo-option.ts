import type { FaturamentoTempo } from "@/components/charts/FaturamentoTempoChart";
import { getThemeColors, type EChartsTooltipParam } from "./theme";

export function buildFaturamentoTempoOption(dados: FaturamentoTempo[], isDark = false) {
  const c = getThemeColors(isDark);

  return {
    backgroundColor: "transparent",
    color: [c.blue],
    tooltip: {
      trigger: "axis",
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: c.tooltipText },
      padding: [8, 12],
      formatter: (params: EChartsTooltipParam[]) => {
        const p = params[0];
        return `<div>
          <span style="font-size:11px;color:${c.tooltipTitle};font-weight:600;">${p.name}</span><br/>
          <span style="font-size:13px;color:${c.blue};font-weight:700;">R$ ${Number(p.value).toLocaleString(
            "pt-BR",
            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          )}</span>
        </div>`;
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
        name: "Faturamento Real",
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
              { offset: 0, color: "rgba(59, 130, 246, 0.38)" },
              { offset: 1, color: "rgba(59, 130, 246, 0.01)" },
            ],
          },
        },
        data: dados.map((d) => d.valor),
      },
    ],
  };
}
