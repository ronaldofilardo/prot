"use client";

import React, { useMemo } from "react";
import { buildFaturamentoTempoOption } from "@/lib/utils/dashboardCharts";
import { useTheme } from "@/hooks/useTheme";
import { ChartFrame } from "./common/ChartFrame";

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
  return <ChartFrame option={option} vazio="Nenhum dado disponível no período" />;
};
