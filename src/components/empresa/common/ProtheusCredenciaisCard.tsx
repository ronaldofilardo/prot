"use client";

import { KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { useProtheusCredenciais } from "@/hooks/useProtheusCredenciais";
import { ProtheusCredenciaisForm } from "./ProtheusCredenciaisForm";

function Header({ savedUser }: { savedUser: string | null }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <KeyRound size={18} className="text-indigo-600 dark:text-indigo-400" />
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Credenciais do Protheus — Renovação Automática Contínua
        </h4>
      </div>
      {savedUser && (
        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          Auto-renovação ativa ({savedUser})
        </span>
      )}
    </div>
  );
}

function Description() {
  return (
    <p className="text-xs text-slate-500 dark:text-slate-400">
      Insira o usuário e senha do ERP Protheus (TOTVS). Ao salvar, o sistema testa a conexão, gera um novo token na hora e renova o acesso automaticamente em segundo plano.
    </p>
  );
}

function Feedback({ feedback }: { feedback: { tipo: "ok" | "erro"; msg: string } | null }) {
  if (!feedback) return null;
  return (
    <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${feedback.tipo === "ok" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" : "bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800"}`}>
      {feedback.tipo === "ok" ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
      <span>{feedback.msg}</span>
    </div>
  );
}

export function ProtheusCredenciaisCard({ onSuccess }: { onSuccess?: () => void }) {
  const { username, setUsername, password, setPassword, accessToken, setAccessToken, loading, savedUser, feedback, handleSalvar } =
    useProtheusCredenciais(onSuccess);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
      <Header savedUser={savedUser} />
      <Description />
      <Feedback feedback={feedback} />
      <ProtheusCredenciaisForm
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        accessToken={accessToken}
        setAccessToken={setAccessToken}
        loading={loading}
        onSubmit={handleSalvar}
      />
    </div>
  );
}