import type { Severity } from "./claimGateway";

const STORAGE_KEY = "rei_claim_history";
const MAX_PER_CLAIM = 50;

export interface ClaimHistoryPoint {
  claimId: string;
  value: number | null;
  severity: Severity;
  ts: number;
}

export function appendClaimHistory(point: ClaimHistoryPoint): void {
  if (typeof window === "undefined") return;
  try {
    const store = getClaimHistory();
    store.push(point);
    const kept = store.filter((p) => p.claimId === point.claimId);
    if (kept.length > MAX_PER_CLAIM) {
      const dropCount = kept.length - MAX_PER_CLAIM;
      const toDelete = new Set(kept.slice(0, dropCount).map((p) => `${p.claimId}:${p.ts}`));
      const filtered = [];
      for (const p of store) {
        if (toDelete.has(`${p.claimId}:${p.ts}`)) continue;
        filtered.push(p);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn("Unable to persist claim history:", e);
  }
}

export function getClaimHistory(claimId?: string): ClaimHistoryPoint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: ClaimHistoryPoint[] = raw ? JSON.parse(raw) : [];
    if (!claimId) return all;
    return all.filter((p) => p.claimId === claimId);
  } catch {
    return [];
  }
}

export function clearClaimHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
