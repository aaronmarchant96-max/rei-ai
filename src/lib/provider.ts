/**
 * Map a serving model name to its provider. A " (fallback)" suffix means a
 * non-primary provider rescued the request (cfai.js appends it on fallback).
 *
 * Single source of truth for provider attribution, shared by the chat runtime
 * (which stamps the post-API actuals) and the Analytics dashboard (which uses it
 * to isolate paid-vs-free-tier savings). Providers other than Groq are treated
 * as billed / non-free-tier.
 */
export function deriveProvider(modelName: string): string {
  const base = String(modelName || "")
    .replace(/\s*\(fallback\)\s*$/i, "")
    .toLowerCase();
  if (base.includes("deepseek")) return "deepseek";
  if (base.includes("gemini")) return "gemini";
  if (base.includes("llama") || base.includes("groq")) return "groq";
  if (base.includes("gpt-4o") || base.includes("openai")) return "openai";
  return "unknown";
}
