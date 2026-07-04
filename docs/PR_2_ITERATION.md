# PR 2 Iteration Report — REI Component Architecture

## Goal

Eliminate CSS injection, extract reusable components, connect the evidence pipeline, and reduce the main component's surface area without breaking any existing behavior.

## Hypothesis

Separating presentation (CSS), data display (components), and data parsing (lib modules) from the main component will improve maintainability, testability, and readability. The evidence parser, written before the UI wiring and tested with a deterministic eval harness, will catch bugs before they reach production.

## Approach

Three-stage refactor, each gated by lint → test → build:

1. **Cost model centralization** — Eliminate duplicated `MODEL_COST_PER_1K` construction across `REI.jsx` and `RouterBadge.jsx`
2. **Component extraction** — Pull `IngestPanel`, `ChatMessage`, and `parseAssistantStyleReply` out of the main file
3. **Evidence wire-up** — Connect the evidence parser (built in PR 1) to the ChatMessage renderer, gated by the eval test suite

## What worked

### CSS extraction (PR 1 carry-over)
The 530-line injected `<style>` block in `REI.jsx` was moved to `src/rei.css`. All keyframes, shell overrides, and component styles now live in a static file loaded by Vite. Jest config was updated with `moduleNameMapper: { "\\.css$": "identity-obj-proxy" }` to handle the CSS import.

### Cost model deduplication
`MODEL_COST_PER_1K`, `DEFAULT_COST_MODEL`, and `getCostBadgeLabel` were duplicated identically in two files. Extracting them to `src/lib/costHelpers.js` removed 25 lines of duplication and eliminated the `getRouterCosts` import from consumer components that only needed cost rates.

### Evidence parser testing
The `parseEvidenceTiers` function, written in PR 1 with zero tests, was validated with a 10-test eval suite. The tests caught a bug: results were ordered by tier iteration (primary → strong → needs-review → family-memory) rather than by text position. Fixed by adding `match.index` tracking and sorting results before returning.

### Component extraction
- `IngestPanel.jsx` (90 lines extracted) — self-contained, no shared state
- `ChatMessage.jsx` (110 lines) — the largest single extraction, consolidating the message rendering, structured reply parsing, evidence cards, router panel, and copy/retry buttons
- `replyParser.js` (40 lines) — broke the circular dependency: both `REI.jsx` (for test exports) and `ChatMessage.jsx` needed `parseAssistantStyleReply`

## What didn't

### Missing state declarations
When removing the 530-line useEffect block, 4 `useState` declarations (`selectedDomain`, `rawRecordText`, `showIngest`, `recordSourceType`) were accidentally deleted. These were adjacent to the useEffect closing brace in the original code. Caught immediately when `no-undef` lint errors showed 33 undefined variables. Fixed by re-adding the declarations.

### CSS import broke Jest
Jest's default transform pipeline doesn't handle CSS imports. Added `moduleNameMapper` with `identity-obj-proxy` to jest.config.cjs. This also fixed the AppShell.test.jsx failures that were caused by the `import "./rei.css"` statement in REI.jsx transitively breaking any test that rendered AppShell (which lazy-loads REI).

## Measurements

| Metric | Before (PR 1 end) | After (PR 2 end) | Change |
|--------|-------------------|-------------------|--------|
| `REI.jsx` lines | 1,064 | 804 | -260 (-24%) |
| `src/rei.css` lines | — | 885 | new |
| Components extracted | 4 | 8 | +4 |
| Imported modules (REI.jsx) | 13 | 13 | stable |
| Total test suites | 14 | 14 | stable |
| Total tests | 105 | 105 | stable |
| REI bundle size | 62.9 kB | 62.8 kB | -0.1 kB |
| Main bundle size | 340.6 kB | 340.6 kB | stable |

## Lessons

1. **Eval harnesses should precede components.** Writing the 10 parser tests before wiring the UI caught a sort-order bug that would have caused evidence cards to render in the wrong order. The fix was 3 lines. Without the tests, it would have been a silent UI bug.

2. **Extract to shared modules before extracting UI components.** Moving `parseAssistantStyleReply` to `replyParser.js` first prevented a circular dependency between `REI.jsx` and `ChatMessage.jsx`. Lesson: shared data functions should never live in UI components.

3. **CSS extraction needs Jest config awareness.** The `import "./rei.css"` broke 4 test suites because Jest doesn't handle CSS imports. The fix (identity-obj-proxy) took 2 minutes to implement but 10 minutes to diagnose.

4. **`formatCost` is still inline in REI.jsx** for the pre-send estimate. Full elimination of cost computation from the main component remains for a future pass — it's the last cost-related code in the file.

## Next iteration

- Full inline style elimination (30 remaining `style={{}}` patterns)
- `formatCost` migration to costHelpers (last remaining inline cost logic in REI.jsx)
- Navigation rail / context panel behind feature flag (Phase 3)
