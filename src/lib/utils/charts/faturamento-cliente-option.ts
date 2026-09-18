import type { FaturamentoPorCliente } from "@/components/charts/FaturamentoClienteChart";
import { getThemeColors, type EChartsTooltipParam } from "./theme";

export function buildFaturamentoClienteOption(dados: FaturamentoPorCliente[], isDark = false) {
  const c = getThemeColors(isDark);
  const topDados = dados.slice(0, 10);

  return {
    backgroundColor: "transparent",
    color: [c.indigo],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: c.tooltipBg,
      borderColor: c.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: c.tooltipText },
      padding: [8, 12],
      formatter: (params: EChartsTooltipParam[]) => {
        const p = params[0];
        return `<div>
          <span style="font-size:11px;color:${c.tooltipTitle};font-weight:600;">${p.name}</span><br/>
          <span style="font-size:13px;color:${c.indigo};font-weight:700;">R$ ${Number(p.value).toLocaleString(
            "pt-BR",
            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          )}</span>
        </div>`;
      },
    },
    grid: { left: "4%", right: "4%", bottom: "20%", top: "10%", containLabel: true },
    xAxis: {
      type: "category",
      data: topDados.map((d) => d.nome),
      axisLine: { lineStyle: { color: c.border } },
      axisTick: { show: false },
      axisLabel: {
        color: c.textMuted,
        fontSize: 10,
        interval: 0,
        rotate: 35,
        formatter: (val: string) => (val.length > 14 ? val.substring(0, 12) + "..." : val),
      },
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
        name: "Faturamento",
        type: "bar",
        barMaxWidth: 38,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: c.indigo },
              { offset: 1, color: "rgba(99, 102, 241, 0.4)" },
            ],
          },
        },
        data: topDados.map((d) => d.valor),
      },
    ],
  };
}
