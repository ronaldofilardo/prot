import React from "react";
import { Building2, FileCheck2, UserCheck } from "lucide-react";
import type { EmpresaDados, ProtheusFilialInfo } from "@/hooks/useEmpresaProtheus";
import { EmpresaErpContext } from "./EmpresaErpContext";

interface EmpresaDadosCardProps {
  titulo?: string;
  badge?: string;
  badgeColor?: string;
  dados: EmpresaDados | null;
  filialPadrao?: ProtheusFilialInfo;
  emptyMessage?: string;
}

function DadoLinha({
  rotulo,
  icone,
  valor,
  className,
}: {
  rotulo: string;
  icone: React.ReactNode;
  valor: string;
  className: string;
}) {
  return (
    <div>
      <span className="text-xs text-slate-400 block mb-1">{rotulo}</span>
      <div className="flex items-center gap-2">
        {icone}
        <span className={className}>{valor}</span>
      </div>
    </div>
  );
}

function ConteudoIdentificacao({ dados }: { dados: EmpresaDados }) {
  return (
    <div className="space-y-4">
      <DadoLinha
        rotulo="Razão Social / Nome da Empresa"
        icone={<Building2 size={16} className="text-slate-400 shrink-0" />}
        valor={dados.nome || "Não informado"}
        className="text-base font-bold text-slate-800 dark:text-slate-100 break-words"
      />
      <DadoLinha
        rotulo="Identificação / Ambiente Cloud"
        icone={<FileCheck2 size={16} className="text-slate-400 shrink-0" />}
        valor={dados.cnpj || "Não cadastrado"}
        className="text-sm font-mono font-medium text-slate-700 dark:text-slate-300"
      />
      {dados.usuarioLogado && (
        <DadoLinha
          rotulo="Usuário Conectado"
          icone={<UserCheck size={16} className="text-emerald-500 shrink-0" />}
          valor={dados.usuarioLogado}
          className="text-xs font-semibold text-slate-700 dark:text-slate-300"
        />
      )}
    </div>
  );
}

export function EmpresaDadosCard({
  titulo = "Dados da Empresa / Matriz",
  badge = "Atual",
  badgeColor = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  dados,
  filialPadrao,
  emptyMessage = "Nenhum dado cadastrado no sistema.",
}: EmpresaDadosCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{titulo}</h4>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badgeColor}`}>{badge}</span>
      </div>
      {dados ? (
        <>
          <ConteudoIdentificacao dados={dados} />
          <EmpresaErpContext filial={filialPadrao} />
        </>
      ) : (
        <p className="text-sm text-slate-400 italic py-4">{emptyMessage}</p>
      )}
    </div>
  );
}

