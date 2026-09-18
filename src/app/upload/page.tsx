"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface SyncResult {
  arquivo: string;
  entidade: string;
  registros: number;
  sync: {
    entidade: string;
    processados: number;
    criados: number;
    atualizados: number;
    erros: number;
  };
}

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<SyncResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith(".csv"));
    setFiles((prev) => [...prev, ...dropped]);
    setResults(null);
    setError(null);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
    setResults(null);
    setError(null);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro no upload");
        return;
      }

      setResults(data.resultados);
      setFiles([]);
    } catch {
      setError("Falha ao conectar com o servidor");
    } finally {
      setUploading(false);
    }
  };

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
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer bg-white dark:bg-slate-900"
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <Upload className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" />
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            Arraste CSVs aqui ou clique para selecionar
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Arquivos .csv do Protheus: SA1 (clientes), SF2 (faturamento), SE1 (contas a receber), SE5 (baixas)
          </p>
          <input
            id="file-input"
            type="file"
            accept=".csv"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {files.length > 0 && (
          <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
              {files.length} arquivo(s) selecionado(s)
            </h3>
            <div className="space-y-2 mb-6">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{f.name}</span>
                    <span className="text-xs text-slate-400">({(f.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button onClick={() => removeFile(i)} className="text-xs text-red-500 hover:text-red-700">remover</button>
                </div>
              ))}
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {uploading ? "Sincronizando..." : "Sincronizar com o Dashboard"}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}

        {results && (
          <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Resultado da Sincronização</h3>
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="flex items-start gap-3 py-3 px-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <CheckCircle size={18} className={`mt-0.5 shrink-0 ${r.sync.erros > 0 ? "text-amber-500" : "text-emerald-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{r.arquivo}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">{r.entidade}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {r.registros} registro(s) → {r.sync.criados} criado(s), {r.sync.atualizados} atualizado(s), {r.sync.erros} erro(s)
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <a href="/dashboard" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                → Ver dados no Dashboard
              </a>
            </div>
          </div>
        )}

        <div className="mt-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Como exportar do Protheus</h3>
          <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside">
            <li>No Protheus, acesse <strong>Exportação → Database</strong> ou use a query direta</li>
            <li>Exporte como CSV (separador <code>;</code>, encoding UTF-8 com BOM)</li>
            <li>Tabelas suportadas: <code>SA1</code> (clientes), <code>SF2</code> (notas fiscais), <code>SE1</code> (contas a receber), <code>SE5</code> (baixas)</li>
            <li>Arraste os CSVs nesta página e clique em &quot;Sincronizar&quot;</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
