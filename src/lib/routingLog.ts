const STORAGE_KEY = "rei_routing_log";
const MAX_ENTRIES = 500;

export interface RoutingLogEntry {
  domain?: string;
  routeId?: string;
  model?: string;
  hingeScore?: number;
  estimatedCost?: number;
  premiumCost?: number;
  tokenCount?: number;
  inputPreview?: string;
  rationale?: string;
  matchedTerms?: string[];
  routingMs?: number;
  timestamp?: string;
}

export function logRoutingDecision(entry: RoutingLogEntry): void {
  if (typeof window === "undefined") return;
  try {
    const logs = getLogs();
    logs.unshift({
      timestamp: new Date().toISOString(),
      ...entry,
    });
    if (logs.length > MAX_ENTRIES) {
      logs.length = MAX_ENTRIES;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.warn("Unable to persist routing log:", e);
  }
}

export function getLogs(): RoutingLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearLogs(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
