"use client";

export type ErrorLogEntry = {
  id: string;
  name?: string;
  message: string;
  stack?: string;
  route?: string;
  timestamp: number;
  context?: string;
};

const STORAGE_KEY = "app_error_logs";

function readLogs(): ErrorLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLogs(logs: ErrorLogEntry[]) {
  try {
    // Enforce max 100 entries, keep the latest
    const trimmed = logs.slice(Math.max(0, logs.length - 100));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function getErrorLogs(): ErrorLogEntry[] {
  return readLogs();
}

export function clearErrorLogs() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function addErrorLog(partial: Partial<ErrorLogEntry>) {
  const entry: ErrorLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    message: partial.message || "Unknown error",
    name: partial.name || undefined,
    stack: partial.stack || undefined,
    route: partial.route || (typeof window !== "undefined" ? window.location.pathname : undefined),
    timestamp: partial.timestamp || Date.now(),
    context: partial.context || undefined,
  };
  const logs = readLogs();
  logs.push(entry);
  writeLogs(logs);
}

export function logError(err: unknown, context?: string) {
  try {
    if (err instanceof Error) {
      addErrorLog({ name: err.name, message: err.message, stack: err.stack, context });
      return;
    }
    if (typeof err === "string") {
      addErrorLog({ message: err, context });
      return;
    }
    // ErrorEvent (window.onerror)
    if (typeof err === "object" && err && (err as any).message) {
      const e: any = err;
      addErrorLog({ name: e.name, message: e.message, stack: e.error?.stack || e.stack, context });
      return;
    }
    addErrorLog({ message: "Unknown error object", context });
  } catch {}
}

let listenersInstalled = false;
export function installGlobalErrorListeners() {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;
  window.addEventListener("error", (event) => {
    try {
      const msg = event.message || "Unhandled error";
      const stack = (event.error && (event.error as any).stack) || undefined;
      addErrorLog({ name: (event.error && (event.error as any).name) || "Error", message: msg, stack });
    } catch {}
  });
  window.addEventListener("unhandledrejection", (event) => {
    try {
      const reason: any = (event as any).reason;
      if (reason instanceof Error) {
        addErrorLog({ name: reason.name, message: reason.message, stack: reason.stack });
      } else if (typeof reason === "string") {
        addErrorLog({ message: reason });
      } else if (reason && typeof reason === "object") {
        addErrorLog({ message: reason.message || "Unhandled promise rejection" });
      } else {
        addErrorLog({ message: "Unhandled promise rejection" });
      }
    } catch {}
  });
}

