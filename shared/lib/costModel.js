// Plain-JS per-query cost ceiling model for the serverless API layer.
//
// The Vercel serverless functions (api/*.js) are plain Node ESM and CANNOT
// import the TypeScript router (src/lib/nightShiftRouter.ts) at runtime. The
// TS router computes the authoritative cost projection client-side. This module
// provides a minimal, deterministic, plain-JS mirror of the rate table so the
// API layer can enforce `max_cost_per_query` BEFORE any provider token spend.
//
// THE CEILING INVARIANT: enforcement refuses (CF_BUDGET_EXCEEDED). It NEVER
// silently downgrades a request. If the projected cost of a query would exceed
// the configured ceiling, the query is refused outright — computing a cheaper
// route behind the customer's back would be a silent cost-semantics change.
//
// Rates mirror src/data/modelRates.json (the single source of truth used by the
// router). NOT every provider is listed; anything unknown uses a conservative
// worst-case ceiling so the ceiling can never UNDER-estimate cost.
//
// Cache economics: `hit` is the billed price of a cached input token (DeepSeek
// automatic prefix cache); `miss` is the uncached input price. effectiveCost()
// blends them by a hit rate. projectedCost() deliberately stays on the worst-case
// ceiling so budget enforcement never under-estimates.

const RATES = {
  "deepseek-chat": { ceiling: 0.00042, hit: 0.0000028, miss: 0.00014 },
  "deepseek-v4-flash": { ceiling: 0.00042, hit: 0.0000028, miss: 0.00014 },
  "gpt-4o": { ceiling: 0.0125 },
  // Unknown/models absent from the table: the conservative premium ceiling, so
  // a query on an un-modeled provider is never allowed past a budget by mistake.
  "_fallback": { ceiling: 0.0125 },
};

function rateFor(model) {
  const m = model ? String(model).toLowerCase() : "";
  return RATES[m] && typeof RATES[m].ceiling === "number" ? RATES[m] : RATES._fallback;
}

export function modelCeilingRate(model) {
  return rateFor(model).ceiling;
}

// Projected worst-case cost (USD) of serving a query on `model` with `maxTokens`.
// Ceiling-based: the provider is billed at its worst case, so budget enforcement
// can never under-estimate spend. Cache blending is NOT applied here on purpose.
export function projectedCost({ model, maxTokens }) {
  const tokens = typeof maxTokens === "number" && maxTokens > 0 ? maxTokens : 2048;
  return (tokens / 1000) * modelCeilingRate(model);
}

// Effective cost (USD) of `tokens` INPUT tokens when a fraction `hitRate` of
// them are served from the provider's automatic cache: hitRate·hit + (1−hitRate)·miss.
// Only meaningful for models with declared cache rates; without them it falls
// back to the uncached input price (no cache assumption is ever invented).
export function effectiveCost({ model, tokens, hitRate }) {
  const count = typeof tokens === "number" && tokens > 0 ? tokens : 0;
  if (count <= 0) return 0;
  const r = rateFor(model);
  const miss = typeof r.miss === "number" ? r.miss : modelCeilingRate(model);
  const hit = typeof r.hit === "number" ? r.hit : miss;
  const h = typeof hitRate === "number" && hitRate > 0 ? Math.min(hitRate, 1) : 0;
  return (count / 1000) * (h * hit + (1 - h) * miss);
}

// Ceiling in USD per query, from env MAX_COST_PER_QUERY. null → no ceiling
// (backward-compatible: ceiling enforcement is fully opt-in).
export function maxCostPerQuery() {
  const raw = process.env.MAX_COST_PER_QUERY;
  if (raw === undefined || raw === null || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// True when the projected cost of the query exceeds the configured ceiling.
export function isOverBudget(projected, ceiling) {
  return ceiling !== null && typeof projected === "number" && projected > ceiling;
}
