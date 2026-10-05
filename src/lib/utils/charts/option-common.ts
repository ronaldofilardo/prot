import type { ThemeColors } from "./theme";

export type { ThemeColors };

export function moneyAxisFormatter(val: number): string {
  if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
  return `R$ ${val}`;
}

export function brl(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function tooltipFrame(c: ThemeColors, trigger: string) {
  return {
    trigger,
    backgroundColor: c.tooltipBg,
    borderColor: c.tooltipBorder,
    borderWidth: 1,
    textStyle: { color: c.tooltipText },
    padding: [8, 12],
  };
}

export function legendTopRight(c: ThemeColors) {
  return {
    show: true,
    top: 0,
    right: "4%",
    textStyle: { color: c.textMuted, fontSize: 12 },
  };
}

export function gridTop18() {
  return { left: "3%", right: "4%", bottom: "3%", top: "18%", containLabel: true };
}

export function categoryAxis(meses: string[], c: ThemeColors) {
  return {
    type: "category",
    boundaryGap: false,
    data: meses,
    axisLine: { lineStyle: { color: c.border } },
    axisLabel: { color: c.textMuted, fontSize: 11 },
    axisTick: { show: false },
  };
}

export function valueAxis(c: ThemeColors) {
  return {
    type: "value",
    splitLine: { lineStyle: { color: c.grid, type: "dashed" } },
    axisLabel: { color: c.textMuted, fontSize: 11, formatter: moneyAxisFormatter },
  };
}

export function verticalGradient(colorStops: Array<{ offset: number; color: string }>) {
  return {
    type: "linear",
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops,
  };
}
