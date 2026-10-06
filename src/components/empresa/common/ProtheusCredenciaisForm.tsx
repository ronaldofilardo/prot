"use client";

import React, { useState } from "react";
import { KeyRound, Eye, EyeOff, Loader2 } from "lucide-react";

interface Props {
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

interface PasswordInputProps {
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
}

function PasswordInput({ password, setPassword, showPassword, setShowPassword }: PasswordInputProps) {
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

function SubmitButton({ loading, onSubmit }: { loading: boolean; onSubmit: (e: React.FormEvent) => void }) {
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

export function ProtheusCredenciaisForm({ username, setUsername, password, setPassword, loading, onSubmit }: Props) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <div className="md:col-span-5 space-y-1">
        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Usuário Protheus</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Ex: Administrador"
          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <PasswordInput password={password} setPassword={setPassword} showPassword={showPassword} setShowPassword={setShowPassword} />

      <SubmitButton loading={loading} onSubmit={onSubmit} />
    </form>
  );
}