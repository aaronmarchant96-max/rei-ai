<!--
CARDO REI methodology applied to this document.
Reference: [CARDO REI Methodology](PROMPTHOUND-DOCS/CARDO-REI.md)
-->

# HingeMarket — v1 Scope (Atlanta Only, Locked)

**Status:** Locked for implementation.  
**Revised:** 2026-05 (user confirmation + data strategy priority)  
**Supersedes:** `v1-scope-locked.md` (the broader Atlanta+Charlotte version)  
**Core Principle:** Ground everything in real public data depth before any UI polish or AI expansion. A beautiful interface on shaky or shallow data destroys credibility.

> **This is a scenario exploration and hinge-finding tool only.**  
> Not investment advice. Not a forecast. Not predictive analytics.  
> All outputs are built from public snapshots + explicit assumptions.  
> Actual housing markets can (and do) remain irrational longer than any model can stay solvent.

---

## v1 Target: Atlanta Metro Only (Locked)

**Single metro, deep granularity.**

**Why Atlanta wins for v1 (user + validation):**
- Highest flipping/investor activity among major U.S. metros (Georgia leads national flipping rate; Atlanta metro consistently tops or near-tops volume lists in 2025–2026 ATTOM/Redfin data).
- Excellent free public data coverage (Zillow ZIP-level ZHVI, FHFA, City of Atlanta open permits).
- Rich internal variation: urban core (e.g. 30310, 30318), intown emerging neighborhoods, and maturing suburbs → strong signal variety for renovation/flip dynamics.
- Real renovation + flip economics (the tool’s exact sweet spot).
- High data density allows us to go to **ZIP / neighborhood level** instead of hand-wavy metro averages.

**Explicit guardrail:** Limit v1 to **~10–12 ZIP codes or NPUs** (Neighborhood Planning Units) inside the Atlanta-Sandy Springs-Roswell metro.  
This is non-negotiable for v1. Depth over breadth. We pick the 10–12 with the best combination of flip activity, data completeness, and renovation signal (mix of hot, cooling, and transitional pockets).

**v2 expansion path (explicitly deferred):** Charlotte, Pittsburgh, Buffalo/Cleveland, Raleigh, or Austin.

---

## v1 Data Strategy (Locked — User's Table + Validation)

| Layer                  | Source (v1)                                      | Feasibility | Role in Tool                              |
|------------------------|--------------------------------------------------|-------------|-------------------------------------------|
| **Price Trends**       | Zillow ZHVI (ZIP-level) + FHFA HPI               | High (free) | Core for scenario ranges and appreciation |
| **Permit / Construction** | City of Atlanta open data (Accela via ArcGIS Hub) | High        | New construction density + supply pressure signals |
| **Satellite Signals**  | Google Earth Engine (Sentinel-2)                 | Medium      | Roof condition proxies, vacancy, basic change detection (new construction / vegetation loss) |
| **Economic / Migration** | Census / BLS public data (via FRED)            | High        | Broader context (jobs, population shifts) |
| **AI Summary + Hinge** | Gemini (structured prompts)                      | High        | Narrative "Why this score" + "What would actually change this outlook" |

**Validation notes (May 2026):**
- **Zillow ZIP ZHVI**: Full national `Zip_zhvi_...` CSV exists and is updated monthly. Filterable to Atlanta metro (hundreds of ZIPs with usable history). This is the backbone.
- **FHFA HPI**: Excellent repeat-sales complement at ZIP5 level for validation.
- **Atlanta Permits**: Raw point-level data (2019–2024+) with address, valuation, status, and NPU/ZIP attribution available via ArcGIS FeatureServer + CSV exports. Easy to aggregate to ZIP or NPU for "new construction density."
- **Sentinel-2 via GEE**: Technically mature for urban change detection (NDBI, NDVI differencing, built-up masks). Roof condition is proxy-level only (major material changes or new builds, not fine shingle wear). For v1 we will keep this **narrow**: pre-computed or simple exported change statistics for the chosen 10–12 ZIPs (e.g., % built-up change over 12–24 month windows). Live interactive GEE app is possible but deferred if it risks v1 scope or complexity.
- All core layers are free/public with clear attribution paths.

**Data Refresh Philosophy (v1):**  
Bundle recent snapshots (Zillow ZIP CSV filtered, permit aggregates, GEE-derived stats) as static JSON/TS modules with hard "Data as of YYYY-MM-DD" stamps everywhere.  
Prominent "Refresh instructions" with direct download links.  
No live API calls in the first shipped prototype. (CSV upload shape can be defined for power users later.)

---

## Scope Guardrails (Non-Negotiable for v1)

- **Geography**: Exactly ~10–12 ZIPs / NPUs in Atlanta metro. No more.
- **Focus**: Appreciation scenario ranges (1yr / 3yr) + basic flip ROI signals under each scenario.
- **Hinge emphasis**: Every output must surface uncertainty and the actual variables that can flip the recommendation. This is the CARDO REI spine.
- **Disclaimers**: Loud, repeated, non-dismissible, in multiple locations (hero, scenario cards, flip calculator, hinge section, footer).
- **Satellite definition for v1**: Basic Sentinel-2 change detection proxies only (new construction density, major roof/vegetation shifts). Not Planet Labs, not high-res commercial, not drone-level condition scoring.
- **AI role**: Controlled, structured Gemini use for narrative + hinge factors is acceptable in *this* tool (it is the separate "AI expansion" vehicle). Must always be framed as synthetic illustration layered on top of the public data math. Never the primary output.
- **Out of scope**: Whole-metro averages as the main view, property-level comps or ARV engines, live data fetching, paid imagery, ML black boxes, user accounts, more than one metro, 5-year point forecasts (scenarios + sensitivity only).

---

## Core Features (Locked)

1. **ZIP/Neighborhood Selector** (10–12 curated Atlanta pockets)
2. **4-Scenario Engine** (Base / Upside / Conservative / Downside) with explicit driver tables
3. **Heat / Verdict Meter** (Hot → Avoid) derived from price momentum + supply pressure (permits + Sentinel change) + transaction health proxies
4. **Flip Lens** — Simple, transparent ROI calculator (purchase discount, reno %, hold time, sell costs, target margin). Shows break-even appreciation and profit bands per scenario.
5. **Hinge Section** — "What would change this outlook the most?" with 2–4 quantified sensitivities per selected ZIP (e.g., "If permit volume in this ZIP stays +X% YoY for 18 months, 3yr Base shifts from +Y% to -Z%").
6. **Narrative Layer** (Gemini or rule-based) — "Why this score" + plain-English hinge explanation, always with heavy framing.
7. **Copyable Scenario Report** (markdown) for deal memos.
8. **Mobile-first UI** (thumb-friendly, high readability, same visual language discipline as CARDO GUARD).
9. **Strong uncertainty visualization** (ranges, not points; sensitivity callouts).

---

## Success Criteria

- A user can select any of the 10–12 ZIPs, load realistic recent data, adjust flip assumptions, and immediately see:
  - How the heat verdict and ROI change across the four scenarios.
  - Which real public signals (permits, Sentinel change, price momentum, jobs) are driving it.
  - What specific changes in those signals would flip the recommendation.
- Every number has a visible source + date.
- Disclaimers are impossible to miss or misread.
- The tool feels like a serious, slightly conservative construction/REI decision instrument — not proptech theater.
- Pure calculation logic reaches 90%+ meaningful test coverage before heavy UI work.

---

## Next Moves (Immediate Priority Order)

1. **Confirm Atlanta + 10–12 ZIP selection approach** (this doc locks it; we can pick the exact list in the data step).
2. **Data ingestion schema** (TypeScript interfaces + sample shape for the 10–12 ZIPs, including Zillow price series, permit aggregates, Sentinel-derived stats, BLS context).
3. **Initial Gemini prompt set** for "Why this score" + quantified hinge factors (structured JSON, heavy guardrail language baked in).
4. **Minimal viable "backend" plan** for v1: static JSON bundles + optional Zillow CSV filter script (Python or Node) that a user can run locally to refresh the bundled data.
5. Pure scenario + heat + flip math module (with tests) before any UI.

---

**This is now the binding v1 contract.**

We are deliberately narrow and deep so the hinge is real, the data is credible, and the disclaimers are honest.

Ready for the data ingestion schema next?

(Your move — or flag any tightening you want in this doc first.)