import type { SyncResult } from "@/lib/integration/sync-engine";
import { findDetector } from "../_internals/csv-detect";
import { filtrarRegistrosAtivos, parseCsvFile } from "../_internals/csv-parse";
import { executarSyncComLog } from "../_internals/upload-sync";

export interface UploadResultado {
  arquivo: string;
  entidade: string;
  registros: number;
  sync: SyncResult;
}

function resultadoDesconhecido(fileName: string): UploadResultado {
  return {
    arquivo: fileName,
    entidade: "desconhecida",
    registros: 0,
    sync: { entidade: "?", processados: 0, criados: 0, atualizados: 0, erros: 0 },
  };
}

export async function processarUpload(empresaId: string, files: File[]): Promise<UploadResultado[]> {
  const resultados: UploadResultado[] = [];
  for (const file of files) {
    const records = await parseCsvFile(file);
    if (records.length === 0) continue;

    const detector = findDetector(Object.keys(records[0]));
    if (!detector) {
      resultados.push(resultadoDesconhecido(file.name));
      continue;
    }

    const validRecords = filtrarRegistrosAtivos(records);
    const canonical = validRecords.map((r) => detector.toCanonical(r, empresaId));
    const syncResult = await executarSyncComLog({ empresaId, fileName: file.name, detector, canonical });

    resultados.push({
      arquivo: file.name,
      entidade: detector.entidade,
      registros: validRecords.length,
      sync: syncResult,
    });
  }
  return resultados;
}
