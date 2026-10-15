import React from "react";
import { Button } from "@/components/ui/button";

export function PrazoLoadingState() {
  return (
    <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
      Carregando apuração de Prazo Médio (PMR / PMP)...
    </div>
  );
}

interface PrazoErrorStateProps {
  error: string | null;
  onRetry: () => void;
}

export function PrazoErrorState({ error, onRetry }: PrazoErrorStateProps) {
  return (
    <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex flex-col items-center gap-3">
      <p className="text-sm font-medium">{error || "Não foi possível carregar os dados de prazo médio."}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}
