import React from "react";
import { Building2, FileCheck2 } from "lucide-react";
import type { EmpresaDados } from "@/hooks/useEmpresaProtheus";

interface EmpresaDadosCardProps {
  titulo: string;
  badge: string;
  badgeColor: string;
  dados: EmpresaDados | null;
  emptyMessage: string;
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

function DadosConteudo({ dados, emptyMessage }: { dados: EmpresaDados | null; emptyMessage: string }) {
  return (
    <>
      {dados ? (
        <div className="space-y-4">
          <DadoLinha
            rotulo="Razão Social / Nome do Cliente"
            icone={<Building2 size={16} className="text-slate-400 shrink-0" />}
            valor={dados.nome || "Não informado"}
            className="text-base font-bold text-slate-800 dark:text-slate-100 break-words"
          />
          <DadoLinha
            rotulo="CNPJ / Identificação"
            icone={<FileCheck2 size={16} className="text-slate-400 shrink-0" />}
            valor={dados.cnpj || "Não cadastrado"}
            className="text-sm font-mono font-medium text-slate-700 dark:text-slate-300"
          />
          {dados.usuarioLogado && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Usuário Conectado:</span>
              <strong className="text-slate-700 dark:text-slate-300">{dados.usuarioLogado}</strong>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic py-4">{emptyMessage}</p>
      )}
    </>
  );
}

export function EmpresaDadosCard({ titulo, badge, badgeColor, dados, emptyMessage }: EmpresaDadosCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{titulo}</h4>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${badgeColor}`}>{badge}</span>
        </div>
        <DadosConteudo dados={dados} emptyMessage={emptyMessage} />
      </div>
    </div>
  );
}
