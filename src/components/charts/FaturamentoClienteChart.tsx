"use client";

import React, { useMemo } from "react";
import { buildFaturamentoClienteOption } from "@/lib/utils/dashboardCharts";
import { useTheme } from "@/hooks/useTheme";
import { ChartFrame } from "./common/ChartFrame";

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
  return <ChartFrame option={option} vazio="Nenhum cliente encontrado" />;
};
