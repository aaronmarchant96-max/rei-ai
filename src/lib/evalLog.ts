const STORAGE_KEY = "rei_eval_log";
const MAX_ENTRIES = 500;

/** Who produced the evaluation. Keeps provenance auditable:
 *  - "deterministic" — local, $0 scanner/heuristic (e.g. red-team D1)
 *  - "llm-judge"     — a model judged the response post-hoc (sampled, paid)
 *  - "human"         — explicit user feedback on a request
 */
export type Evaluator = "deterministic" | "llm-judge" | "human";

export interface Evaluation {
  /** 0-100 quality score when an evaluator produced one. */
  qualityScore?: number;
  /** Safety of the RESPONSE (compliance verdict), when evaluated. */
  safetyVerdict?: "clean" | "suspicious" | "high-risk" | "critical";
  /** Whether the routing policy expected this request to hit the
   *  premium/adversarial path. Policy-derived expectation, not ground truth. */
  routeExpected?: boolean;
  /** Whether the observed route matched the policy expectation.
   *  null when unknown. */
  routeCorrect?: boolean;
  /** Free-form notes / human comments. */
  notes?: string[];
  /** ISO timestamp of when the evaluation was produced. */
  evaluatedAt: string;
}

export interface EvalEntry {
  /** Durable source-record identity. Optional only for legacy callers/records. */
  id?: string;
  /** REQUIRED — correlation key joining routing decision, usage/outcome,
   *  and this evaluation for one request. */
  requestId: string;
  domain?: string;
  routeId?: string;
  model?: string;
  evaluator: Evaluator;
  /** e.g. "red-team-v1" or "user-feedback" — what code produced this entry. */
  evaluatorVersion?: string;
  evaluation: Evaluation;
}

function createEvalEntryId(entry: EvalEntry): string {
  const version = entry.evaluatorVersion || "unknown-version";
  const evaluatedAt = entry.evaluation?.evaluatedAt || "unknown-time";
  return `eval:${entry.requestId}:${entry.evaluator}:${version}:${evaluatedAt}`;
}

export function logEval(entry: EvalEntry): void {
  if (typeof window === "undefined") return;
  try {
    const store = getEvals();
    store.unshift({ ...entry, id: entry.id || createEvalEntryId(entry) });
    if (store.length > MAX_ENTRIES) {
      store.length = MAX_ENTRIES;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn("Unable to persist eval log:", e);
  }
}

export function getEvals(filter?: { requestId?: string; evaluator?: Evaluator }): EvalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: EvalEntry[] = raw ? JSON.parse(raw) : [];
    if (!filter) return all;
    return all.filter(
      (e) =>
        (filter.requestId === undefined || e.requestId === filter.requestId) &&
        (filter.evaluator === undefined || e.evaluator === filter.evaluator)
    );
  } catch {
    return [];
  }
}

export function clearEvals(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
