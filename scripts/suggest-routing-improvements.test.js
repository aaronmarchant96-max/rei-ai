/**
 * Smoke test for the router improvement bootstrapper.
 * Verifies the script runs without errors and produces expected output markers.
 */
import { execSync } from "child_process";

describe("suggest-routing-improvements bootstrapper", () => {
  it("runs without error and outputs expected markers", () => {
    const output = execSync("node scripts/suggest-routing-improvements.js", { encoding: "utf-8", timeout: 30000 });
    expect(output).toContain("Accuracy:");
    expect(output).toContain("mismatches found");
    expect(output).toContain("Review these suggestions before applying");
  });
});
