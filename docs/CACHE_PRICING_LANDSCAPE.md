# Cache-Pricing Landscape

> **Purpose:** the external provider market — which LLM APIs discount *cached input tokens*, by how much, automatically or opt-in. This is a *market reference*, NOT a claim about REI's own performance. REI's own claims (measured savings, stress-test results) live in `CLAIM_LEDGER.md`; this document feeds the product/economic hypothesis that the pilot measurement then tests.

> **Last updated:** 2026-08-12. Rates are list prices from provider docs at that date and drift — verify against the provider's current pricing page before quoting to a customer.

## Why this matters to REI

The REI cost model prices every input token at the provider's *uncached* input rate. Providers that discount cached reads create a second economic lever: a workload that re-sends a stable prefix (system prompt + instructions + domain rules) can be dramatically cheaper than the same tokens billed at the miss rate. If a provider's cache discount is steep and automatic, the honest savings number for a given customer *grows* without any routing change — and the product pitch must be able to say *why* (cache economics), separate from *routing* (model selection).

## How to read the table

- **Cache-hit discount** — the multiple of base input price a cached token is billed at. Lower is better. `0.1x` = 90% off.
- **Automatic** — caching applies with no code change (prefix-based). **Opt-in** — you must place cache breakpoints / call a cache API.
- **Write cost** — some providers charge more *to create* a cache entry; some charge storage.
- **Min tokens** — minimum prefix length eligible for caching.

## The landscape

| Provider | Cache name | Mode | Hit discount | Write/storage cost | TTL | Min tokens | Notes / unverified flags |
|---|---|---|---|---|---|---|---|
| **DeepSeek** (own API) | prompt caching | automatic | **~0.008x** (measured 1/120: v4-pro hit $0.003625/M vs miss $0.435/M) | none | — | — | Extreme outlier. 97.7% hit rate measured on our own build spend (Jul 12–Aug 10 CSV). |
| **Google Gemini** | context caching | implicit (automatic, 2.5+ models) + explicit `CachedContent` API | **0.1x** (2.5 Flash $0.30→$0.03, 3.6 Flash $1.50→$0.15) | no write fee; **storage fee $1.00/M tok/hour** (up to $8.10 Pro tiers) | implicit ~3–5 min (OpenRouter); explicit 5 min–60 days | 2048 (2.5 Flash/Pro), 4096 (3.1 Pro, 3.5 Flash) | Paid tier only. `usage.total_cached_tokens`. *Unverified: all Google data fetched via r.jina.ai reader proxy (ai.google.dev blocks direct fetch).* |
| **Anthropic** | prompt caching | opt-in `cache_control` breakpoints (or automatic top-level breakpoint) | **0.1x** reads | **1.25x** writes (5-min TTL) / **2x** (1-hr TTL); refreshes free | 5 min / 1 hr | 512–4096 by model (Sonnet 4.6/4.5, Opus 4.8 = 1024; Opus 4.6/4.5, Haiku 4.5 = 4096; Opus 5/Fable 5 = 512) | `cache_creation_input_tokens` / `cache_read_input_tokens`. Workspace-isolated. |
| **Mistral** | context caching | automatic (prefix-based); optional `prompt_cache_key` | **0.1x** (Large 3 €0.44→€0.044, Medium 3.5 €1.25→€0.125) | not stated | not stated | not stated | |
| **Moonshot Kimi** | context caching | automatic | **0.1x** on K3 (¥2.00 hit vs ¥20.00 miss, "up to 90% savings") | none | system-managed | 256 | OpenRouter lists 0.25x (model/route dependent). |
| **Z.ai GLM** | context caching | automatic | **~0.15–0.2x** (GLM-5.2 $1.40→$0.26, GLM-4.7 $0.60→$0.11) | no write cost; storage "limited-time free" | "reasonable time limits" | not stated | `usage.prompt_tokens_details.cached_tokens`. Billing prose ("50%") is stale vs the pricing table. |
| **OpenAI** | prompt caching | automatic (≥1024 tokens, exact prefix) | ~**0.25x** (per OpenRouter; GPT-5.6+ reads 0.25x) | free pre-GPT-5.6; **1.25x writes on GPT-5.6+** | in-memory 5–10 min idle (≤1h); extended up to 24h | 1024 | `prompt_cache_key` + explicit breakpoints on GPT-5.6+. |
| **OpenRouter** | prompt caching (aggregator) | pass-through (both) | 0.1x–0.5x by provider/model | provider-dependent | **10-min sticky session** | provider-dependent | Sticky routing pins you to one provider to keep cache warm; optional `session_id`. |
| **Groq** | prompt caching | automatic | **0.5x** | none | 2 hr (volatile) | 128–1024 | Only on openai/gpt-oss-20b, gpt-oss-120b, gpt-oss-safeguard-20b. Cached tokens don't count toward rate limits. `usage.prompt_tokens_details.cached_tokens`. **CONFLICT: OpenRouter doc says Kimi K2; Groq's own page lists gpt-oss only — Groq's page treated as authoritative.** |
| **Together AI** | prompt caching | automatic | 0.1x–0.6x by model (Kimi K3 $3.00→$0.30, DeepSeek V4 Pro $1.74→$0.20) | not listed | not listed | not listed | |
| **Azure OpenAI** | prompt caching (managed) | automatic by default; breakpoints/key only GPT-5.6+ | discounted "cached input" on Standard; up to **100%** on Provisioned | free pre-GPT-5.6; GPT-5.6+ writes billed | 5–10 min idle / ≤1h; extended 24h (gpt-5.5 default) | 1024 | Pre-5.6 cache hits rounded in 128-token increments. |
| **Alibaba Qwen** | explicit context caching | opt-in (`cache_control: ephemeral`, Anthropic-style) | **0.1x** reads | **1.25x** writes | 5 min | not stated | Only on qwen3-max, qwen-plus, qwen3.6-plus, qwen3-coder-plus/flash, deepseek-v3.2 (via OpenRouter). *Unverified directly: DashScope fetch 404'd.* |
| **MiniMax** | KV-cache pricing | unverified | via Together: **0.2x** on M3 | unverified | unverified | unverified | *Unverified: own pricing pages are JS-blocked.* |
| **Cohere** | none on own API | N/A | **none** | N/A | N/A | N/A | (Cohere models get caching only via cloud hosts, not Cohere's API.) |

## Free-lunch combos (automatic + no write fee)

- **Gemini implicit** (0.1x, no write fee, automatic on 2.5+)
- **Moonshot K3** (0.1x, automatic, no write fee)
- **Z.ai GLM** (0.15–0.2x, automatic, no write fee)
- **DeepSeek own API** — still the extreme outlier at ~0.008x measured.

## Unverified flags (honest limits)

1. **Google Gemini** — all data came via `r.jina.ai` reader proxy; ai.google.dev blocks direct fetches. Content matched Google's own pages but treat as second-hand-rendered.
2. **MiniMax** — own pricing pages JS-rendered, no content returned; cache rate only inferred from Together's listing (0.2x on M3).
3. **Qwen/DashScope** — Alibaba help center 404/422; details only from OpenRouter's doc.
4. **Groq vs OpenRouter** — Groq's own page (gpt-oss models only) conflicts with OpenRouter's doc (Kimi K2). Groq's page treated as authoritative.
5. **Implicit-cache TTLs** — Gemini's implicit TTL (3–5 min) is from OpenRouter, not Google's own page.

## Chain (how this feeds the product)

```
external research → CACHE_PRICING_LANDSCAPE.md → product/economic hypothesis
  → pilot measurement (cache-aware cost model) → CLAIM_LEDGER.md
```

The pilot evaluator (`src/lib/pilotEval.ts`) models cache economics only when the traffic carries identifiable input tokens (`inputTokens`/`cachedInputTokens`/`outputTokens`, or `inputTokens`+`outputTokens`+`cacheHitRatio`). A `tokens`-only entry is billed at the legacy rate — cache modeling never fabricates a split it cannot see. Provider rates here are *inputs to that model*, not claims about REI's own measured savings.
