import type { PolicyProposal } from "./policyProposalEngine";

/**
 * Persistence for policy proposals. This module owns ONLY storage concerns:
 * cap, dedupe, and status. It never generates proposals and never mutates
 * policy — see docs/POLICY_LOOP.md for the boundary.
 */

const STORAGE_KEY = "rei_policy_proposals";
const MAX_ENTRIES = 100;

export type ProposalStatus = "proposed" | "dismissed";

export interface StoredProposal extends PolicyProposal {
  status: ProposalStatus;
  createdAt: string;
}

export function getProposals(): StoredProposal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const all: StoredProposal[] = raw ? JSON.parse(raw) : [];
    return all.filter((p) => p && typeof p.id === "string");
  } catch {
    return [];
  }
}

/**
 * Merge newly generated proposals into the store. Idempotent: a proposal with
 * an id already present (proposed OR dismissed) is left untouched — dismissal
 * is durable and generation never re-silences it. New proposals are stamped
 * with createdAt and status "proposed". Cap drops the oldest entries first.
 */
export function upsertProposals(proposals: PolicyProposal[]): StoredProposal[] {
  if (typeof window === "undefined") return getProposals();
  const existing = getProposals();
  const byId = new Map<string, StoredProposal>();
  for (const p of existing) byId.set(p.id, p);
  for (const p of proposals) {
    if (!byId.has(p.id)) {
      byId.set(p.id, {
        ...p,
        status: "proposed",
        createdAt: new Date().toISOString(),
      });
    }
  }
  const merged = Array.from(byId.values());
  // Oldest first for trimming; keep the most recent MAX_ENTRIES.
  merged.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  const capped = merged.slice(Math.max(0, merged.length - MAX_ENTRIES));
  capped.sort((a, b) => (a.createdAt > b.createdAt ? -1 : a.createdAt < b.createdAt ? 1 : 0));
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  } catch (e) {
    console.warn("Unable to persist policy proposals:", e);
  }
  return capped;
}

/** Mark a proposal dismissed. Dismissal is durable — regeneration keeps it dismissed. */
export function dismissProposal(id: string): StoredProposal[] {
  if (typeof window === "undefined") return getProposals();
  const all = getProposals().map((p) =>
    p.id === id ? { ...p, status: "dismissed" as const } : p
  );
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn("Unable to persist policy proposals:", e);
  }
  return all;
}

export function clearProposals(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
