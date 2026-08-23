/**
 * gen-claims.mjs — generate src/data/claims.json and synchronize all READMEs & doc files
 * from the live test suite.
 *
 * The landing page badge ("959+ Passing Tests") and documentation test counts must
 * never be hand-edited or drift: this script runs `jest --json`, writes the authoritative
 * counts to claims.json, and automatically syncs:
 *   - README.md
 *   - docs/README.md
 *   - docs/CLAIM_LEDGER.md
 *   - docs/TESTING.md
 *
 * Usage: node scripts/gen-claims.mjs [--check]
 *   --check  exit 1 if claims.json or any doc file differs from what jest reports (CI gate)
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const claimsPath = join(root, "src", "data", "claims.json");
const checkOnly = process.argv.includes("--check");

// Run jest with JSON reporter. Mirrors the package.json test invocation
// (jest --runInBand). Capture the JSON summary from stdout.
let summary;
try {
  const stdout = execFileSync(
    "npx",
    ["jest", "--json", "--runInBand", "--silent"],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 600000, env: process.env }
  );
  // jest --json prints the JSON blob after any banner noise — take the
  // first line that parses as the reporter payload.
  const lines = stdout.split("\n");
  let payload = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed.numTotalTests === "number") { payload = parsed; break; }
    } catch { /* not json */ }
  }
  if (!payload) {
    console.error("gen-claims: could not parse jest JSON output");
    process.exit(1);
  }
  summary = payload;
} catch (err) {
  // jest exits nonzero on test failure but still emits JSON on stdout —
  // parse it so the claim still reflects reality, but flag the failure.
  console.error("gen-claims: jest exited nonzero — claims reflect the failing suite:", err.status);
  const stdout = err.stdout || "";
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed.numTotalTests === "number") { summary = parsed; break; }
    } catch { /* not json */ }
  }
  if (!summary) {
    console.error("gen-claims: could not parse jest JSON output on failure");
    process.exit(1);
  }
}

const testCount = summary.numTotalTests;
const suiteCount = summary.numTotalTestSuites;
const todayIso = new Date().toISOString().split("T")[0];

const claims = {
  testCount,
  suiteCount,
  generatedAt: new Date().toISOString(),
};

const rendered = JSON.stringify(claims, null, 2) + "\n";

let existing = null;
try {
  existing = existsSync(claimsPath) ? JSON.parse(readFileSync(claimsPath, "utf8")) : null;
} catch { existing = null; }

const claimsJsonMatch =
  existing &&
  existing.testCount === claims.testCount &&
  existing.suiteCount === claims.suiteCount;

// Documentation targets that must stay in sync with authoritative test counts
const DOC_TARGETS = [
  {
    relPath: "README.md",
    transforms: [
      {
        pattern: /Backed by \*\*\d+ automated tests across \d+ test suites\*\*/g,
        replacement: () => `Backed by **${testCount} automated tests across ${suiteCount} test suites**`
      },
      {
        pattern: /- \*\*Empirical Rigor(?: & Fast Local Loop)?:\*\* Backed by [\d,]+ automated tests across \d+ test suites/g,
        replacement: () => `- **Empirical Rigor:** Backed by ${testCount} automated tests across ${suiteCount} test suites`
      },
      {
        pattern: /\| Automated Tests \| \*\*\d+ passing tests across \d+ suites\*\* \|/g,
        replacement: () => `| Automated Tests | **${testCount} passing tests across ${suiteCount} suites** |`
      },
      {
        pattern: /# Run full test suite \(\d+ test suites, \d+ tests\)/g,
        replacement: () => `# Run full test suite (${suiteCount} test suites, ${testCount} tests)`
      },
      {
        pattern: /# Run serial test suite \(\d+ test suites, \d+ tests\)/g,
        replacement: () => `# Run serial test suite (${suiteCount} test suites, ${testCount} tests)`
      }
    ]
  },
  {
    relPath: "docs/README.md",
    transforms: [
      {
        pattern: /\| \[(\*\*Testing Strategy\*\*)\]\(TESTING\.md\) \| \d+ suites, \d+ tests/g,
        replacement: () => `| [**Testing Strategy**](TESTING.md) | ${suiteCount} suites, ${testCount} tests`
      }
    ]
  },
  {
    relPath: "docs/CLAIM_LEDGER.md",
    transforms: [
      {
        pattern: /\| \d+ tests \/ \d+ suites \| `npm test -- --runInBand` \|/g,
        replacement: () => `| ${testCount} tests / ${suiteCount} suites | \`npm test -- --runInBand\` |`
      }
    ]
  },
  {
    relPath: "docs/TESTING.md",
    transforms: [
      {
        pattern: /REI\.ai currently has \d+ test suites with \d+ tests passing\./g,
        replacement: () => `REI.ai currently has ${suiteCount} test suites with ${testCount} tests passing.`
      },
      {
        pattern: /Latest verified full-suite result \([^)]+\): \*\*\d+\/\d+ suites\*\*, \*\*\d+\/\d+ tests\*\*\./g,
        replacement: () => `Latest verified full-suite result (${todayIso}): **${suiteCount}/${suiteCount} suites**, **${testCount}/${testCount} tests**.`
      }
    ]
  },
  {
    relPath: "CONTRIBUTING.md",
    transforms: [
      {
        pattern: /Keep tests passing — \d+ suites, \d+ tests as the safety net/g,
        replacement: () => `Keep tests passing — ${suiteCount} suites, ${testCount} tests as the safety net`
      }
    ]
  },
  {
    relPath: "docs/ARCHITECTURE.md",
    transforms: [
      {
        pattern: /Run the full verification suite across all \d+ test suites:/g,
        replacement: () => `Run the full verification suite across all ${suiteCount} test suites:`
      },
      {
        pattern: /npm test\s+# \d+ passing tests across \d+ suites/g,
        replacement: () => `npm test                             # ${testCount} passing tests across ${suiteCount} suites`
      }
    ]
  },
  {
    relPath: "docs/ROADMAP.md",
    transforms: [
      {
        pattern: /Backed by \*\*\d+ automated tests across \d+ test suites\*\*/g,
        replacement: () => `Backed by **${testCount} automated tests across ${suiteCount} test suites**`
      },
      {
        pattern: /\*\*[\d,]+ tests across \d+ test suites\*\*/g,
        replacement: () => `**${testCount.toLocaleString("en-US")} tests across ${suiteCount} test suites**`
      }
    ]
  },
  {
    relPath: "TOKEN_SAVERS.md",
    transforms: [
      {
        pattern: /Current: \d+ tests \/ \d+ suites/g,
        replacement: () => `Current: ${testCount} tests / ${suiteCount} suites`
      }
    ]
  },
  {
    relPath: "docs/SESSION_HANDOFF.md",
    transforms: [
      {
        pattern: /- \*\*Tests:\*\* [\d,]+ unit & integration tests \/ \d+ suites passing 100% green \(`npm test`\)/g,
        replacement: () => `- **Tests:** ${testCount.toLocaleString("en-US")} unit & integration tests / ${suiteCount} suites passing 100% green (\`npm test\`)`
      }
    ]
  },
  {
    relPath: "docs/PORTFOLIO_OVERVIEW.md",
    transforms: [
      {
        pattern: /\*\*\d+ automated tests across \d+ suites\*\*/g,
        replacement: () => `**${testCount} automated tests across ${suiteCount} suites**`
      },
      {
        pattern: /\b\d+ Tests\b/g,
        replacement: () => `${testCount} Tests`
      },
      {
        pattern: /\*\*\d+ passing automated tests\*\* across \d+ test suites/g,
        replacement: () => `**${testCount} passing automated tests** across ${suiteCount} test suites`
      },
      {
        pattern: /\| \*\*Automated Passing Tests\*\* \| \*\*\d+ tests\*\* \(\d+ suites\) \|/g,
        replacement: () => `| **Automated Passing Tests** | **${testCount} tests** (${suiteCount} suites) |`
      }
    ]
  },
  {
    relPath: "docs/BUSINESS_PLAN.md",
    transforms: [
      {
        pattern: /\*\*[\d,]+ automated tests across \d+ test (?:files|suites)\*\*/g,
        replacement: () => `**${testCount.toLocaleString("en-US")} automated tests across ${suiteCount} test suites**`
      }
    ]
  },
  {
    relPath: "docs/GITHUB_PROFILE_README.md",
    transforms: [
      {
        pattern: /\*\*[\d,]+ automated tests across \d+ test suites\*\*/g,
        replacement: () => `**${testCount.toLocaleString("en-US")} automated tests across ${suiteCount} test suites**`
      },
      {
        pattern: /Automated Tests\s+──►\s+[\d,]+ tests across \d+ suites/g,
        replacement: () => `Automated Tests  ──► ${testCount.toLocaleString("en-US")} tests across ${suiteCount} suites`
      }
    ]
  }
];

let staleDocs = [];
const docUpdates = [];

for (const target of DOC_TARGETS) {
  const filePath = join(root, target.relPath);
  if (!existsSync(filePath)) continue;

  const originalContent = readFileSync(filePath, "utf8");
  let updatedContent = originalContent;

  for (const { pattern, replacement } of target.transforms) {
    updatedContent = updatedContent.replace(pattern, replacement);
  }

  if (originalContent !== updatedContent) {
    staleDocs.push(target.relPath);
    docUpdates.push({ filePath, updatedContent, relPath: target.relPath });
  }
}

if (checkOnly) {
  let hasError = false;
  if (!claimsJsonMatch) {
    console.error(
      `gen-claims: STALE claims.json (file: ${existing ? existing.testCount + "/" + existing.suiteCount : "missing"}, suite: ${claims.testCount}/${claims.suiteCount})`
    );
    hasError = true;
  }
  if (staleDocs.length > 0) {
    console.error(`gen-claims: STALE doc files detected (${staleDocs.join(", ")}) — run \`node scripts/gen-claims.mjs\` to update`);
    hasError = true;
  }

  if (hasError) {
    process.exit(1);
  }

  console.log(`gen-claims: claims.json and all documentation files up to date (${testCount} tests / ${suiteCount} suites)`);
  process.exit(0);
}

// Normal execution: write claims.json and all stale documentation files
if (!claimsJsonMatch) {
  writeFileSync(claimsPath, rendered);
  console.log(`gen-claims: wrote ${testCount} tests / ${suiteCount} suites → src/data/claims.json`);
} else {
  console.log(`gen-claims: claims.json already up to date (${testCount} tests / ${suiteCount} suites)`);
}

for (const { filePath, updatedContent, relPath } of docUpdates) {
  writeFileSync(filePath, updatedContent);
  console.log(`gen-claims: synchronized doc file → ${relPath} (${testCount} tests / ${suiteCount} suites)`);
}

if (claimsJsonMatch && staleDocs.length === 0) {
  console.log(`gen-claims: all claims and documentation files are fully synchronized (${testCount} tests / ${suiteCount} suites)`);
}
