"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LoginFormProps {
  cpf: string;
  setCpf: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  loading: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

interface CampoProps {
  id: string;
  rotulo: string;
  tipo: string;
  valor: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  dica: string;
  loading: boolean;
}

function Campo({ id, rotulo, tipo, valor, onChange, placeholder, dica, loading }: CampoProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{rotulo}</label>
      <Input id={id} type={tipo} value={valor} onChange={onChange} placeholder={placeholder} className="w-full" disabled={loading} />
      <p className="text-xs text-gray-500 mt-1">{dica}</p>
    </div>
  );
}

function ErroBox({ error }: { error: string }) {
  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-md text-red-600 text-sm">{error}</div>
  );
}

export function LoginForm({ cpf, setCpf, email, setEmail, password, setPassword, loading, error, onSubmit }: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Campo id="cpf" rotulo="CPF" tipo="text" valor={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" dica="Somente números (11 dígitos)" loading={loading} />
      <Campo id="email" rotulo="E-mail" tipo="email" valor={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@empresa.com" dica="Formato: usuario@dominio.com" loading={loading} />
      <Campo id="password" rotulo="Senha" tipo="password" valor={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" dica="Use suas credenciais do Protheus" loading={loading} />
      {error && <ErroBox error={error} />}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Entrando..." : "Acessar Dashboard"}
      </Button>
    </form>
  );
}
