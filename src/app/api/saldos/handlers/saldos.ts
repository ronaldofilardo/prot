import {
  resolveEmpresaIdsConsulta,
  resolveIdsPermitidosTotal,
} from "@/lib/utils/empresa-grupo";
import { carregarHierarquias } from "../../dashboard/_internals/dashboard-query";
import { carregarSaldos } from "../_internals/saldos-query";

interface RelatorioParams {
  empresaId: string;
  usuarioId?: string;
  filters: {
    exercicio: string;
    filial: string;
    empresaIds: string[];
  };
}

export async function buildSaldosReport({ empresaId, usuarioId, filters }: RelatorioParams) {
  const { hierarquias } = await carregarHierarquias(empresaId, usuarioId);

  const idsPermitidos = hierarquias.length > 0 ? resolveIdsPermitidosTotal(hierarquias) : [empresaId];
  const idsConsulta = resolveEmpresaIdsConsulta(idsPermitidos, filters.empresaIds);

  const saldos = await carregarSaldos(idsConsulta, filters);
  
  return {
    saldos: saldos.map((s) => ({
      id: s.id,
      filial: s.filial,
      conta: s.conta,
      competencia: s.competencia,
      exercicio: s.exercicio,
      saldoAnterior: Number(s.saldoAnterior),
      debitos: Number(s.debitos),
      creditos: Number(s.creditos),
      saldoAtual: Number(s.saldoAtual),
      empresaId: s.empresaId,
    })),
  };
}
