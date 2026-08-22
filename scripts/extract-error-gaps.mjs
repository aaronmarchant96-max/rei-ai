/**
 * extract-error-gaps.mjs — extract [caught: X] tags from git commit history.
 *
 * Parses every commit body for `[caught: <tag>]` tags and produces two artifacts:
 *   1. src/data/errorGaps.json  — structured machine-readable dataset (committed)
 *   2. docs/ERROR_GAP_CATALOGUE.md — human-readable catalogue with timeline,
 *      tag tallies, and an analytics section for long-term pattern analysis.
 *
 * The only thing a human has to do is add a `[caught: <tag>]` line to their
 * commit body. Everything else is automatic.
 *
 * Valid tags (per AGENTS.md error-gap taxonomy):
 *   manual        — caught by a human reviewing output / dashboard / diff
 *   ai-cross-check — caught by human comparing two AI-generated proposals
 *   test          — caught by an automated test suite
 *   claim-gate    — caught by a verifyAll() claim failing in the FEYNMAN GATE
 *
 * Usage: node scripts/extract-error-gaps.mjs [--check]
 *   --check  exit 1 if errorGaps.json doesn't match what git log reports (CI gate)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(root, "src", "data", "errorGaps.json");
const cataloguePath = join(root, "docs", "ERROR_GAP_CATALOGUE.md");
const checkOnly = process.argv.includes("--check");

const VALID_TAGS = new Set(["manual", "ai-cross-check", "test", "claim-gate"]);

// ── Extract tags from git log ───────────────────────────────────────────────
function extractEntries() {
  // %x00-delimited: hash, date, subject, body. Uses null byte to handle
  // multi-line commit bodies safely.
  const format = "%H%x00%ad%x00%s%x00%b%x00%x01";
  let raw;
  try {
    raw = execSync(
      `git log --format="${format}" --date=short --all`,
      { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
    );
  } catch (err) {
    console.error("extract-error-gaps: git log failed:", err.message);
    process.exit(1);
  }

  const entries = [];
  const commits = raw.split("\x01").filter(Boolean);

  for (const block of commits) {
    if (!block.includes("[caught:")) continue;

    const [hash, date, subject, body] = block.trim().split("\x00");
    const fullText = ((subject || "") + "\n" + (body || "")).trim();

    const tagMatches = [...fullText.matchAll(/\[caught:\s*([^\]]+)\]/gi)];
    const tags = tagMatches
      .map(m => m[1].trim().toLowerCase())
      .filter(t => VALID_TAGS.has(t));

    if (tags.length === 0) continue;

    const contextLine = fullText
      .split("\n")
      .find(line => line.includes("[caught:"))
      ?.replace(/\[caught:[^\]]*\]/gi, "")
      .replace(/^[\s,;\-:—]+|[\s,;\-:—]+$/g, "")
      .replace(/^["']+|["']+$/g, "")
      .trim() || subject || "";

    entries.push({
      hash: hash?.slice(0, 7) || "",
      date: date?.trim() || "",
      subject: subject?.trim() || "",
      tags,
      context: contextLine || "",
    });
  }

  return entries;
}

// ── Compute summary ──────────────────────────────────────────────────────────
function computeSummary(entries) {
  const byTag = {};
  const byMonth = {};
  let totalTags = 0;

  for (const entry of entries) {
    const month = entry.date.slice(0, 7);
    byMonth[month] = (byMonth[month] || 0) + 1;

    for (const tag of entry.tags) {
      byTag[tag] = (byTag[tag] || 0) + 1;
      totalTags++;
    }
  }

  return {
    totalEntries: entries.length,
    totalTags,
    byTag,
    byMonth,
  };
}

// ── Build JSON payload ───────────────────────────────────────────────────────
function buildJson(entries, summary) {
  return {
    generatedAt: new Date().toISOString(),
    entries: entries.sort((a, b) => b.date.localeCompare(a.date) || b.hash.localeCompare(a.hash)),
    summary,
  };
}

// ── Generate markdown catalogue ───────────────────────────────────────────────
function generateCatalogue(json) {
  const { entries, summary } = json;

  const tagTally = Object.entries(summary.byTag)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => `| \`${tag}\` | ${count} |`)
    .join("\n");

  const timeline = entries
    .map(e => {
      const tagPills = e.tags.map(t => `\`${t}\``).join(" ");
      const context = e.context ? ` — ${e.context}` : "";
      return `| \`${e.hash}\` | ${e.date} | ${e.subject.slice(0, 80)}${e.subject.length > 80 ? "..." : ""} | ${tagPills}${context} |`;
    })
    .join("\n");

  const oldest = entries.length > 0 ? entries[entries.length - 1].date : "—";
  const newest = entries.length > 0 ? entries[0].date : "—";

  return `# Error-Gap Catalogue

> Auto-generated from git commit history.
> Last updated: ${json.generatedAt}
> Span: ${oldest} → ${newest} (${summary.totalEntries} tagged commits, ${summary.totalTags} total tags)

## Tag Taxonomy

| Tag | Meaning | Question this tag answers |
|---|---|---|
| \`manual\` | Caught by a human reviewing output / dashboard / diff | What does the human see that automation doesn't? |
| \`ai-cross-check\` | Caught by comparing two AI-generated proposals | Where do models disagree productively? |
| \`test\` | Caught by an automated test suite | Which failures did tests prevent from reaching production? |
| \`claim-gate\` | Caught by a verifyAll() claim failing in the FEYNMAN GATE | Which claim drifted from reality, and which metric caught it? |

## Summary

| Tag | Count |
|---|---|
${tagTally}

## Timeline (newest first)

| Commit | Date | Subject | Tags & Context |
|---|---|---|---|
${timeline}

## Analytics

> Populated as the dataset grows. Currently ${summary.totalEntries} entries — threshold for meaningful pattern analysis is ~30+ entries across 2+ months.

### Current observations

- **${summary.totalEntries} tagged commits** across ${Object.keys(summary.byMonth).length} month(s).
- No pattern analysis yet — dataset is too small for statistical significance.
- The first four tags appeared in the same commit (\`02a0076\`, the AGENTS.md doc that established the practice).

### Questions this dataset will eventually answer

1. What kinds of failures does REI catch?
2. Which defense catches them?
3. Which failures escape all defenses?
4. How often does deterministic evaluation outperform an LLM judge?
5. Where does the router drift from the evaluator?

### How to contribute

Add a \`[caught: <tag>]\` line to your commit body when a commit fixes or documents an error caught by a specific defense. Valid tags: \`manual\`, \`ai-cross-check\`, \`test\`, \`claim-gate\`.

Run \`node scripts/extract-error-gaps.mjs\` to regenerate this catalogue. CI runs \`--check\` to flag drift.
`;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const entries = extractEntries();
const summary = computeSummary(entries);
const json = buildJson(entries, summary);
const rendered = JSON.stringify(json, null, 2) + "\n";

// Determine what changed
let existing = null;
try {
  existing = existsSync(dataPath) ? JSON.parse(readFileSync(dataPath, "utf8")) : null;
} catch { existing = null; }

const entriesMatch =
  existing &&
  existing.entries &&
  JSON.stringify(existing.entries) === JSON.stringify(json.entries);

if (entriesMatch) {
  console.log(`errorGaps.json: up to date (${summary.totalEntries} tagged commits)`);
  process.exit(0);
}

if (checkOnly) {
  console.error(
    `errorGaps.json: STALE (file: ${existing?.entries?.length ?? 0} entries, git: ${summary.totalEntries} entries) — run \`node scripts/extract-error-gaps.mjs\` and commit the update`
  );
  process.exit(1);
}

writeFileSync(dataPath, rendered);
console.log(`errorGaps.json: wrote ${summary.totalEntries} entries (${summary.totalTags} tags)`);

const catalogue = generateCatalogue(json);
writeFileSync(cataloguePath, catalogue);
console.log(`docs/ERROR_GAP_CATALOGUE.md: regenerated (${summary.totalEntries} entries)`);
