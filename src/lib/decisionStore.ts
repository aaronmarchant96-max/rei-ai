import type { StrategicSituation } from "./strategic/strategicTypes";

const STORAGE_KEY = "rei_decision_store";
const MAX_ENTRIES = 200;
const SECTION_KEYS = ["Hinge", "Facts", "Assumptions", "Evaluation", "ChangeMind", "Move", "intro"] as const;

export interface DecisionEntry {
  schemaVersion?: 1;
  id: string;
  /** Stable correlation key shared with the routing-log entry for the same request. */
  requestId?: string;
  sections: {
    Hinge?: string;
    Facts?: string;
    Assumptions?: string;
    Evaluation?: string;
    ChangeMind?: string;
    Move?: string;
    intro?: string;
  };
  routerDecision?: {
    label?: string;
    model?: string;
    matchedTerms?: string[];
    hingeScore?: number;
  };
  domainLabel: string;
  inputPreview: string;
  createdAt: string;
  actualTokens?: number;
  actualCost?: number;
  durationMs?: number;
  strategicSituation?: StrategicSituation;
}

function isDecisionEntry(value: unknown): value is DecisionEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const entry = value as Partial<DecisionEntry>;
  const hasValidDate = typeof entry.createdAt === "string" && !Number.isNaN(Date.parse(entry.createdAt));
  const hasSections = Boolean(
    entry.sections
    && typeof entry.sections === "object"
    && !Array.isArray(entry.sections)
    && SECTION_KEYS.some((key) => typeof entry.sections?.[key] === "string" && entry.sections[key]!.trim().length > 0)
  );

  return Boolean(
    typeof entry.id === "string"
    && entry.id.trim()
    && typeof entry.domainLabel === "string"
    && entry.domainLabel.trim()
    && typeof entry.inputPreview === "string"
    && hasValidDate
    && hasSections
  );
}

export function logDecision(entry: DecisionEntry): void {
  if (typeof window === "undefined") return;
  if (!isDecisionEntry(entry)) {
    console.warn("Refusing to persist malformed CARDO decision record");
    return;
  }
  try {
    const store = getDecisions();
    store.unshift({ schemaVersion: 1, ...entry });
    if (store.length > MAX_ENTRIES) {
      store.length = MAX_ENTRIES;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn("Unable to persist decision store:", e);
  }
}

export function getDecisions(filter?: { domain?: string }): DecisionEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const all = Array.isArray(parsed) ? parsed.filter(isDecisionEntry) : [];
    if (!filter?.domain) return all;
    return all.filter((e) => e.domainLabel === filter.domain);
  } catch {
    return [];
  }
}

export function deleteDecision(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const store = getDecisions();
    const filtered = store.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
}

export function clearDecisions(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
