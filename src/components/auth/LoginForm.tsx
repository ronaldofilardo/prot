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

export function LoginForm({
  cpf,
  setCpf,
  email,
  setEmail,
  password,
  setPassword,
  loading,
  error,
  onSubmit,
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">
          CPF
        </label>
        <Input
          id="cpf"
          type="text"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="000.000.000-00"
          className="w-full"
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-1">Somente números (11 dígitos)</p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          E-mail
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="usuario@empresa.com"
          className="w-full"
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-1">Formato: usuario@dominio.com</p>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Senha
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Sua senha"
          className="w-full"
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-1">Use suas credenciais do Protheus</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-md text-red-600 text-sm">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Entrando..." : "Acessar Dashboard"}
      </Button>
    </form>
  );
}
