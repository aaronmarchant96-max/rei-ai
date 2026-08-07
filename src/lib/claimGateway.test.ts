import { defineClaim, getClaims, getAllClaims, verifyAll, resetClaims } from "./claimGateway";

beforeEach(() => {
  resetClaims();
});

describe("claimGateway", () => {
  it("registers a claim and returns it", () => {
    const c = defineClaim({
      id: "test-claim",
      title: "Test",
      description: "desc",
      category: "dashboard",
      compute: () => 42,
      verify: (val) => val === 42 ? { pass: true, severity: "info", reason: "ok" } : { pass: false, severity: "error", reason: "wrong" },
    });
    expect(c.id).toBe("test-claim");
    expect(getAllClaims().length).toBe(1);
  });

  it("throws on duplicate id", () => {
    defineClaim({ id: "dup", title: "X", description: "x", category: "x", compute: () => 1, verify: () => ({ pass: true, severity: "info", reason: "" }) });
    expect(() => defineClaim({ id: "dup", title: "Y", description: "y", category: "y", compute: () => 2, verify: () => ({ pass: false, severity: "error", reason: "" }) })).toThrow(/already registered/);
  });

  it("verifyAll returns pass when claim passes", () => {
    defineClaim({ id: "passing", title: "P", description: "p", category: "test", compute: () => 100, verify: (v) => v === 100 ? { pass: true, severity: "info", reason: "matches" } : { pass: false, severity: "error", reason: "no" } });
    const results = verifyAll();
    expect(results[0].pass).toBe(true);
    expect(results[0].severity).toBe("info");
  });

  it("verifyAll returns fail with error severity when compute throws", () => {
    defineClaim({ id: "crasher", title: "C", description: "c", category: "test", compute: () => { throw new Error("boom"); }, verify: () => ({ pass: false, severity: "error", reason: "never reached" }) });
    const results = verifyAll();
    expect(results[0].pass).toBe(false);
    expect(results[0].severity).toBe("error");
    expect(results[0].reason).toContain("boom");
  });

  it("verifyAll returns error severity for NaN", () => {
    defineClaim({ id: "nan", title: "N", description: "n", category: "test", compute: () => NaN, verify: () => ({ pass: false, severity: "error", reason: "never reached" }) });
    const results = verifyAll();
    expect(results[0].pass).toBe(false);
    expect(results[0].severity).toBe("error");
    expect(results[0].computed).toBe(null);
  });

  it("verifyAll returns multiple results for multiple claims", () => {
    defineClaim({ id: "a", title: "A", description: "a", category: "x", compute: () => 1, verify: (v) => v === 1 ? { pass: true, severity: "info", reason: "y" } : { pass: false, severity: "error", reason: "n" } });
    defineClaim({ id: "b", title: "B", description: "b", category: "x", compute: () => 0, verify: (v) => v === 1 ? { pass: true, severity: "info", reason: "y" } : { pass: false, severity: "error", reason: "bad" } });
    const results = verifyAll();
    expect(results).toHaveLength(2);
    expect(results[0].pass).toBe(true);
    expect(results[1].pass).toBe(false);
  });

  it("verifyAll sets severity warn when claim returns warn", () => {
    defineClaim({ id: "warn", title: "W", description: "w", category: "test", compute: () => 85, verify: (v) => ({ pass: false, severity: "warn", reason: v < 90 ? "dropped below 90%" : "ok" }) });
    const results = verifyAll();
    expect(results[0].pass).toBe(false);
    expect(results[0].severity).toBe("warn");
  });
});
