import type { Dispatch, SetStateAction } from "react";
import type { PullEntityResult } from "./puxar-protheus-action";

export { puxarDoProtheus, ENTIDADES_SYNC_ORDEM } from "./puxar-protheus-action";
export type { PullEntityResult, SyncResult, PullSetters } from "./puxar-protheus-action";

export type UploadSetters = {
  setUploading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setResults: Dispatch<SetStateAction<PullEntityResult[] | null>>;
  setFiles: Dispatch<SetStateAction<File[]>>;
};

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
