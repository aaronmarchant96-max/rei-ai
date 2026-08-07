export type Severity = "info" | "warn" | "error";

export interface ClaimReport {
  claimId: string;
  title: string;
  category: string;
  pass: boolean;
  severity: Severity;
  computed: number | null;
  reason: string;
}

export interface ClaimDefinition {
  id: string;
  title: string;
  description: string;
  category: string;
  compute: () => number | null;
  verify: (computed: number | null) => { pass: boolean; severity: Severity; reason: string };
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

export function verifyAll(dataSource?: never): ClaimReport[] {
  return CLAIMS.map((c) => {
    let computed: number | null;
    try {
      computed = c.compute();
    } catch (err) {
      return { claimId: c.id, title: c.title, category: c.category, pass: false, severity: "error", computed: null, reason: "compute threw: " + (err instanceof Error ? err.message : String(err)) };
    }
    if (computed !== null && !isFinite(computed)) {
      return { claimId: c.id, title: c.title, category: c.category, pass: false, severity: "error", computed, reason: "compute returned NaN or Infinity — corrupt data" };
    }
    const verdict = c.verify(computed);
    return { claimId: c.id, title: c.title, category: c.category, pass: verdict.pass, severity: verdict.severity, computed, reason: verdict.reason };
  });
}
