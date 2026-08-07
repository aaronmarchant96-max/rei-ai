import { appendClaimHistory } from "./claimHistory";

export type Severity = "info" | "warn" | "error";

export interface ClaimReport {
  claimId: string;
  title: string;
  category: string;
  pass: boolean;
  severity: Severity;
  computed: number | null;
  reason: string;
  source?: string;
}

export interface ClaimDefinition {
  id: string;
  title: string;
  description: string;
  category: string;
  compute: () => number | null;
  verify: (computed: number | null) => { pass: boolean; severity: Severity; reason: string };
  source?: string;
}

const CLAIMS: ClaimDefinition[] = [];

export function defineClaim(c: ClaimDefinition): ClaimDefinition {
  const exists = CLAIMS.find((e) => e.id === c.id);
  if (exists) throw new Error(`Claim "${c.id}" already registered.`);
  CLAIMS.push(c);
  return c;
}

export function getClaims(): ClaimDefinition[] {
  return [...CLAIMS];
}

export function getAllClaims(): ClaimDefinition[] {
  return [...CLAIMS];
}

export function resetClaims(): void {
  CLAIMS.length = 0;
}

export function verifyAll(): ClaimReport[] {
  return CLAIMS.map((c) => {
    let computed: number | null;
    let report: ClaimReport;
    try {
      computed = c.compute();
    } catch (err) {
      report = { claimId: c.id, title: c.title, category: c.category, pass: false, severity: "error", computed: null, reason: "compute threw: " + (err instanceof Error ? err.message : String(err)), source: c.source };
      appendClaimHistory({ claimId: c.id, value: null, severity: "error", ts: Date.now() });
      return report;
    }
    if (computed !== null && !isFinite(computed)) {
      report = { claimId: c.id, title: c.title, category: c.category, pass: false, severity: "error", computed, reason: "compute returned NaN or Infinity — corrupt data", source: c.source };
      appendClaimHistory({ claimId: c.id, value: computed, severity: "error", ts: Date.now() });
      return report;
    }
    let verdict: { pass: boolean; severity: Severity; reason: string };
    try {
      verdict = c.verify(computed);
    } catch (err) {
      report = { claimId: c.id, title: c.title, category: c.category, pass: false, severity: "error", computed, reason: "verify threw: " + (err instanceof Error ? err.message : String(err)), source: c.source };
      appendClaimHistory({ claimId: c.id, value: computed, severity: "error", ts: Date.now() });
      return report;
    }
    report = { claimId: c.id, title: c.title, category: c.category, pass: verdict.pass, severity: verdict.severity, computed, reason: verdict.reason, source: c.source };
    appendClaimHistory({ claimId: c.id, value: computed, severity: verdict.severity, ts: Date.now() });
    return report;
  });
}
