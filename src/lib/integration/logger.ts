type IntegrationLevel = "info" | "warn" | "error";

function formatIntegrationLog(level: IntegrationLevel, message: string, context?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const ctx = context ? ` ${JSON.stringify(context)}` : "";
  return `[${ts}] [Integration] [${level.toUpperCase()}] ${message}${ctx}`;
}

export function logSyncStart(entidade: string, empresaId: string, count: number) {
  console.info(formatIntegrationLog("info", `Iniciando sync de ${count} registro(s) de ${entidade}`, { empresaId }));
}

export function logSyncSuccess(entidade: string, idempotencyKey: string, operacao: string) {
  console.info(formatIntegrationLog("info", `${operacao} concluido`, { entidade, idempotencyKey }));
}

export function logSyncError(entidade: string, idempotencyKey: string, error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(formatIntegrationLog("error", `Falha no sync`, { entidade, idempotencyKey, error: msg }));
}

export function logSyncSkip(entidade: string, idempotencyKey: string, reason: string) {
  console.info(formatIntegrationLog("info", `Registro ignorado: ${reason}`, { entidade, idempotencyKey }));
}

export function logReconciliation(empresaId: string, resultado: Record<string, unknown>) {
  console.info(formatIntegrationLog("info", `Reconciliacao concluida`, { empresaId, ...resultado }));
}
