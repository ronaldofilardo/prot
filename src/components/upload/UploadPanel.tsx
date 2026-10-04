"use client";

import React from "react";
import { useUploadPanel } from "@/hooks/useUploadPanel";
import { UploadProtheusPullSection } from "./UploadProtheusPullSection";
import { UploadDropzoneSection } from "./UploadDropzoneSection";

interface UploadPanelProps {
  onSuccess?: () => void;
}

export function UploadPanel({ onSuccess }: UploadPanelProps) {
  const {
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
    handleUpload,
  } = useUploadPanel(onSuccess);

  return (
    <div className="max-w-4xl mx-auto py-4">
      <UploadProtheusPullSection
        pulling={pulling}
        pullResults={pullResults}
        pullError={pullError}
        onPull={handlePullFromProtheus}
      />

      <UploadDropzoneSection
        files={files}
        uploading={uploading}
        results={results}
        error={error}
        onDrop={handleDrop}
        onFileInput={handleFileInput}
        onRemoveFile={removeFile}
        onUpload={handleUpload}
      />
    </div>
  );
}
