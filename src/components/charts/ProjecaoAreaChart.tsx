"use client";

import React, { useMemo } from "react";
import { buildProjecaoAreaOption } from "@/lib/utils/dashboardCharts";
import { useTheme } from "@/hooks/useTheme";
import { ChartFrame } from "./common/ChartFrame";

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
  return <ChartFrame option={option} vazio="Nenhum dado para projeção" />;
};
