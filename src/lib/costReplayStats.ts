export interface ReplayEntry {
  domain?: string;
  model?: string;
  estimatedCost?: number;
  premiumCost?: number;
  rescue?: boolean;
  truncated?: boolean;
  tokenCount?: number;
}

export interface ReplayDoc {
  exportedAt?: string;
  entryCount?: number;
  entries?: ReplayEntry[];
}

export interface CategoryStat {
  entries: number;
  estimated: number;
  premium: number;
  savings: number;
  savingsPercent: number;
  rescues: number;
  truncated: number;
}

export interface ReplayStats {
  entries: number;
  estimated: number;
  premium: number;
  savings: number;
  savingsPercent: number;
  rescues: number;
  truncated: number;
  byCategory: Record<string, CategoryStat>;
}

const num = (n: unknown): number => (typeof n === "number" && isFinite(n) ? n : 0);

/**
 * Recompute pooled + per-category savings from an exported routing log.
 *
 * Savings is measured against the per-entry recorded premiumCost (the "always
 * premium / gpt-4o baseline"), mirroring the dashboard's own math. It does NOT
 * re-derive rates itself — the export already carries decision-time values — so
 * a replay is a faithful reproduction of what the router cost at log time.
 *
 * Per-category stratification is deliberate: a pooled 96% can hide that savings
 * is concentrated in cheap categories while costly ones underperform.
 */
export function computeReplayStats(doc?: ReplayDoc | null): ReplayStats {
  const entries = Array.isArray(doc?.entries) ? doc.entries : [];

  const byCategory: Record<string, CategoryStat> = {};
  let estimated = 0;
  let premium = 0;
  let rescues = 0;
  let truncated = 0;

  for (const e of entries) {
    const est = num(e.estimatedCost);
    const prem = num(e.premiumCost);
    estimated += est;
    premium += prem;
    if (e.rescue) rescues++;
    if (e.truncated) truncated++;

    const cat = String(e.domain || "unknown") || "unknown";
    if (!byCategory[cat]) {
      byCategory[cat] = {
        entries: 0,
        estimated: 0,
        premium: 0,
        savings: 0,
        savingsPercent: 0,
        rescues: 0,
        truncated: 0,
      };
    }
    const c = byCategory[cat];
    c.entries += 1;
    c.estimated += est;
    c.premium += prem;
    if (e.rescue) c.rescues += 1;
    if (e.truncated) c.truncated += 1;
  }

  const savings = premium - estimated;
  const savingsPercent = premium > 0 ? (savings / premium) * 100 : 0;

  for (const cat of Object.keys(byCategory)) {
    const c = byCategory[cat];
    c.savings = c.premium - c.estimated;
    c.savingsPercent = c.premium > 0 ? (c.savings / c.premium) * 100 : 0;
  }

  return {
    entries: entries.length,
    estimated,
    premium,
    savings,
    savingsPercent,
    rescues,
    truncated,
    byCategory,
  };
}
