const STORAGE_KEY = "rei_routing_log";
const MAX_ENTRIES = 500;

export interface RoutingLogEntry {
  /** Durable source-record identity. Optional only for legacy stored entries. */
  id?: string;
  /** Stable correlation key joining the pre-API routing decision, post-API
   * usage/outcome patch, and any downstream evaluation events for one request. */
  requestId?: string;
  domain?: string;
  routeId?: string;
  model?: string;
  provider?: string;
  rescue?: boolean;
  truncated?: boolean;
  /** Number of continuation chunks made beyond the first (0 = single chunk). */
  continuations?: number;
  /** Total inference chunks across the request lifetime (1 = no continuation). */
  totalChunks?: number;
  /** True if the final chunk still hit the output cap (honest truncation). */
  finalTruncated?: boolean;
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
  actualTokens?: number;
  actualCost?: number;
  status?: "success" | "error" | "pending";
  resolvedModel?: string;
  chunks?: number;
  inputRedTeamScore?: number | null;
  inputRedTeamVerdict?: string | null;
  inputRedTeamEscalate?: boolean;
  /** Post-execution timestamp proving the outcome was observable by this time.
   * Written at the same seam that patches status/truncation/actuals. Not latency
   * telemetry — do not subtract from another timestamp to claim execution duration. */
  outcomeObservedAt?: string;
}

function createRoutingEntryId(entry: RoutingLogEntry): string {
  if (entry.requestId) return `routing:${entry.requestId}`;
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `routing:${globalThis.crypto.randomUUID()}`;
  }
  return `routing:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

export function logRoutingDecision(entry: RoutingLogEntry): void {
  if (typeof window === "undefined") return;
  try {
    const logs = getLogs();
    logs.unshift({
      timestamp: new Date().toISOString(),
      ...entry,
      id: entry.id || createRoutingEntryId(entry),
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
//
// requestId is the preferred correlation key: when present, the matching entry is
// patched. When absent (legacy entries written before request correlation landed),
// fall back to patching logs[0] so older flows keep working during migration.
export function updateLatestLogEntry(patch: Partial<RoutingLogEntry>, requestId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const logs = getLogs();
    if (!logs.length) return;
    const target = requestId
      ? logs.find((e) => e.requestId === requestId)
      : undefined;
    if (requestId && !target) {
      // Correlated patch failed to match — surface it instead of silently
      // falling back, otherwise a broken correlation looks like a successful
      // telemetry update.
      console.warn(`routingLog: no entry found for requestId ${requestId}; patch dropped`);
      return;
    }
    const idx = target ? logs.indexOf(target) : 0;
    logs[idx] = { ...logs[idx], ...patch };
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
