import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeReplayStats } from "../lib/costReplayStats";

const FIXTURE = readFileSync(join(__dirname, "fixtures", "replay-export.json"), "utf8");
const EXPORT = JSON.parse(FIXTURE);

describe("Cost replay — production savings from exported traffic", () => {
  it("parses the export envelope", () => {
    expect(EXPORT).toHaveProperty("entryCount");
    expect(Array.isArray(EXPORT.entries)).toBe(true);
    expect(EXPORT.entryCount).toBe(EXPORT.entries.length);
  });

  const stats = computeReplayStats(EXPORT);

  it("does not double-count entries or drop any", () => {
    expect(stats.entries).toBe(EXPORT.entries.length);
    expect(Object.keys(stats.byCategory).length).toBeGreaterThan(1);
  });

  it("positive savings when premium > estimated overall", () => {
    expect(stats.savings).toBeGreaterThan(0);
    expect(stats.savingsPercent).toBeGreaterThan(0);
  });

  it("stratifies by category and each category reports consistently", () => {
    for (const [cat, c] of Object.entries(stats.byCategory)) {
      expect(c.entries).toBeGreaterThan(0);
      expect(c.premium).toBeCloseTo(c.savings + c.estimated, 10);
      if (c.premium > 0) {
        expect(c.savingsPercent).toBeCloseTo((c.savings / c.premium) * 100, 6);
      }
    }
  });

  it("records rescue/truncation signals from the log", () => {
    const rescueTotal = Object.values(stats.byCategory).reduce((a, c) => a + c.rescues, 0);
    expect(stats.rescues).toBe(rescueTotal);
    expect(stats.truncated).toBeGreaterThanOrEqual(0);
  });
});

// Standalone report mirroring routingEval's afterAll benchmark printout.
// Uses console.log so the measured production-savings number is visible in CI
// output and can be copied into CLAIM_LEDGER.md.
describe("Cost replay — benchmark report", () => {
  it("prints pooled + per-category savings", () => {
    const stats = computeReplayStats(EXPORT);
    // eslint-disable-next-line no-console
    console.log("\n═══════════════════════════════════════════");
    // eslint-disable-next-line no-console
    console.log("  COST SAVINGS REPLAY — REAL TRAFFIC EXPORT");
    // eslint-disable-next-line no-console
    console.log("═══════════════════════════════════════════");
    // eslint-disable-next-line no-console
    console.log(`  Entries replayed:            ${stats.entries}`);
    // eslint-disable-next-line no-console
    console.log(`  Premium-always cost:         $${stats.premium.toFixed(6)}`);
    // eslint-disable-next-line no-console
    console.log(`  Estimated router cost:       $${stats.estimated.toFixed(6)}`);
    // eslint-disable-next-line no-console
    console.log(`  Pooled savings:              $${stats.savings.toFixed(6)} (${Math.round(stats.savingsPercent)}%)`);
    // eslint-disable-next-line no-console
    console.log(`  Rescue (fallback) count:     ${stats.rescues}`);
    // eslint-disable-next-line no-console
    console.log(`  Truncated count:             ${stats.truncated}`);
    // eslint-disable-next-line no-console
    console.log("  Per-category:");
    for (const [cat, c] of Object.entries(stats.byCategory)) {
      const sign = c.savingsPercent >= 0 ? "+" : "";
      // eslint-disable-next-line no-console
      console.log(`    ${cat.padEnd(12)} n=${String(c.entries).padStart(3)}  $${c.estimated.toFixed(5)} vs $${c.premium.toFixed(5)}  ${sign}${Math.round(c.savingsPercent)}%  rescues=${c.rescues}`);
    }
    // eslint-disable-next-line no-console
    console.log("═══════════════════════════════════════════\n");
  });
});
