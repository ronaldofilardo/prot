export interface EChartsTooltipParam {
  name: string;
  value: number | string;
  seriesName?: string;
  color?: string;
  axisValue?: string;
}

export function getThemeColors(isDark = false) {
  return {
    blue: "#3b82f6",
    indigo: "#6366f1",
    purple: "#a855f7",
    textMuted: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#cbd5e1",
    grid: isDark ? "#1e293b" : "#f1f5f9",
    tooltipBg: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
    tooltipBorder: isDark ? "#334155" : "#e2e8f0",
    tooltipTitle: isDark ? "#94a3b8" : "#64748b",
    tooltipText: isDark ? "#f8fafc" : "#0f172a",
  };
}
