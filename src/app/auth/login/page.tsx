"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogin } from "@/hooks/useLogin";
import { LoginForm } from "@/components/auth/LoginForm";

type LoginState = ReturnType<typeof useLogin>;

function LoginCard({ state }: { state: LoginState }) {
  return (
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
          cpf={state.cpf}
          setCpf={state.setCpf}
          email={state.email}
          setEmail={state.setEmail}
          password={state.password}
          setPassword={state.setPassword}
          loading={state.loading}
          error={state.error}
          onSubmit={state.handleSubmit}
        />
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  const loginState = useLogin();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <LoginCard state={loginState} />
      </div>
    </div>
  );
}
