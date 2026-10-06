"use client";

import React from "react";
import { KeyRound, Eye, EyeOff, Loader2 } from "lucide-react";

export interface PasswordInputProps {
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
}

export function PasswordInput({ password, setPassword, showPassword, setShowPassword }: PasswordInputProps) {
  return (
    <div className="md:col-span-4 space-y-1">
      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Senha Protheus</label>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Digite a senha"
          className="w-full text-xs px-3 py-2 pr-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

export function SubmitButton({ loading }: { loading: boolean }) {
  return (
    <div className="md:col-span-3">
      <button
        type="submit"
        disabled={loading}
        className="w-full text-xs font-medium px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
        {loading ? "Validando..." : "Salvar e Atualizar Token"}
      </button>
    </div>
  );
}

export function TokenInput({ accessToken, setAccessToken }: { accessToken: string; setAccessToken: (v: string) => void }) {
  return (
    <div className="space-y-1 pt-1">
      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
        <span>Token de Acesso Manual (Bearer / JWT — Opcional)</span>
        <span className="text-[10px] text-slate-400 font-normal">Preencha caso deseje fixar ou rotacionar o token manualmente</span>
      </label>
      <input
        type="password"
        value={accessToken}
        onChange={(e) => setAccessToken(e.target.value)}
        placeholder="Cole o access_token aqui (se possuir)"
        className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
      />
    </div>
  );
}