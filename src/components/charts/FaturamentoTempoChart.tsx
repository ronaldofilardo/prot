"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { buildFaturamentoTempoOption } from "@/lib/utils/dashboardCharts";
import { useTheme } from "@/hooks/useTheme";

export interface FaturamentoTempo {
  mes: string;
  valor: number;
}

export const FaturamentoTempoChart = ({
  dados = [],
}: {
  dados: FaturamentoTempo[];
}) => {
  const { isDark } = useTheme();

  const option = useMemo(() => {
    if (!dados || dados.length === 0) return {};
    return buildFaturamentoTempoOption(dados, isDark);
  }, [dados, isDark]);

  if (!dados || dados.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
        Nenhum dado disponível no período
      </div>
    );
  }

  return (
    <div style={{ height: "280px", width: "100%" }}>
      <ReactECharts
        option={option}
        notMerge={true}
        lazyUpdate={true}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
};
