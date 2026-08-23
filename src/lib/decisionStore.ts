import type { StrategicSituation } from "./strategic/strategicTypes";

const STORAGE_KEY = "rei_decision_store";
const MAX_ENTRIES = 200;

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

export function logDecision(entry: DecisionEntry): void {
  if (typeof window === "undefined") return;
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
    const all: DecisionEntry[] = raw ? JSON.parse(raw) : [];
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
