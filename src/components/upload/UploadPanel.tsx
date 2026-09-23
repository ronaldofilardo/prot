"use client";

import React from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useUploadPanel } from "@/hooks/useUploadPanel";

export function UploadPanel() {
  const {
    files, uploading, results, error, pulling, pullResults, pullError,
    handlePullFromProtheus, handleDrop, handleFileInput, removeFile, handleUpload
  } = useUploadPanel();

  return (
    <div className="max-w-4xl mx-auto py-4">
      {/* Pull Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Atualizar do Protheus</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Busca os dados diretamente no Protheus (via API) e sincroniza agora.
            </p>
          </div>
          <button
            onClick={handlePullFromProtheus}
            disabled={pulling}
            className="shrink-0 py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors"
          >
            {pulling ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {pulling ? "Atualizando..." : "Atualizar do Protheus"}
          </button>
        </div>

        {pullError && (
          <div className="mt-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-4 flex gap-3 rounded-xl">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-300">{pullError}</span>
          </div>
        )}

        {pullResults && (
          <div className="mt-4 space-y-2">
            {pullResults.map((r, i) => (
              <div key={i} className="flex items-start gap-3 py-3 px-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                {r.erro ? (
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
                ) : (
                  <CheckCircle size={18} className={`mt-0.5 shrink-0 ${r.sync.erros > 0 ? "text-amber-500" : "text-emerald-500"}`} />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{r.entidade}</span>
                  {r.erro ? (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{r.erro}</p>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {r.registros} reg → {r.sync.criados} criado(s), {r.sync.atualizados} atualizado(s), {r.sync.erros} erro(s)
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dropzone Section */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer bg-white dark:bg-slate-900"
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" />
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Arraste CSVs aqui ou clique</p>
        <p className="text-sm text-slate-500 mt-2">SA1, SF2, SE1, SE5</p>
        <input id="file-input" type="file" accept=".csv" multiple onChange={handleFileInput} className="hidden" />
      </div>

      {files.length > 0 && (
        <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="space-y-2 mb-6">
            {files.map((f, i) => (
              <div key={i} className="flex justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-slate-400" /> <span className="text-sm text-slate-700 dark:text-slate-300">{f.name}</span>
                </div>
                <button onClick={() => removeFile(i)} className="text-xs text-red-500">remover</button>
              </div>
            ))}
          </div>
          <button onClick={handleUpload} disabled={uploading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />} Sincronizar
          </button>
        </div>
      )}

      {error && <div className="mt-6 bg-red-50 dark:bg-red-950/50 p-4 flex gap-3 rounded-xl border border-red-200 dark:border-red-800"><AlertCircle size={20} className="text-red-600 dark:text-red-400" /><span className="text-sm text-red-700 dark:text-red-300">{error}</span></div>}

      {results && (
        <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Resultado</h3>
          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={i} className="flex items-start gap-3 py-3 px-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <CheckCircle size={18} className={`mt-0.5 shrink-0 ${r.sync.erros > 0 ? "text-amber-500" : "text-emerald-500"}`} />
                <div>
                  <div className="flex gap-2"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">{r.arquivo}</span></div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{r.registros} reg → {r.sync.criados} criado(s), {r.sync.atualizados} atu, {r.sync.erros} erro(s)</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
