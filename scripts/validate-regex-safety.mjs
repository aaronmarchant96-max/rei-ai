/**
 * validate-regex-safety.mjs — CI gate to prevent catastrophic backtracking
 * patterns from entering the client-side D1 scanner or any other source file.
 *
 * Scans src/ and api/ for regex literals that exhibit known attack patterns:
 *   1. Nested quantifiers — (a+)*, (a*)+, ([a-z]+){2,}, etc.
 *      These can cause exponential backtracking when input doesn't match.
 *   2. Lookbehind + lookahead in same expression — expensive engine operations
 *      that can lock the thread on adversarial input.
 *
 * This is a structural pattern check, not an execution cost analyzer. It
 * produces false positives on regexes that are bounded (e.g. matching short
 * fixed strings). Those can be suppressed with a comment annotation:
 *   // regex-safe: bounded-input
 *
 * Usage: node scripts/validate-regex-safety.mjs [--check]
 *   --check  exit 1 if any unsafe pattern is detected (CI gate)
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

// ── Known-safe regexes that this scanner would otherwise flag ───────────────
// Add patterns here if a nested-quantifier regex is genuinely bounded
// (e.g. matching a fixed-length token, not user-controlled input).
const SAFE_ANNOTATION = "regex-safe";

// ── Detection patterns (these regexes detect regexes — meta!) ───────────────

function findRegexLiterals(content, filePath) {
  const findings = [];

  // Match regex literals: /pattern/flags
  // This is a best-effort regex-for-regexes. It handles the common cases
  // but won't catch all edge cases (e.g. multiline regexes with escaped
  // slashes in character classes).
  const re = /\/((?:[^\\\/]|\\[^])+)\/([gimsuys]*)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const pattern = m[1];
    const full = m[0];
    const line = content.slice(0, m.index).split("\n").length;

    // Check for suppression comment on the same line or preceding line
    const lineStart = content.lastIndexOf("\n", m.index) + 1;
    const prevLineStart = lineStart > 0
      ? content.lastIndexOf("\n", lineStart - 2) + 1
      : 0;
    const context = content.slice(prevLineStart, m.index + full.length);
    if (context.includes(SAFE_ANNOTATION)) continue;

    // 1. Nested quantifiers — catastrophic backtracking risk
    if (hasNestedQuantifier(pattern)) {
      findings.push({
        file: filePath,
        line,
        pattern: full,
        issue: "Nested quantifier — risk of catastrophic backtracking on adversarial input",
        severity: "error",
      });
    }

    // 2. Lookbehind + lookahead in same expression
    if (hasLookaroundPair(pattern)) {
      findings.push({
        file: filePath,
        line,
        pattern: full,
        issue: "Lookbehind + lookahead pair — expensive on long inputs, can lock the JS thread",
        severity: "warn",
      });
    }

    // 3. Unbounded wildcard in quantified group
    if (hasWildcardQuantifier(pattern)) {
      findings.push({
        file: filePath,
        line,
        pattern: full,
        issue: "Unbounded wildcard (.*) in a quantified group — exponential backtracking risk",
        severity: "error",
      });
    }
  }

  return findings;
}

function hasNestedQuantifier(pattern) {
  // Match a group containing quantifiers, followed by another quantifier
  // Examples: (a+)*, ([a-z]+){2,}, (foo|bar+)*, (?:ab)+
  // We want to catch the dangerous ones:
  // - group with `+` or `{n,}` inside, followed by `*`, `+`, or `{n,}`
  // But NOT (?:ab|c)+ — bounded alternation with fixed-length options is fine
  // when the outer quantifier isn't inherently dangerous.

  // Strategy: find groups that contain `+` or unbounded `{n,}`, followed by
  // another `*`, `+`, or `{n,}` outside the group.
  const innerQuantifier = /\([^)]*(?:[\*\+]|\{\d+,\})[^)]*\)[\*\+]|\([^)]*(?:[\*\+]|\{\d+,\})[^)]*\)\{\d+,\}/;
  // Also catch: (.+)+, (.*)*, (.+)*, (.*)+
  const dotQuantifier = /\([^)]*\.\s*[\*\+][^)]*\)[\*\+]/;

  return innerQuantifier.test(pattern) || dotQuantifier.test(pattern);
}

function hasLookaroundPair(pattern) {
  const hasLookbehind = /\(\?<[=!]/.test(pattern);
  const hasLookahead = /\(\?[=!]/.test(pattern) && !pattern.includes("?<");
  return hasLookbehind && hasLookahead;
}

function hasWildcardQuantifier(pattern) {
  // Unbounded wildcard `.*` or `.+` inside a group that itself has a
  // quantifier — classic (.*?)+ trap or (?:.|\s)*+
  return /\([^)]*\.\*[^)]*\)[\*\+]/i.test(pattern) ||
         /\([^)]*\.\+[^)]*\)[\*\+]/i.test(pattern);
}

// ── Collect source files ────────────────────────────────────────────────────
const SOURCE_EXTS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const SOURCE_DIRS = ["src", "api"];

function walk(dir, rel) {
  const results = [];
  const entries = readdirSync(join(root, rel, dir), { withFileTypes: true });
  for (const entry of entries) {
    const fullRel = join(rel, dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(entry.name, join(rel, dir)));
    } else if (SOURCE_EXTS.has(entry.name.slice(entry.name.lastIndexOf(".")))) {
      results.push(fullRel);
    }
  }
  return results;
}

const sourceFiles = SOURCE_DIRS.flatMap(d => walk(d, "."));

// ── Main ─────────────────────────────────────────────────────────────────────

let totalFindings = 0;

for (const relPath of sourceFiles) {
  const absPath = join(root, relPath);
  if (!existsSync(absPath)) continue;
  const content = readFileSync(absPath, "utf-8");

  const findings = findRegexLiterals(content, relPath);
  for (const f of findings) {
    const prefix = f.severity === "error" ? "ERROR" : "WARN";
    console.error(`${prefix}: ${f.file}:${f.line} — ${f.issue}`);
    console.error(`  Pattern: ${f.pattern}`);
    if (f.severity === "error") totalFindings++;
  }
}

if (totalFindings > 0) {
  console.error(`\n${totalFindings} unsafe regex pattern(s) found.`);
  console.error("Add a '// regex-safe' comment on the same or preceding line to suppress false positives.");
  if (checkOnly) process.exit(1);
  process.exit(0);
}

console.log(`regex-safety: ${sourceFiles.length} files scanned, 0 unsafe patterns`);
