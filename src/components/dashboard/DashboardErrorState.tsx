"use client";

export function DashboardErrorState({ error }: { error: string }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-800 shadow-sm p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 dark:text-red-400 text-xl">!</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Erro ao carregar dados</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
      </div>
    </div>
  );
}
