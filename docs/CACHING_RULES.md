# Prompt-Freeze & Deterministic Caching Protocol

## 1. Objective

Sustain high prompt cache hit rates across LLM providers (e.g. Gemini 70–90% caching discounts, DeepSeek prompt caching) by freezing prefix order and generating deterministic cache keys.

---

## 2. Reconstructed Historical Baseline (Developer Agent Telemetry)

- **Reconstructed Effective Cache Ratio**: **88.0%**
- **Reconstructed Input Tokens**: **154,743,219**
- **Reconstructed Cached Input Tokens**: **136,173,308**
- **Reconstructed Model Turns**: **$N = 1,500$**
- **Reconstructed Cost**: **$185.21** (estimated unreconciled)
- **No-Cache Counterfactual Cost**: **$542.66**
- **Estimated Savings**: **$357.46** (65.87% spend reduction)
- **Provenance**: Reconstructed historical development telemetry (`antigravity_session_telemetry.csv`, SHA-256: `76cec3e48c8985fdc25499b4338459046185b7273b1744c545243eb8b3fd4129`)
- **Reconciliation Status**: `pending_provider_billing`

---

## 3. Core Principles

1. **Frozen Prefix Ordering**: System prompts, instruction headers, and frozen rule maps are positioned strictly at the start of the context window.
2. **Deterministic SHA-256 Keys**: Cache keys are derived exclusively from normalized prefix, system prompt, domain, and static routing signals. Dynamic volatile tokens (timestamps, volatile session IDs) must never contaminate the cache key.
3. **Usage Ownership**: Tool execution steps and stdout events belong to their parent model invocation; token context is never counted multiple times across internal event steps.
4. **Safety Escalation Cache Bypass**: Requests flagged by security scanners (`adversarial-validation`) explicitly bypass prompt caching to prevent cross-request contamination.
