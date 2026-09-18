"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogin } from "@/hooks/useLogin";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  const loginState = useLogin();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Acesso ao Dashboard Financeiro
            </CardTitle>
            <CardDescription>
              Entre com seu CPF ou e-mail para acessar os dados financeiros
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm
              cpf={loginState.cpf}
              setCpf={loginState.setCpf}
              email={loginState.email}
              setEmail={loginState.setEmail}
              password={loginState.password}
              setPassword={loginState.setPassword}
              loading={loginState.loading}
              error={loginState.error}
              onSubmit={loginState.handleSubmit}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}