import React from "react";
import { KeyRound, ShieldCheck, Server, User, Building2 } from "lucide-react";
import type { TokenStatusInfo } from "@/hooks/useEmpresaProtheus";

function TokenHeader({ tokenInfo }: { tokenInfo: TokenStatusInfo }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <ShieldCheck className="text-emerald-600 dark:text-emerald-400" size={18} />
        <span className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
          Conexão e Token Protheus Validados com Sucesso!
        </span>
      </div>
      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
        OAuth2 Ativo (Expira em: {tokenInfo.expiraEm})
      </span>
    </div>
  );
}

function TokenCampo({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
      {icon}
      {children}
    </div>
  );
}

export function TokenStatusCard({ tokenInfo }: { tokenInfo: TokenStatusInfo | null }) {
  if (!tokenInfo) return null;
  return (
    <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 space-y-3">
      <TokenHeader tokenInfo={tokenInfo} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
        <TokenCampo icon={<Building2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}>
          <span>Cliente: <strong className="text-slate-800 dark:text-slate-200">{tokenInfo.clienteProtheus || "LC1 CONTADORES"}</strong></span>
        </TokenCampo>
        <TokenCampo icon={<User size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}>
          <span>Usuário Logado: <strong className="text-slate-800 dark:text-slate-200">{tokenInfo.usuario}</strong></span>
        </TokenCampo>
        <TokenCampo icon={<Server size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}>
          <span>Ambiente: <strong className="text-slate-800 dark:text-slate-200">{tokenInfo.ambiente}</strong></span>
        </TokenCampo>
        <TokenCampo icon={<KeyRound size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}>
          <span className="font-mono">ID: {tokenInfo.clienteId || "141404"}</span>
        </TokenCampo>
      </div>
    </div>
  );
}
