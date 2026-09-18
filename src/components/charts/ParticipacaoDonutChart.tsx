"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { buildParticipacaoDonutOption } from "@/lib/utils/dashboardCharts";
import { useTheme } from "@/hooks/useTheme";

export interface RegiaoParticipacao {
  nome: string;
  valor: number;
  cor?: string;
}

export const ParticipacaoDonutChart = ({
  dados = [],
}: {
  dados: RegiaoParticipacao[];
}) => {
  const { isDark } = useTheme();

  const option = useMemo(() => {
    if (!dados || dados.length === 0) return {};
    return buildParticipacaoDonutOption(dados, isDark);
  }, [dados, isDark]);

  if (!dados || dados.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
        Nenhum dado regional no período
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
