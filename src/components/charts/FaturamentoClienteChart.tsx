"use client";

import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { buildFaturamentoClienteOption } from "@/lib/utils/dashboardCharts";
import { useTheme } from "@/hooks/useTheme";

export interface FaturamentoPorCliente {
  nome: string;
  valor: number;
}

export const FaturamentoClienteChart = ({
  dados = [],
}: {
  dados: FaturamentoPorCliente[];
}) => {
  const { isDark } = useTheme();

  const option = useMemo(() => {
    if (!dados || dados.length === 0) return {};
    return buildFaturamentoClienteOption(dados, isDark);
  }, [dados, isDark]);

  if (!dados || dados.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
        Nenhum cliente encontrado
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
