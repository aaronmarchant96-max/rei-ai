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

interface ExportLogsOptions {
  /** Strip prompt-bearing fields (inputPreview, rationale) from each entry. Default true. */
  redact?: boolean;
}

const REDACTED_FIELDS = ["inputPreview", "rationale"] as const;

/**
 * Serialize routing-log entries to a JSON document with an export envelope.
 * From here a downstream replay harness can recompute cost savings against the
 * same route tables — the ledger's 'production savings' claim stays
 * reproducible instead of self-reported.
 *
 * Redacts prompt-bearing fields by default so user prompts (inputPreview,
 * rationale) never leave the browser unless explicitly retained by the caller.
 */
export function exportLogsJSON(
  logs: RoutingLogEntry[],
  opts: ExportLogsOptions = {}
): string {
  const redact = opts.redact !== false;
  const payload = redact
    ? logs.map((entry) => {
        const clone: Partial<RoutingLogEntry> = { ...entry };
        for (const field of REDACTED_FIELDS) {
          delete clone[field];
        }
        return clone;
      })
    : logs;
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      entryCount: logs.length,
      entries: payload,
    },
    null,
    2
  );
}
