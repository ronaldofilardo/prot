import React from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { PullEntityResult } from "@/hooks/useUploadPanel";

export interface UploadDropzoneSectionProps {
  files: File[];
  uploading: boolean;
  results: PullEntityResult[] | null;
  error: string | null;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onUpload: () => void;
}

export function DropzoneArea({ onDrop, onFileInput }: { onDrop: UploadDropzoneSectionProps["onDrop"]; onFileInput: UploadDropzoneSectionProps["onFileInput"] }) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer bg-white dark:bg-slate-900"
      onClick={() => document.getElementById("file-input")?.click()}
    >
      <Upload className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500 mb-3" />
      <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
        Upload manual de planilhas CSV complementares
      </p>
      <p className="text-xs text-slate-500 mt-1">SA1, SF2, SE1, SE5 (opcional para importação local)</p>
      <input id="file-input" type="file" accept=".csv" multiple onChange={onFileInput} className="hidden" />
    </div>
  );
}

export function ArquivosSelecionados({
  files,
  uploading,
  onRemoveFile,
  onUpload,
}: Pick<UploadDropzoneSectionProps, "files" | "uploading" | "onRemoveFile" | "onUpload">) {
  return (
    <div className="mt-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="space-y-2 mb-4">
        {files.map((f, i) => (
          <div key={i} className="flex justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-slate-400" />
              <span className="text-xs text-slate-700 dark:text-slate-300">{f.name}</span>
            </div>
            <button onClick={() => onRemoveFile(i)} className="text-xs text-red-500">remover</button>
          </div>
        ))}
      </div>
      <button
        onClick={onUpload}
        disabled={uploading}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Importar Planilhas
      </button>
    </div>
  );
}

export function UploadErro({ error }: { error: string }) {
  return (
    <div className="mt-4 bg-red-50 dark:bg-red-950/50 p-3 flex gap-2 rounded-xl border border-red-200 dark:border-red-800">
      <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0" />
      <span className="text-xs text-red-700 dark:text-red-300">{error}</span>
    </div>
  );
}

export function ResultadosLocal({ results }: { results: PullEntityResult[] }) {
  return (
    <div className="mt-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">Resultado da importação local</h4>
      <div className="space-y-2">
        {results.map((r, i) => (
          <div key={i} className="flex items-start gap-2 py-2 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
            <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-500" />
            <div>
              <span className="font-medium text-slate-700 dark:text-slate-300">{r.arquivo}</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{r.registros} registros processados</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
