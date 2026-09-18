"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export function DashboardHeader() {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/30">
              <Sparkles size={20} />
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Dashboard Financeiro Protheus
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Indicadores dinâmicos, fluxo de notas e inteligência de faturamento
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Protheus Mock Conectado
          </span>
        </div>
      </div>
    </header>
  );
}
