# REI.ai Components

## Data contracts

Every component in this directory consumes types defined in `src/lib/contracts.js`. Refer to that file for the canonical shape of `Message`, `RouterDecision`, `EvidenceTier`, `SessionSummary`, and `DomainProfile`.

## Component catalogue

### ChatMessage
**File:** `ChatMessage.jsx`  
**Contract:** `Message`, `RouterDecision`, `EvidenceTier`

Renders a single chat message (user or REI), including:
- Attached record badge (user messages)
- RouterBadge (REI messages with routing decisions)
- Structured reply parsing via `parseAssistantStyleReply` (assistant domain)
- EvidenceCards when `msg.evidence` exists (genealogy domain)
- RouterPanel (routing detail)
- Copy / retry buttons
- Timestamp metadata

Props: `msg`, `index`, `selectedDomain`, `mobile`, `onCopy`, `onRetry`

### RouterBadge
**File:** `RouterBadge.jsx`  
**Contract:** `RouterDecision`

Inline pill badge showing Night Shift route label, model name, and estimated cost. Uses cost computation from `src/lib/costHelpers.js`. Rendered above each REI message bubble.

Props: `routerDecision`, `usage`

### RouterPanel
**File:** `RouterPanel.jsx`  
**Contract:** `RouterDecision`

Expandable detail panel showing full routing metadata: route, model, max tokens, quality gate, enforcement, rationale, and alternative routes with per-1K-token costs.

Props: `routerDecision`, `model`

### EvidenceCard
**File:** `EvidenceCard.jsx`  
**Contract:** `EvidenceTier`

Tier-styled card for genealogy evidence claims. Four tiers with distinct colors:
- Primary Source (green)
- Strong Evidence (blue)
- Needs Review (amber)
- Family Memory (red)

Also exports `parseEvidenceTiers(text)` for extracting tiered claims from genealogy response text, and `estimateEvidenceTokens(claim)` for pre-send estimates.

### IngestPanel
**File:** `IngestPanel.jsx`

Record ingest panel for genealogy domain. Toggles open/closed, provides source type selection (Ancestry, FamilySearch, Find A Grave, Other), paste textarea with character limit guard. Also exports `MAX_RECORD_CHARS` and `SOURCE_TYPES` constants used by `REI.jsx` for pre-send validation.

### PhilosophyModal
**File:** `PhilosophyModal.jsx`

Full-screen modal overlay explaining the three concepts behind R.E.I.: Latin (Rei — the hinge), Operational (Record/Evaluate/Iterate), and Physics (Refractive Index).

Props: `onClose`

### SessionSummary
**File:** `SessionSummary.jsx`  
**Contract:** `SessionSummary`

Session token/cost accumulator shown below the chat. Expandable breakdown by model, markdown export button, reset button.

Props: `sessionTokens`, `sessionMessages`, `sessionCost`, `modelBreakdown`, `showSessionSummary`, `setShowSessionSummary`, `formatCost`, `selectedDomain`, `currentDomain`, `thriftyMode`, `resetSession`

## Shared modules

### src/lib/contracts.js
JSDoc type definitions for all data contracts. Also exports reusable helpers: `computeMsgCost`, `formatCostDisplay`, `estimateInputTokens`, `nextMessageId`.

### src/lib/costHelpers.js
Centralized cost model. Builds `MODEL_COST_PER_1K` map from `getRouterCosts()`, exports `getModelCostRate(model)`, `getCostBadgeLabel(model, tokens)`, and `DEFAULT_COST_MODEL`. Consumed by `REI.jsx`, `RouterBadge.jsx`, and `SessionSummary.jsx`.

### src/lib/replyParser.js
Parses structured CARDO REI replies into sections (Hinge, Facts, Assumptions, Evaluation, ChangeMind, Move). Used by `ChatMessage.jsx` and exported from `REI.jsx` for the prompt evaluation test suite.

### src/lib/featureFlags.js
LocalStorage-backed feature flag system. Current flags: `navigation-rail` (default off). Toggle via the 🧪 button in the AppShell breadcrumb bar. Used in `AppShell.jsx` to gate Phase 3 layout changes.

## Style

All REI-specific styles live in `src/rei.css`. The global app shell styles are in `src/style.css`. No styles are injected via JavaScript — the 530-line useEffect block was removed in PR 2.
