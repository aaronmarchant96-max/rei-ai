import { buildSelfAuditContext } from "./selfAuditContext";
import { defineClaim, resetClaims } from "./claimGateway";

describe("buildSelfAuditContext", () => {
  beforeEach(() => {
    resetClaims();
  });

  it("emits a visible UNAVAILABLE line when no claims are registered", () => {
    const block = buildSelfAuditContext();
    expect(block).toContain("no claims registered");
    expect(block).toContain("[UNAVAILABLE]");
  });

  it("renders a PASS claim with computed value", () => {
    defineClaim({
      id: "c-pass",
      title: "deepseek-v4-flash success rate ≥ 80%",
      description: "d",
      category: "dashboard",
      compute: () => 92,
      verify: () => ({ pass: true, severity: "info", reason: "within threshold" }),
    });
    const block = buildSelfAuditContext();
    expect(block).toContain("[PASS] deepseek-v4-flash success rate ≥ 80%: 92 (within threshold)");
  });

  it("renders a WARN claim", () => {
    defineClaim({
      id: "c-warn",
      title: "some warn claim",
      description: "d",
      category: "dashboard",
      compute: () => 75,
      verify: (v) => v !== null && v < 80
        ? { pass: false, severity: "warn", reason: "below threshold" }
        : { pass: true, severity: "info", reason: "ok" },
    });
    const block = buildSelfAuditContext();
    expect(block).toContain("[WARN] some warn claim: 75 (below threshold)");
  });

  it("renders a real FAIL when a computed value is below threshold", () => {
    defineClaim({
      id: "c-fail",
      title: "savings claim",
      description: "d",
      category: "dashboard",
      compute: () => 40,
      verify: (v) => v !== null && v < 80
        ? { pass: false, severity: "error", reason: "collapsed below 80%" }
        : { pass: true, severity: "info", reason: "ok" },
    });
    const block = buildSelfAuditContext();
    expect(block).toContain("[FAIL] savings claim: 40 (collapsed below 80%)");
  });

  it("renders UNAVAILABLE (not FAIL) when compute throws, surfacing the reason", () => {
    defineClaim({
      id: "c-throw",
      title: "flaky claim",
      description: "d",
      category: "dashboard",
      compute: () => {
        throw new Error("boom");
      },
      verify: () => ({ pass: true, severity: "info", reason: "unused" }),
    });
    const block = buildSelfAuditContext();
    expect(block).toContain("[UNAVAILABLE] flaky claim:");
    expect(block).toContain("compute threw:");
    expect(block).not.toContain("[FAIL] flaky claim:");
  });

  it("renders UNAVAILABLE (not FAIL) when compute returns non-finite", () => {
    defineClaim({
      id: "c-nan",
      title: "corrupt claim",
      description: "d",
      category: "dashboard",
      compute: () => NaN,
      verify: () => ({ pass: true, severity: "info", reason: "unused" }),
    });
    const block = buildSelfAuditContext();
    expect(block).toContain("[UNAVAILABLE] corrupt claim:");
    expect(block).toContain("NaN or Infinity");
    expect(block).not.toContain("[FAIL] corrupt claim:");
  });

  it("renders multiple claims in one block in registration order", () => {
    defineClaim({
      id: "c-a",
      title: "first claim",
      description: "d",
      category: "dashboard",
      compute: () => 100,
      verify: () => ({ pass: true, severity: "info", reason: "ok" }),
    });
    defineClaim({
      id: "c-b",
      title: "second claim",
      description: "d",
      category: "dashboard",
      compute: () => 10,
      verify: (v) => v !== null && v < 20
        ? { pass: false, severity: "error", reason: "bad" }
        : { pass: true, severity: "info", reason: "ok" },
    });
    const block = buildSelfAuditContext();
    const first = block.indexOf("[PASS] first claim");
    const second = block.indexOf("[FAIL] second claim");
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
    expect(block).toContain("Self-Audit (from our own claims gate");
  });
});
