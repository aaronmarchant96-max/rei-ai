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
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(root, "src", "data", "errorGaps.json");
const cataloguePath = join(root, "docs", "ERROR_GAP_CATALOGUE.md");

export const VALID_TAGS = new Set(["manual", "ai-cross-check", "test", "claim-gate"]);

// ── Extract tags from git log ───────────────────────────────────────────────
function readGitLog(targetRoot = root) {
  // %x00-delimited: hash, date, subject, body. Uses null byte to handle
  // multi-line commit bodies safely.
  const format = "%H%x00%ad%x00%s%x00%b%x00%x01";
  return execFileSync(
    "git",
    ["log", `--format=${format}`, "--date=short", "--all"],
    { cwd: targetRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
  );
}

export function parseCommitLog(raw) {
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

function extractEntries(targetRoot = root) {
  return parseCommitLog(readGitLog(targetRoot));
}

// ── Compute summary ──────────────────────────────────────────────────────────
export function computeSummary(entries) {
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
export function buildJson(entries, summary, generatedAt = new Date().toISOString()) {
  return {
    generatedAt,
    entries: [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.hash.localeCompare(a.hash)),
    summary,
  };
}

// ── Generate markdown catalogue ───────────────────────────────────────────────
export function generateCatalogue(json) {
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

function objectEntriesMatch(left, right) {
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  const normalize = (value) => Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

export function validateArtifact(artifact) {
  const errors = [];

  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
    return { valid: false, errors: ["artifact must be an object"] };
  }
  if (typeof artifact.generatedAt !== "string" || Number.isNaN(Date.parse(artifact.generatedAt))) {
    errors.push("generatedAt must be a valid timestamp");
  }
  if (!Array.isArray(artifact.entries) || artifact.entries.length === 0) {
    errors.push("entries must be a non-empty array");
  } else {
    artifact.entries.forEach((entry, index) => {
      if (!entry || typeof entry !== "object") {
        errors.push(`entries[${index}] must be an object`);
        return;
      }
      if (typeof entry.hash !== "string" || !/^[0-9a-f]{7}$/i.test(entry.hash)) {
        errors.push(`entries[${index}].hash must be a seven-character commit hash`);
      }
      if (typeof entry.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
        errors.push(`entries[${index}].date must use YYYY-MM-DD`);
      }
      if (typeof entry.subject !== "string" || typeof entry.context !== "string") {
        errors.push(`entries[${index}] must contain string subject and context fields`);
      }
      if (!Array.isArray(entry.tags) || entry.tags.length === 0) {
        errors.push(`entries[${index}].tags must be a non-empty array`);
      } else if (entry.tags.some((tag) => !VALID_TAGS.has(tag))) {
        errors.push(`entries[${index}].tags contains an unsupported tag`);
      }
    });
  }

  if (!artifact.summary || typeof artifact.summary !== "object" || Array.isArray(artifact.summary)) {
    errors.push("summary must be an object");
  } else if (Array.isArray(artifact.entries)) {
    const expected = computeSummary(artifact.entries);
    if (artifact.summary.totalEntries !== expected.totalEntries) {
      errors.push("summary.totalEntries does not match entries");
    }
    if (artifact.summary.totalTags !== expected.totalTags) {
      errors.push("summary.totalTags does not match entries");
    }
    if (!objectEntriesMatch(artifact.summary.byTag, expected.byTag)) {
      errors.push("summary.byTag does not match entries");
    }
    if (!objectEntriesMatch(artifact.summary.byMonth, expected.byMonth)) {
      errors.push("summary.byMonth does not match entries");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function isShallowRepository(targetRoot = root) {
  try {
    const result = execFileSync("git", ["rev-parse", "--is-shallow-repository"], {
      cwd: targetRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return result !== "false";
  } catch {
    // Source archives and isolated builders cannot prove complete history.
    return true;
  }
}

export function evaluateErrorGapState({ isShallow, checkOnly, existing, rawGitLog = "" }) {
  const artifactValidation = validateArtifact(existing);

  if (isShallow) {
    return {
      success: artifactValidation.valid,
      mode: "shallow-artifact-validation",
      skipWrite: !checkOnly && artifactValidation.valid,
      staleDetected: false,
      errors: artifactValidation.errors,
    };
  }

  const entries = parseCommitLog(rawGitLog);
  const summary = computeSummary(entries);
  const json = buildJson(entries, summary);
  const entriesMatch = Array.isArray(existing?.entries)
    && JSON.stringify(existing.entries) === JSON.stringify(json.entries);
  const upToDate = entriesMatch && artifactValidation.valid;

  return {
    success: upToDate || !checkOnly,
    mode: "full-history-comparison",
    skipWrite: false,
    staleDetected: !upToDate,
    errors: upToDate ? [] : artifactValidation.errors,
    json,
    summary,
  };
}

function readExistingArtifact() {
  if (!existsSync(dataPath)) return null;
  try {
    return JSON.parse(readFileSync(dataPath, "utf8"));
  } catch {
    return null;
  }
}

function runCli() {
  const checkOnly = process.argv.includes("--check");
  const shallow = isShallowRepository(root);
  const existing = readExistingArtifact();

  try {
    const rawGitLog = shallow ? "" : readGitLog(root);
    const result = evaluateErrorGapState({
      isShallow: shallow,
      checkOnly,
      existing,
      rawGitLog,
    });

    if (shallow) {
      if (!result.success) {
        console.error(`errorGaps.json: INVALID committed artifact in shallow history — ${result.errors.join("; ")}`);
        process.exitCode = 1;
        return;
      }
      if (result.skipWrite) {
        console.warn("errorGaps.json: shallow history detected; validated committed artifact and skipped overwrite");
      } else {
        console.log(`errorGaps.json: shallow history detected; committed artifact valid (${existing.entries.length} tagged commits)`);
      }
      return;
    }

    if (!result.staleDetected) {
      console.log(`errorGaps.json: up to date (${result.summary.totalEntries} tagged commits)`);
      return;
    }
    if (checkOnly) {
      console.error(
        `errorGaps.json: STALE (file: ${existing?.entries?.length ?? 0} entries, git: ${result.summary.totalEntries} entries) — run \`node scripts/extract-error-gaps.mjs\` and commit the update`
      );
      process.exitCode = 1;
      return;
    }

    writeFileSync(dataPath, JSON.stringify(result.json, null, 2) + "\n");
    console.log(`errorGaps.json: wrote ${result.summary.totalEntries} entries (${result.summary.totalTags} tags)`);
    writeFileSync(cataloguePath, generateCatalogue(result.json));
    console.log(`docs/ERROR_GAP_CATALOGUE.md: regenerated (${result.summary.totalEntries} entries)`);
  } catch (err) {
    console.error("extract-error-gaps: git log failed:", err.message);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) runCli();
