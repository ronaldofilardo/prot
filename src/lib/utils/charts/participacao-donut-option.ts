import type { RegiaoParticipacao } from "@/components/charts/ParticipacaoDonutChart";
import { getThemeColors, type EChartsTooltipParam } from "./theme";
import { brl, tooltipFrame, type ThemeColors } from "./option-common";

const COLORS_DEFAULT = ["#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#64748b"];

function donutFormatter(c: ThemeColors, total: number) {
  return (params: EChartsTooltipParam) => {
    const val = typeof params.value === "number" ? params.value : Number(params.value || 0);
    const percent = total > 0 ? ((val / total) * 100).toFixed(1) : "0";
    return `<div>
          <span style="font-size:11px;color:${c.tooltipTitle};font-weight:600;">${params.name}</span><br/>
          <span style="font-size:13px;color:${c.tooltipText};font-weight:700;">R$ ${brl(val)}</span>
          <span style="font-size:11px;color:${c.blue};font-weight:600;margin-left:4px;">(${percent}%)</span>
        </div>`;
  };
}

function serieParticipacao(dados: RegiaoParticipacao[], c: ThemeColors, isDark: boolean) {
  return {
    name: "Participação",
    type: "pie",
    radius: ["48%", "72%"],
    center: ["50%", "45%"],
    avoidLabelOverlap: false,
    itemStyle: {
      borderRadius: 6,
      borderColor: isDark ? "#0f172a" : "#ffffff",
      borderWidth: 2,
    },
    label: { show: false, position: "center" },
    emphasis: {
      label: {
        show: true,
        fontSize: 14,
        fontWeight: "bold",
        color: c.tooltipText,
        formatter: "{b}\n{d}%",
      },
    },
    data: dados.map((d, i) => ({
      value: d.valor,
      name: d.nome,
      itemStyle: { color: d.cor || COLORS_DEFAULT[i % COLORS_DEFAULT.length] },
    })),
  };
}

export function buildParticipacaoDonutOption(dados: RegiaoParticipacao[], isDark = false) {
  const c = getThemeColors(isDark);
  const total = dados.reduce((sum, d) => sum + d.valor, 0);

  return {
    backgroundColor: "transparent",
    tooltip: { ...tooltipFrame(c, "item"), formatter: donutFormatter(c, total) },
    legend: {
      bottom: "0%",
      left: "center",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: c.textMuted, fontSize: 11 },
    },
    series: [serieParticipacao(dados, c, isDark)],
  };
}
