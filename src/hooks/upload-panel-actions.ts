import type { Dispatch, SetStateAction } from "react";

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

type PullSetters = {
  setPulling: Dispatch<SetStateAction<boolean>>;
  setPullError: Dispatch<SetStateAction<string | null>>;
  setPullResults: Dispatch<SetStateAction<PullEntityResult[] | null>>;
};

type UploadSetters = {
  setUploading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setResults: Dispatch<SetStateAction<PullEntityResult[] | null>>;
  setFiles: Dispatch<SetStateAction<File[]>>;
};

export async function puxarDoProtheus(s: PullSetters, onSuccess?: () => void): Promise<void> {
  s.setPulling(true);
  s.setPullError(null);
  s.setPullResults(null);

  try {
    const res = await fetch("/api/protheus/pull", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      s.setPullError(data.error || "Erro ao atualizar do Protheus");
      return;
    }

    s.setPullResults(data.resultados);
    if (data.success && onSuccess) {
      onSuccess();
    }
  } catch {
    s.setPullError("Falha ao conectar com o servidor");
  } finally {
    s.setPulling(false);
  }
}

export async function enviarUpload(s: UploadSetters, files: File[], onSuccess?: () => void): Promise<void> {
  if (files.length === 0) return;
  s.setUploading(true);
  s.setError(null);
  s.setResults(null);
  try {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      s.setError(data.error || "Erro no upload");
      return;
    }
    s.setResults(data.resultados);
    s.setFiles([]);
    if (onSuccess) {
      onSuccess();
    }
  } catch {
    s.setError("Falha ao conectar com o servidor");
  } finally {
    s.setUploading(false);
  }
}
