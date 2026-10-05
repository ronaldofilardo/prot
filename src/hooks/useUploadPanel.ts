import { useState, useCallback } from "react";
import { enviarUpload, puxarDoProtheus } from "./upload-panel-actions";
import type { PullEntityResult } from "./upload-panel-actions";

export type { PullEntityResult, SyncResult } from "./upload-panel-actions";

export function useUploadPanel(onSuccess?: () => void) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<PullEntityResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pullResults, setPullResults] = useState<PullEntityResult[] | null>(null);
  const [pullError, setPullError] = useState<string | null>(null);

  const handlePullFromProtheus = () => puxarDoProtheus({ setPulling, setPullError, setPullResults }, onSuccess);

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
  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));
  const handleUpload = () => enviarUpload({ setUploading, setError, setResults, setFiles }, files, onSuccess);

  return { files, uploading, results, error, pulling, pullResults, pullError, handlePullFromProtheus, handleDrop, handleFileInput, removeFile, handleUpload };
}
