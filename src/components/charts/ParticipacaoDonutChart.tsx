"use client";

import React, { useMemo } from "react";
import { buildParticipacaoDonutOption } from "@/lib/utils/dashboardCharts";
import { useTheme } from "@/hooks/useTheme";
import { ChartFrame } from "./common/ChartFrame";

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
  return <ChartFrame option={option} vazio="Nenhum dado regional no período" />;
};
