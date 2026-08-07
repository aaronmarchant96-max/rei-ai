const STORAGE_KEY = "rei_routing_log";
const MAX_ENTRIES = 500;

export interface RoutingLogEntry {
  domain?: string;
  routeId?: string;
  model?: string;
  provider?: string;
  rescue?: boolean;
  truncated?: boolean;
  hingeScore?: number;
  estimatedCost?: number;
  premiumCost?: number;
  tokenCount?: number;
  inputPreview?: string;
  rationale?: string;
  matchedTerms?: string[];
  routingMs?: number;
  escalation?: { escalate: boolean; reason: string };
  structured?: boolean;
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

// Patch the most recent entry with post-API actuals (provider, truncated, usage).
// The routing log is written BEFORE the API call, so actuals arrive later.
export function updateLatestLogEntry(patch: Partial<RoutingLogEntry>): void {
  if (typeof window === "undefined") return;
  try {
    const logs = getLogs();
    if (!logs.length) return;
    logs[0] = { ...logs[0], ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.warn("Unable to patch routing log:", e);
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
