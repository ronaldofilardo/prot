"use client";

import React from "react";

export function InvoicesThead() {
  return (
    <thead className="bg-slate-50 dark:bg-slate-800/60">
      <tr>
        <th className="text-left py-3.5 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Nota Fiscal</th>
        <th className="text-left py-3.5 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Cliente</th>
        <th className="text-left py-3.5 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Emissão</th>
        <th className="text-right py-3.5 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Valor Total</th>
        <th className="text-center py-3.5 px-6 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
      </tr>
    </thead>
  );
}

export function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">{children}</table>
    </div>
  );
}