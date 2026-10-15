import React from "react";
import { UploadPanel } from "@/components/upload/UploadPanel";
import { DashboardInvoicesTable, type DashboardNotaFiscal } from "@/components/dashboard/DashboardInvoicesTable";

interface DashboardAtualizacaoTabProps {
  faturamentos: DashboardNotaFiscal[];
  loading: boolean;
  onRefresh: () => Promise<void> | void;
  empresaNome?: string;
  filialNome?: string;
}

export function DashboardAtualizacaoTab({
  faturamentos,
  loading,
  onRefresh,
  empresaNome,
  filialNome,
}: DashboardAtualizacaoTabProps) {
  return (
    <div className="space-y-6">
      <UploadPanel onSuccess={onRefresh} />
      <DashboardInvoicesTable
        faturamentos={faturamentos}
        loading={loading}
        onRefresh={onRefresh}
        empresaNome={empresaNome}
        filialNome={filialNome}
      />
    </div>
  );
}
