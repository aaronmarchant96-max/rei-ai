/**
 * validate-docs.mjs — Documentation Lifecycle, Link Integrity & Epistemic Authority Validator
 *
 * Enforces:
 *   1. Canonical document presence and unique authority scopes
 *   2. Valid frontmatter on canonical and historical documents
 *   3. Zero broken relative markdown links
 *   4. Zero duplicated repository-owner URLs
 *   5. Valid superseded_by targets for archived documents
 *   6. Single active handoff invariant
 *   7. Archive warning banners on historical/archived files
 *
 * Usage: node scripts/validate-docs.mjs [--strict]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const CANONICAL_DOCS = [
  { relPath: "README.md", expectedScope: "public-entrypoint-and-headlines" },
  { relPath: "docs/PORTFOLIO_OVERVIEW.md", expectedScope: "builder-story-and-case-studies" },
  { relPath: "docs/ARCHITECTURE.md", expectedScope: "implemented-system-behavior" },
  { relPath: "docs/CLAIM_LEDGER.md", expectedScope: "empirical-claims" },
  { relPath: "docs/TESTING.md", expectedScope: "evaluation-and-test-taxonomy" },
  { relPath: "docs/COMMERCIAL_PILOT_SPEC.md", expectedScope: "commercial-deployment-and-pilot-gates" }
];

const ALLOWED_STATUSES = new Set(["canonical", "active", "proposal", "historical", "archived"]);

function parseFrontmatter(content) {
  if (!content.startsWith("---")) return null;
  const endIdx = content.indexOf("\n---", 3);
  if (endIdx === -1) return null;
  const raw = content.slice(3, endIdx).trim();
  const meta = {};
  for (const line of raw.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();
    if (val === "null") val = null;
    else if (val.startsWith("[") && val.endsWith("]")) {
      val = val.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
    }
    meta[key] = val;
  }
  return { meta, body: content.slice(endIdx + 4).trim() };
}

function walkMarkdownFiles(dir) {
  let results = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name === "node_modules" || item.name === ".git" || item.name === "dist" || item.name === ".artifacts") continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) results = results.concat(walkMarkdownFiles(full));
    else if (item.isFile() && item.name.endsWith(".md")) results.push(full);
  }
  return results;
}

function runValidation() {
  const errors = [];
  const warnings = [];
  const allMdFiles = walkMarkdownFiles(repoRoot);

  // 1. Verify Canonical Documents
  const seenScopes = new Set();
  for (const canonical of CANONICAL_DOCS) {
    const fullPath = path.join(repoRoot, canonical.relPath);
    if (!fs.existsSync(fullPath)) {
      errors.push(`Missing canonical document: ${canonical.relPath}`);
      continue;
    }
    const content = fs.readFileSync(fullPath, "utf8");
    const parsed = parseFrontmatter(content);
    if (!parsed) {
      errors.push(`Canonical document missing frontmatter: ${canonical.relPath}`);
      continue;
    }
    if (parsed.meta.status !== "canonical") {
      errors.push(`Canonical document ${canonical.relPath} has status '${parsed.meta.status}', expected 'canonical'`);
    }
    if (parsed.meta.authority_scope !== canonical.expectedScope) {
      errors.push(`Canonical document ${canonical.relPath} has authority_scope '${parsed.meta.authority_scope}', expected '${canonical.expectedScope}'`);
    }
    if (seenScopes.has(parsed.meta.authority_scope)) {
      errors.push(`Duplicate authority_scope '${parsed.meta.authority_scope}' in canonical docs`);
    }
    seenScopes.add(parsed.meta.authority_scope);
  }

  // 2. Scan all Markdown files for link integrity, duplicated URLs, frontmatter validity, and banners
  let activeHandoffs = 0;

  for (const file of allMdFiles) {
    const relPath = path.relative(repoRoot, file);
    const content = fs.readFileSync(file, "utf8");
    const parsed = parseFrontmatter(content);

    // Duplicated URL check
    if (content.includes("aaronmarchant96-max/aaronmarchant96-max")) {
      errors.push(`Duplicated repository path found in: ${relPath}`);
    }

    // Frontmatter checks if present
    if (parsed) {
      const { meta } = parsed;
      if (meta.status && !ALLOWED_STATUSES.has(meta.status)) {
        errors.push(`Invalid status '${meta.status}' in ${relPath}`);
      }
      if (meta.superseded_by) {
        const targetRel = path.resolve(path.dirname(file), meta.superseded_by);
        const targetRoot = path.resolve(repoRoot, meta.superseded_by);
        if (!fs.existsSync(targetRel) && !fs.existsSync(targetRoot)) {
          errors.push(`Invalid superseded_by target '${meta.superseded_by}' in ${relPath}`);
        }
      }
      if (meta.status === "historical" || meta.status === "archived") {
        if (!content.includes("HISTORICAL DOCUMENT") && !content.includes("SUPERSEDED") && !content.includes("POINT-IN-TIME")) {
          errors.push(`Historical/archived document missing warning banner: ${relPath}`);
        }
      }
    }

    // Handoff check
    if (relPath.toLowerCase().includes("handoff")) {
      if (!parsed || (parsed.meta.status !== "historical" && parsed.meta.status !== "archived")) {
        activeHandoffs++;
      }
    }

    // Link integrity check
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const rawTarget = match[2].trim();
      if (
        rawTarget.startsWith("http://") ||
        rawTarget.startsWith("https://") ||
        rawTarget.startsWith("mailto:") ||
        rawTarget.startsWith("#") ||
        rawTarget.startsWith("conversation://") ||
        rawTarget.startsWith("<")
      ) {
        continue;
      }
      const cleanTarget = rawTarget.split("#")[0];
      if (!cleanTarget) continue;

      const resolved = path.resolve(path.dirname(file), cleanTarget);
      if (!fs.existsSync(resolved)) {
        errors.push(`Broken link in ${relPath}: [${match[1]}](${rawTarget}) -> ${cleanTarget}`);
      }
    }
  }

  if (activeHandoffs > 1) {
    errors.push(`Found ${activeHandoffs} active handoff documents. Only 1 active handoff allowed.`);
  }

  // ---------------------------------------------------------------------------
  // Check 8: Live Claims Drift Invariant
  // Reads claims.json and verifies target live-claim files do not drift.
  // Exempts historical dated snapshots.
  // ---------------------------------------------------------------------------
  const claimsPath = path.join(repoRoot, "src", "data", "claims.json");
  if (fs.existsSync(claimsPath)) {
    try {
      const claims = JSON.parse(fs.readFileSync(claimsPath, "utf8"));
      const expectedTests = claims.testCount;
      const expectedSuites = claims.suiteCount;

      const liveClaimTargets = [
        "README.md",
        "docs/GITHUB_PROFILE_README.md",
        "docs/CLAIM_LEDGER.md",
        "docs/PORTFOLIO_OVERVIEW.md"
      ];

      for (const relPath of liveClaimTargets) {
        const fullPath = path.join(repoRoot, relPath);
        if (!fs.existsSync(fullPath)) continue;
        const content = fs.readFileSync(fullPath, "utf8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes("Latest verified full-suite result") || line.includes("historical") || line.includes("Historical") || line.includes("Point-in-time") || line.includes("point-in-time")) continue;

          const testMatch = line.match(/\b(\d{1,3}(?:,\d{3})+|\d{4,})\s+(?:passing\s+)?(?:automated\s+)?tests\b/i);
          if (testMatch) {
            const foundCount = parseInt(testMatch[1].replace(/,/g, ""), 10);
            if (foundCount !== expectedTests) {
              errors.push(`Claim drift in ${relPath}:${i+1}: found ${foundCount} tests, claims.json has ${expectedTests}. Run 'node scripts/gen-claims.mjs'.`);
            }
          }

          const suiteMatch = line.match(/\b(\d{2,3})\s+(?:test\s+)?suites\b/i);
          if (suiteMatch) {
            const foundSuites = parseInt(suiteMatch[1], 10);
            if (foundSuites !== expectedSuites) {
              errors.push(`Claim drift in ${relPath}:${i+1}: found ${foundSuites} suites, claims.json has ${expectedSuites}. Run 'node scripts/gen-claims.mjs'.`);
            }
          }
        }
      }
    } catch (err) {
      warnings.push(`Could not check claims drift: ${err.message}`);
    }
  }

  return { errors, warnings, scannedCount: allMdFiles.length };
}

const result = runValidation();

console.log(`Validated ${result.scannedCount} markdown files.`);
if (result.warnings.length) {
  console.log(`\nWarnings (${result.warnings.length}):`);
  for (const w of result.warnings) console.log(`  ⚠ ${w}`);
}

if (result.errors.length) {
  console.error(`\nDocumentation Validation Failed with ${result.errors.length} error(s):`);
  for (const err of result.errors) console.error(`  ✖ ${err}`);
  process.exit(1);
}

console.log("✅ All documentation lifecycle, link integrity, and authority invariants passed.");
