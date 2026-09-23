"use client";

import { UploadPanel } from "@/components/upload/UploadPanel";

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Upload de Dados Protheus</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Importe CSVs exportados do Protheus (SA1, SF2, SE1, SE5) para sincronizar com o dashboard
          </p>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <UploadPanel />
      </main>
    </div>
  );
}
