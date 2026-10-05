import React from "react";
import { DropzoneArea, ArquivosSelecionados, UploadErro, ResultadosLocal } from "./UploadDropzoneBlocks";
import type { UploadDropzoneSectionProps } from "./UploadDropzoneBlocks";

export type { UploadDropzoneSectionProps };

export function UploadDropzoneSection({
  files,
  uploading,
  results,
  error,
  onDrop,
  onFileInput,
  onRemoveFile,
  onUpload,
}: UploadDropzoneSectionProps) {
  return (
    <>
      <DropzoneArea onDrop={onDrop} onFileInput={onFileInput} />
      {files.length > 0 && (
        <ArquivosSelecionados files={files} uploading={uploading} onRemoveFile={onRemoveFile} onUpload={onUpload} />
      )}
      {error && <UploadErro error={error} />}
      {results && <ResultadosLocal results={results} />}
    </>
  );
}
