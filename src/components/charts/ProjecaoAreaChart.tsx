"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { buildProjecaoAreaOption } from "@/lib/utils/dashboardCharts";
import { useTheme } from "@/hooks/useTheme";

export interface ProjecaoDados {
  mes: string;
  real: number | null;
  projetado: number | null;
}

export const ProjecaoAreaChart = ({
  dados = [],
}: {
  dados: ProjecaoDados[];
}) => {
  const { isDark } = useTheme();

  const option = useMemo(() => {
    if (!dados || dados.length === 0) return {};
    return buildProjecaoAreaOption(dados, isDark);
  }, [dados, isDark]);

  if (!dados || dados.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
        Nenhum dado para projeção
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
