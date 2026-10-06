"use client";

import { useState } from "react";
import { PasswordInput, SubmitButton, TokenInput } from "./CredenciaisFormInputs";

interface Props {
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  accessToken?: string;
  setAccessToken?: (v: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

function UserInput({ username, setUsername }: { username: string; setUsername: (v: string) => void }) {
  return (
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
  );
}

interface MainFormGridProps {
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  loading: boolean;
}

function MainFormGrid({ username, setUsername, password, setPassword, showPassword, setShowPassword, loading }: MainFormGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
      <UserInput username={username} setUsername={setUsername} />
      <PasswordInput password={password} setPassword={setPassword} showPassword={showPassword} setShowPassword={setShowPassword} />
      <SubmitButton loading={loading} />
    </div>
  );
}

export function ProtheusCredenciaisForm({
  username,
  setUsername,
  password,
  setPassword,
  accessToken = "",
  setAccessToken,
  loading,
  onSubmit,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <MainFormGrid
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        loading={loading}
      />

      {setAccessToken && <TokenInput accessToken={accessToken} setAccessToken={setAccessToken} />}
    </form>
  );
}