/**
 * index-source.mjs — generate src/data/sourceIndex.json from curated source files.
 *
 * Inlines a curated list of source files into a static JSON artifact so REI can
 * read its own deployed code when asked self-improvement questions, without
 * touching the live filesystem or a GitHub API token.
 *
 * Mirrors the gen-claims.mjs pattern (prebuild → JSON → Vite-bundled import).
 *
 * Usage: node scripts/index-source.mjs [--check]
 *   --check  exit 1 if sourceIndex.json differs from the current source files (CI gate)
 *
 * The artifact is NOT committed to git — it is regenerated on every build.
 * Files are secret-grepped before inclusion; any match is a loud warn (not a halt
 * — the patterns catch env-var references which are legal but worth reviewing).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "src", "data", "sourceIndex.json");
const checkOnly = process.argv.includes("--check");

// ── Curated file list (reviewed — these are the modules REI should be able to
// see its own code for) ──────────────────────────────────────────────────────
const CURATED_FILES = [
  "api/cfai.js",
  "src/lib/nightShiftRouter.ts",
  "src/lib/costHelpers.ts",
  "src/lib/claimGateway.ts",
  "src/__eval__/claimRegistry.ts",
  "src/lib/cardoGuard.js",
  "src/lib/routingLog.ts",
  "src/lib/decisionStore.ts",
  "src/lib/selfAuditContext.ts",
  "src/lib/provider.ts",
  "src/lib/costReplayStats.ts",
  "src/REI.jsx",
];

// ── Secret-scan patterns (loud-warn only — env-var references are legal) ───
const SECRET_PATTERNS = [
  { re: /sk-[a-zA-Z0-9]{20,}/, label: "OpenAI API key (sk-…)" },
  { re: /Bearer\s+[a-zA-Z0-9\-_.]{20,}/, label: "Bearer token literal" },
  { re: /api[_-]?key\s*[:=]\s*['"`][^'"`]{8,}['"`]/i, label: "api_key assignment" },
  { re: /ghp_[a-zA-Z0-9]{36,}/, label: "GitHub personal access token (ghp_…)" },
];

// ── Generate ────────────────────────────────────────────────────────────────
const sourceIndex = {
  generatedAt: new Date().toISOString(),
  files: [],
};

let totalBytes = 0;

for (const relPath of CURATED_FILES) {
  const absPath = join(root, relPath);
  if (!existsSync(absPath)) {
    console.warn(`⚠  ${relPath} not found — skipping`);
    continue;
  }
  const content = readFileSync(absPath, "utf-8");
  for (const { re, label } of SECRET_PATTERNS) {
    const match = content.match(re);
    if (match) {
      const snippet = match[0].length > 60 ? match[0].slice(0, 57) + "..." : match[0];
      console.warn(`⚠  ${label} pattern matched in ${relPath}: ${snippet}`);
    }
  }
  sourceIndex.files.push({
    path: relPath,
    content,
    size: content.length,
  });
  totalBytes += content.length;
}

// ── Check-only mode (CI gate) ───────────────────────────────────────────────
if (checkOnly) {
  const existing = existsSync(outPath) ? readFileSync(outPath, "utf-8") : null;
  const nextFileArray = JSON.stringify(sourceIndex.files, null, 2);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (JSON.stringify(parsed.files, null, 2) === nextFileArray) {
        console.log("sourceIndex.json up to date");
        process.exit(0);
      }
    } catch { /* invalid JSON → stale */ }
  }
  console.error("sourceIndex.json is stale — run: node scripts/index-source.mjs");
  process.exit(1);
}

writeFileSync(outPath, JSON.stringify(sourceIndex, null, 2));
console.log(`sourceIndex.json written: ${sourceIndex.files.length} files, ${totalBytes.toLocaleString()} bytes`);
