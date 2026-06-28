<!--
CARDO REI methodology applied to this document.
Reference: [CARDO REI Methodology](PROMPTHOUND-DOCS/CARDO-REI.md)
-->

# HingeMarket — v1 Scope (Locked)

**Status:** Locked for implementation.  
**Date:** 2026-04 (per user choice "1" — Lock in v1 Scope)  
**Brand:** CARDO / PromptHound Labs  
**Core Idea:** A scenario engine that makes the *hinge* visible for housing market decisions — especially relevant to flippers and investors who need to see what actually moves the outcome.

> "This is a scenario exploration tool, not a forecast. Not investment advice. Not predictive. All outputs are illustrations built from public data snapshots and explicit assumptions. Markets can do whatever they want."

---

## v1 Metros (Locked: 2 deep)

**Primary focus:**
- **Atlanta-Sandy Springs-Alpharetta, GA** (high flip volume, strong investor activity, excellent public permit data, migration tailwinds)
- **Charlotte-Concord-Gastonia, NC-SC** (more resilient pricing recently, corporate growth story, solid open data for permits and activity)

**Rationale for narrowing to these two:**
- Highest signal quality for v1 (flip-relevant metrics + fresh public permit feeds).
- Contrasting but related Southeast growth stories: Atlanta = volume + investor heat; Charlotte = steadier corporate-driven demand with different supply response.
- Both have high-quality free public building permit portals (ArcGIS + Socrata-style) for the "supply pressure" explanatory layer.
- Data freshness and granularity are strong; easy to validate assumptions manually.

**Austin-Round Rock (TX)** and **Phoenix** are strong candidates for v1.5 or v2 (Austin had the sharpest recent correction and interesting "over-supply hinge"; Phoenix has scale). Pittsburgh is good for value/contrast play later. **Do not expand geography in v1.**

---

## Primary Data Strategy (Locked)

| Source | Role in v1 | Access | Freshness | Notes for Flippers |
|--------|------------|--------|-----------|--------------------|
| **Zillow ZHVI** (Metro_zhvi_..._sm_sa_month.csv) | Core typical home value levels + historical momentum | Free CSV download (no key) | Monthly (~16th) | Middle-tier (33-67p) "typical" value. Use for ARV anchors. |
| **Zillow ZHVF** (Metro_zhvf_growth_...csv) | 1-month / 3-month / 12-month growth forecasts | Free CSV | Monthly | Best free short-term anchor available. Explicitly 1yr scenarios draw from this. |
| **Redfin Data Center** (metro downloads) | DOM, price cuts %, inventory, sales volume, investor purchase share | Free CSV | Weekly / monthly | Highest-signal flipper metrics. Long DOM + high price cuts = Cooling/ Avoid signals. |
| **FHFA HPI** (purchase-only metro) | Clean, official YoY price index cross-check | Free CSV / FRED | Quarterly | Less model-dependent than ZHVI. Good sanity check. |
| **City/County Open Permit Data** (Atlanta DCP ArcGIS, Mecklenburg ArcGIS, Austin Socrata) | "Satellite proxy" — new supply pressure via permit volume + valuation trends | Free CSV / REST API | Daily to weekly | YoY % change in issued permits (by type/value) is the strongest public leading indicator of future inventory pressure. |
| **BLS / FRED** (employment, LAUS) | Demand pulse proxy (job growth) | Free | Monthly | Correlates with migration + buyer power. |

**v1 Data Refresh Philosophy (synthetic-first, low-risk):**
- Bundle 2-3 recent snapshots per metro (with clear "Data as of YYYY-MM-DD" stamps).
- Prominent "How to refresh" section with direct links + simple instructions.
- Optional later: drag-and-drop CSV upload for power users (parse the exact Zillow/Redfin column shapes).
- **No live backend fetches in v1.** Keeps it a pure client-side scenario tool. Matches CARDO GUARD synthetic discipline.

**Satellite Signals (v1 definition):**
Public building permit trends + inventory/new construction metrics from Zillow/Redfin serve as the explanatory "supply signal" layer.  
Actual satellite imagery change detection (Sentinel-2, etc.) is **explicitly out of scope for v1** — high infra cost, lower signal-to-noise for flip timing vs. permit filings, and adds complexity/risk without improving the hinge visibility enough at this stage.

---

## Scenario Engine (Locked)

**Four cases (always shown side-by-side):**
- **Base** — anchored to latest ZHVF where credible + recent 3yr historical volatility.
- **Upside** — favorable drivers (rate relief, migration acceleration, permit slowdown).
- **Conservative** — mild headwinds (higher-for-longer rates, steady permits).
- **Downside** — adverse combination (recession indicator + permit surge + inventory spike).

All % ranges are **explicitly driver-based and documented** in the UI. No black-box ML.

**Time horizons:** 1yr (closest to ZHVF), 3yr, 5yr (wider bands, more sensitivity emphasis).

**Output per scenario + metro:**
- Expected ZHVI range (low / base / high)
- Implied cumulative appreciation %
- Composite "Heat" verdict (see below)
- Simple flip P&L example (see below)

---

## Heat Meter (Locked)

5-level, color-coded, prominent:

- **Hot** (strong green) — Tight inventory, low DOM, rising values, healthy investor flow, permit growth moderate.
- **Warming**
- **Flat**
- **Cooling**
- **Avoid** (strong amber/red) — High inventory, long DOM (>60-70), elevated price cuts (>25-30%), permit surge signaling future oversupply, weak job pulse.

The meter is a **composite** of:
1. Recent price momentum (ZHVI YoY + ZHVF direction)
2. Supply pressure (permit YoY + active inventory growth)
3. Transaction health (DOM, price cut share, investor purchase %)

**Never** present as prediction. Always "Current composite reading based on latest public snapshots."

---

## Flip Lens (v1)

Simple, transparent "What a disciplined flip might look like under each scenario."

Inputs (user-adjustable, with good defaults per metro):
- Target purchase discount vs. current ZHVI (or ARV estimate)
- Reno / holding cost % of purchase
- Expected hold period (days)
- Selling costs + concessions %
- Minimum acceptable profit / ROI target

Outputs (per scenario):
- Implied max purchase price to hit target
- Break-even appreciation required
- Estimated profit band
- "Margin of safety" callout

This makes the **cost-weighted hinge** visceral: "Under Downside scenario you need 4% more appreciation than Base just to break even on a 6-month flip."

---

## The Hinge Section (The Spine)

**"What would change this outlook the most?"**

For each metro, surface 2-3 quantified sensitivities with real public data backing:

Example (illustrative):
- "If single-family building permits remain +25% YoY for the next 24 months, the 3yr Base case shifts from +5% to -1% (higher future inventory pressure)."
- "A sustained 100bp mortgage rate drop vs current levels historically correlates with +3-5pp faster 2yr appreciation in these metros (all else equal)."
- "If investor purchase share drops below 15% while inventory keeps rising, the heat meter moves one full step toward Cooling."

This is the **CARDO REI** moment — the actual variables that can flip the recommendation.

---

## UI / Experience Requirements (Locked)

- Mobile-first (fat thumbs, 42px+ targets, readable on 360px, no horizontal scroll).
- Prominent Recommendation / Heat Hero (dynamic color like CARDO GUARD: green tints for Hot/Warming, amber for Cooling/Avoid).
- Scenario cards in a clean 2x2 or horizontal scroller on mobile.
- One "Load realistic example" button per metro (pulls from curated recent snapshots).
- Full-width inputs where needed.
- Strong, non-dismissible disclaimers in multiple places (top, bottom, near any "outlook" language).
- "Copy scenario summary" (markdown) for easy pasting into deal memos.
- No live AI in v1 (see below).

---

## AI / Gemini Role in v1 (Locked: Minimal or None)

**Option A (preferred for purity):** Fully synthetic / rule-driven in v1. The hinge explanations and narratives come from the explicit driver logic we code. No Gemini calls.

**Option B (if we want to demo the expansion path early):** One optional "Explain the current hinge in plain language" button that sends the *current numbers + top 3 signals* to a tightly prompt-engineered Gemini Flash call, with:
- Forced "This is a scenario illustration only..." framing in every sentence.
- Strict JSON schema.
- Origin + rate limiting if we ever host it.
- Prominent "Synthetic narrative layer — not a forecast" banner.

**Decision:** Start with Option A. The value of HingeMarket is the transparent math + public data + hinge visibility. Adding Gemini too early risks the same "live vs synthetic" tension we deliberately avoided in CARDO GUARD. We can add a separate "AI narrative expansion" experiment later as its own capability demo.

---

## Features In Scope for v1

- 2 metros (Atlanta, Charlotte) with 4 scenarios each
- ZHVI/ZHVF + Redfin + permit signal ingestion (hardcoded recent snapshots + refresh instructions)
- Heat meter + composite logic
- Simple flip P&L calculator with adjustable assumptions
- "What moves the needle" quantified hinge section
- Mobile-polished UI matching CARDO GUARD visual language (colors, spacing, typography)
- Strong disclaimers everywhere
- Copyable reports
- Realistic example loader
- Documentation of all data sources + dates + limitations

---

## Explicitly Out of Scope for v1

- More than 2 metros
- Live data fetching from APIs (user must download CSVs)
- Actual satellite / imagery analysis
- ML or black-box forecasting models
- Property-level comps, ARV estimators, or deal underwriting depth
- User accounts, persistence, sharing, history
- Paid data sources (ATTOM, CoreLogic, etc.)
- 5+ year point forecasts (only scenario bands + sensitivity)
- Integration inside debate-furnace app (build as standalone prototype first for brand clarity)
- Any claims of "prediction" or "recommended buys"

---

## Success Criteria / Guardrails

- User can load a metro, adjust flip assumptions, and immediately see which scenario flips the heat verdict and why.
- Every number has a visible source + date.
- Disclaimers are impossible to miss.
- 90%+ meaningful test coverage on pure calculation / scenario logic (similar to cardoGuard.js discipline).
- Git history remains atomic and reviewable.
- Feels like a serious, slightly conservative construction / real estate decision tool — not a shiny proptech toy.

---

## Next Steps (After This Lock)

1. Create data schema + sample snapshot files (JSON or TS modules) for Atlanta + Charlotte.
2. Draft the pure JS/TS scenario + heat calculation engine (no UI yet).
3. Write initial Jest tests for the model (edge cases on permit surge, DOM thresholds, etc.).
4. UI shell + mobile layout (hero, scenario grid, flip calculator).
5. Hinge sensitivity module + copy.
6. Polish + internal manual test against real recent data.
7. Atomic commit stack + README update.

**This document is the contract for v1.** Any scope creep requires explicit re-lock.

---

*Built under the CARDO REI discipline: find the hinge, show the cost-weighted tradeoff, keep the assumptions visible, protect the user from overclaim.*

**Locked by user selection "1". Ready for implementation planning.**