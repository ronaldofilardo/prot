import type { FaturamentoPorCliente } from "@/components/charts/FaturamentoClienteChart";
import { getThemeColors, type EChartsTooltipParam } from "./theme";
import {
  brl,
  tooltipFrame,
  valueAxis,
  verticalGradient,
  type ThemeColors,
} from "./option-common";

function clienteFormatter(c: ThemeColors) {
  return (params: EChartsTooltipParam[]) => {
    const p = params[0];
    return `<div>
          <span style="font-size:11px;color:${c.tooltipTitle};font-weight:600;">${p.name}</span><br/>
          <span style="font-size:13px;color:${c.indigo};font-weight:700;">R$ ${brl(Number(p.value))}</span>
        </div>`;
  };
}

function clienteXAxis(topDados: FaturamentoPorCliente[], c: ThemeColors) {
  return {
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
  };
}

function serieFaturamentoBarra(topDados: FaturamentoPorCliente[], c: ThemeColors) {
  return {
    name: "Faturamento",
    type: "bar",
    barMaxWidth: 38,
    itemStyle: {
      borderRadius: [6, 6, 0, 0],
      color: verticalGradient([
        { offset: 0, color: c.indigo },
        { offset: 1, color: "rgba(99, 102, 241, 0.4)" },
      ]),
    },
    data: topDados.map((d) => d.valor),
  };
}

export function buildFaturamentoClienteOption(dados: FaturamentoPorCliente[], isDark = false) {
  const c = getThemeColors(isDark);
  const topDados = dados.slice(0, 10);

  return {
    backgroundColor: "transparent",
    color: [c.indigo],
    tooltip: {
      ...tooltipFrame(c, "axis"),
      axisPointer: { type: "shadow" },
      formatter: clienteFormatter(c),
    },
    grid: { left: "4%", right: "4%", bottom: "20%", top: "10%", containLabel: true },
    xAxis: clienteXAxis(topDados, c),
    yAxis: valueAxis(c),
    series: [serieFaturamentoBarra(topDados, c)],
  };
}
