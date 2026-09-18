type LogLevel = "info" | "warn" | "error";

interface LogPayload {
  [key: string]: unknown;
}

function formatLog(prefix: string, level: LogLevel, message: string, payload?: LogPayload) {
  const timestamp = new Date().toISOString();
  const context = payload ? ` ${JSON.stringify(payload)}` : "";
  return `[${timestamp}] [${prefix}] [${level.toUpperCase()}] ${message}${context}`;
}

export function logDashboard(message: string, payload?: LogPayload) {
  console.info(formatLog("Dashboard", "info", message, payload));
}

export function logAuth(message: string, payload?: LogPayload) {
  console.info(formatLog("Auth", "info", message, payload));
}

export function logApiError(contextMessage: string, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  console.error(
    formatLog("API:Error", "error", contextMessage, {
      message: errorMessage,
      stack: process.env.NODE_ENV === "development" ? errorStack : undefined,
    })
  );
}
