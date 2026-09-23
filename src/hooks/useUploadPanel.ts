import { useState, useCallback } from "react";

export interface SyncResult {
  entidade: string;
  processados: number;
  criados: number;
  atualizados: number;
  erros: number;
}

export interface PullEntityResult {
  arquivo: string;
  entidade: string;
  registros: number;
  sync: SyncResult;
  erro?: string;
}

export function useUploadPanel() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<PullEntityResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pulling, setPulling] = useState(false);
  const [pullResults, setPullResults] = useState<PullEntityResult[] | null>(null);
  const [pullError, setPullError] = useState<string | null>(null);

  const handlePullFromProtheus = async () => {
    setPulling(true);
    setPullError(null);
    setPullResults(null);

    try {
      const res = await fetch("/api/protheus/pull", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setPullError(data.error || "Erro ao atualizar do Protheus");
        return;
      }

      setPullResults(data.resultados);
    } catch {
      setPullError("Falha ao conectar com o servidor");
    } finally {
      setPulling(false);
    }
  };

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

  return {
    files,
    uploading,
    results,
    error,
    pulling,
    pullResults,
    pullError,
    handlePullFromProtheus,
    handleDrop,
    handleFileInput,
    removeFile,
    handleUpload
  };
}
