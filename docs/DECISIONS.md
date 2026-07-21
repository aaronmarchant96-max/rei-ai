# REI Architecture Decisions

Each entry captures: what problem was being solved, what alternatives were considered, why the chosen approach won, and what trade-offs were accepted.

---

## 1. Two-Layer Routing: Deterministic + Fingerprint Catalog

**Date:** July 5, 2026  
**Problem:** Every query was hitting an LLM, including trivial greetings. "Hello" was costing ~$0.0003 and ~500ms latency for no reason.

**Alternatives considered:**
- A. Route everything through an LLM (cheapest model for all queries) — simple but wastes tokens on greetings
- B. Run a small local model (Gemma 2B, llama-3.2-1b) for classification — adds complexity, still costs something
- C. Regex-based deterministic engine at Layer 0 — zero cost, zero latency, 100% confidence for known patterns

**Choice:** C — regex-based deterministic engine. "The cheapest model is no model." Greetings and smalltalk are pattern-matched before any API call. Everything else flows through the fingerprint catalog.

**Trade-off:** Limited to predefined patterns. New greeting variants require pattern updates. But the catalog is versioned and auditable, and the patterns are exact — no false positives from a classifier that "mostly works."

**Code:** `src/lib/deterministicEngine.js`, wired into `nightShiftRouter.js:buildRouterDecision()` as the first check before any catalog matching.

---

## 2. Fingerprint Catalog vs Embeddings-Based Routing

**Date:** June 30, 2026  
**Problem:** How to classify user prompts into routing tiers without adding inference cost to the routing step itself.

**Alternatives considered:**
- A. Cheap LLM classifier — use llama-3.1-8b to classify → route. Simple but doubles the cost: one call to classify, one call to respond
- B. Embedding similarity — embed the input, compare against centroids per domain. Adds vector dependency, non-deterministic
- C. Weighted keyword catalog — `data/fingerprints.json` with `matchTerms`, `negativeMatchTerms`, `matchThreshold`, and `confidence` per entry

**Choice:** C — keyword catalog. Deterministic, auditable, testable, zero inference cost. Every classification decision is reproducible. The catalog is data, not code — thresholds and match terms can be tuned without touching the router logic.

**Trade-off:** Keywords miss semantic intent (e.g., "parents of Josiah Ramsey" doesn't match genealogy keywords because "parents" isn't in the catalog). Cannot detect sarcasm or indirect requests. But the fallback path (structured reasoning) handles unmatched queries gracefully.

**Code:** `src/lib/nightShiftRouter.js:getCatalogRouteMatch()`, `data/fingerprints.json`

---

## 3. Grid Layout vs Flexbox for Shell

**Date:** July 12, 2026  
**Problem:** The chat shell needed a fixed layout: header at top, chat content in middle, instrument rail on right, session footer and input bar at bottom. Flexbox couldn't express the two-column + mixed row layout cleanly.

**Alternatives considered:**
- A. Flexbox with nested containers — three flex columns + inner flex rows. Complex, fragile, caused clipping bugs
- B. Grid layout — `grid-template-rows: 48px minmax(0, 1fr) auto auto`, `grid-template-columns: 1fr 280px`

**Choice:** B — CSS Grid. The layout intention maps directly to grid semantics: header spans both columns, chat content and rail share a row, footer and input stack below. `minmax(0, 1fr)` allows the chat row to shrink without overflow.

**Trade-off:** Three bugs during implementation: clipping from `overflow: hidden` + `min-height`, a duplicate `.rei-shell` flex rule in `style.css` silently overriding the grid, and the instrument rail initially hidden due to CSS cascade (base `display: none` after media query `display: flex`). All resolved.

**Code:** `src/rei.css:88-96`, `@media (min-width: 720px)`

---

## 4. CSS Extraction: Static File vs JS Injection

**Date:** July 4, 2026  
**Problem:** `REI.jsx` had a 530-line `<style>` block injected via `useEffect`. This couldn't be tree-shaken, was unminifiable, and made the component unreadable.

**Alternatives considered:**
- A. Keep JS-injected styles — simple, no build config change. Already working
- B. CSS modules — scoped class names, compiler support. Requires Vite config changes
- C. Static CSS file (`src/rei.css`) with BEM-ish class naming — standard, supported, no build changes needed beyond import

**Choice:** C — static CSS file. `import "./rei.css"` in REI.jsx, Vite handles it natively. Jest needed `moduleNameMapper: { "\\.css$": "identity-obj-proxy" }` to handle the CSS import in tests.

**Trade-off:** No automatic scoping — class name collisions possible. Mitigated by `rei-` prefix convention. The initial extraction accidentally deleted 4 `useState` declarations adjacent to the removed `useEffect` block, caught by lint.

**Code:** `src/rei.css`, `jest.config.cjs:13-15`

---

## 5. Confidence Fallback Chain

**Date:** July 12, 2026  
**Problem:** When no catalog entry matched the selected route, `routingConfidence` showed 0% — even for well-reasoned, well-cited answers. This undermined the "deterministic and testable" claim.

**Alternatives considered:**
- A. Always show catalog match score — but it was often from a different fingerprint than the selected route. Misleading
- B. Show "n/a" for unmatched queries — honest but unhelpful. Judges want numbers
- C. Three-tier fallback chain: catalog match score (if entry matches) → fingerprint's own confidence threshold → default 0.5

**Choice:** C — fallback chain. When the catalog matched the selected route, use that score. When not, use the fingerprint's pathway-specific confidence threshold (e.g., 0.72 for structured-reasoning). When that's unavailable, default 0.5 (neutral confidence).

**Trade-off:** The fingerprint thresholds (0.72 for "cheap" on structured-reasoning) are estimates, not calibrated measurements. But they're explicit, versioned, and better than 0%.

**Code:** `src/lib/nightShiftRouter.js:494-501`

---

## 6. Domain Detection Isolation: Input vs History

**Date:** July 12, 2026  
**Problem:** `isLikelyGenealogyRequest()` was checking the combined text (input + conversation history). When a previous REI response used "archive" or "source" or "death," every subsequent query routed to Genealogy Deep Dive — regardless of content. "Slime molds solving mazes" → genealogy. "Tell me about your code" → genealogy.

**Alternatives considered:**
- A. Keep using combined text — context is useful for domain detection. But the echo chamber was too aggressive
- B. Weight the input more than history — complex, adds parameters
- C. Use current input only for domain detection — same fix applied earlier to `isSimpleGreeting` and `isAdversarialRequest`

**Choice:** C — current input only. `isLikelyGenealogyRequest(input)`, `isLikelyCodingRequest(input)`, `isLikelyStoryRequest(input)`. The `domainName === "genealogy"` explicit tab check is preserved. Complexity tiering and high-structure signals still use combined text (they benefit from context).

**Trade-off:** Domain continuity is lost across turns — if a user asks a follow-up genealogy question after a structured reasoning answer, the router won't stay in genealogy mode automatically. The explicit domain tab is the user's only way to persist domain selection.

**Code:** `src/lib/nightShiftRouter.js:425,435,445`

---

## 7. De-Roboticize: Post-Process Filter vs Prompt-Only

**Date:** July 12, 2026  
**Problem:** The assistant prompt told REI to "vary openings" and "not start with The hinge is," but the 70B model would mutate the banned phrase: "The hinge is..." → "The key thing is..." → "The key issue is..." → "The core idea is..." Prompt instructions alone couldn't stop it.

**Alternatives considered:**
- A. Iterate the prompt further — add more banned phrases, stronger language. Diminishing returns after 3+ iterations
- B. Post-process filter — strip known formulaic openers from API responses before they reach the UI

**Choice:** B — deterministic post-process filter at the API layer (`deRoboticize()`). Strips 8 banned openers and `(Source: ...)` fake citations. Runs after the LLM response, before the result is returned to the client. Does NOT capitalize text unless an opener was actually stripped (edge case: "mock ok" → "Mock ok").

**Trade-off:** If the model produces a genuinely useful opening that happens to match a banned pattern, it gets stripped. The filter is aggressive by design. It's easy to add new patterns to the banned list — no prompt iteration needed.

**Code:** `api/lib/deRoboticize.js`, called in `api/cfai.js:handleCfaiRequest()`

---

## 8. Backend Deterministic Check (Dual-Layer Layer 0)

**Date:** July 12, 2026  
**Problem:** The frontend had Layer 0 greetings → $0, but direct API calls (from OpenCode CLI, Vercel serverless, or third-party integrations) bypassed the frontend and paid full token cost for every greeting.

**Alternatives considered:**
- A. Frontend-only — keep Layer 0 as a UX feature. Simple, already working
- B. Backend-only — move Layer 0 to the API handler, remove from frontend. Cleaner architecture
- C. Dual-layer — run `resolveDeterministic()` at both entry points

**Choice:** C — dual-layer. The frontend catches greetings before `fetch('/api/cfai')` to avoid the network round-trip. The backend catches greetings at `handleCfaiRequest()` for direct API callers. Both layers share the same `deterministicEngine.js` module.

**Trade-off:** Duplicate logic across two layers. If the deterministic patterns are updated, both layers automatically get the update (shared module). The redundant check is <1ms and costs nothing.

**Code:** `api/cfai.js:313-323`, `src/REI.jsx:390-410`

---

## 9. History Window: 10 → 5 Messages

**Date:** July 12, 2026  
**Problem:** 441M tokens across 1,194 API calls averages 370K tokens per request. The conversation history was carrying 10 turns of full messages on every API call.

**Alternatives considered:**
- A. Keep 10 — more context means better coherence. But the token cost was visible
- B. Trim to 3 — aggressive, might lose conversational context on multi-turn threads
- C. Trim to 5 — halve the context while keeping enough turns for follow-up questions

**Choice:** C — 5 messages. Halves the average token payload. 5 turns is enough for a question → answer → follow-up → clarification → resolution loop.

**Trade-off:** Conversations longer than 5 turns lose earlier context. The LLM won't remember the original question on turn 6. But for most interactions, 5 turns is sufficient, and the trade-off for token efficiency is justified.

**Code:** `src/REI.jsx:381`

---

## 10. CARDO GUARD as Cost-Governor

**Date:** July 5, 2026  
**Problem:** The router was selecting pathways based on fingerprint matching, but had no mechanism to check whether the selected pathway was actually adequate. Low-confidence routing decisions could send complex queries to cheap models.

**Alternatives considered:**
- A. No escalation — accept the fingerprint's choice. Simple, but can produce poor-quality responses on borderline queries
- B. Always use premium for uncertain queries — safe but expensive, defeats the efficiency purpose
- C. Cost-governor — `shouldEscalateToRemote()` checks confidence against pathway thresholds and escalates when below minimum

**Choice:** C — cost-governor. Escalation only triggers when confidence is explicitly below threshold (cheap < 0.5, medium < 0.3). Default confidence of 0.5 when no catalog match prevents unnecessary escalation. Previously defaulted to 0, which caused 53% escalation rate and negative savings (-43%).

**Trade-off:** Escalation updates the model, cost, and pathway but remains a point-in-time check. It doesn't re-evaluate after the model responds. A feedback loop (check quality → escalate if poor) would be more robust but adds cost and complexity.

**Code:** `src/lib/cardoGuard.js:shouldEscalateToRemote()`, wired into `nightShiftRouter.js:509-523`

---

*Last updated: July 12, 2026*  
*Next: add decisions as they're made. Don't let 6 months pass.*

---

## 11. Client-Side Escalation via User Feedback

**Date:** July 13, 2026  
**Problem:** Users need a way to signal when routing quality is poor. A single misroute shouldn't need a developer to fix — the system should learn from user signals.

**Alternatives considered:**
- A. Server-side feedback endpoint — robust but requires backend infrastructure, data store, rate limiting. Over-engineered for MVP
- B. Automatic quality scoring — complex, unreliable for a demo
- C. Wire existing `storedPreference` mechanism to a 👍/👎 UI — zero new backend, zero API changes, already exists in `nightShiftRouter.js:155-190`

**Choice:** C — thumbs UI + localStorage write. When a user 👎s a non-premium response, the current route ID is appended to `night-shift-user-fingerprint` in localStorage. On the next query, `getStoredRoutePreference()` reads this array and elevates matching queries to a higher-confidence pathway.

**Trade-off:** Client-side storage means a user can reset escalations by clearing localStorage or reloading. The escalation cap (5/session) prevents budget drain but isn't a security guarantee. For production, a server-side `/api/feedback` endpoint with proper rate limiting and authentication is the correct fix.

**Code:** `src/REI.jsx:handleFeedback()`, `src/components/ChatMessage.jsx:115-123`
