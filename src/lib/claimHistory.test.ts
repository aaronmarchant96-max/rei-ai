import { appendClaimHistory, getClaimHistory, clearClaimHistory } from "./claimHistory";

describe("claimHistory", () => {
  beforeEach(() => {
    clearClaimHistory();
  });

  it("appends and retrieves a point", () => {
    appendClaimHistory({ claimId: "a", value: 90, severity: "info", ts: 1 });
    const all = getClaimHistory();
    expect(all).toHaveLength(1);
    expect(all[0].claimId).toBe("a");
    expect(all[0].value).toBe(90);
    expect(all[0].severity).toBe("info");
  });

  it("filters by claim id", () => {
    appendClaimHistory({ claimId: "a", value: 90, severity: "info", ts: 1 });
    appendClaimHistory({ claimId: "b", value: 10, severity: "error", ts: 2 });
    const a = getClaimHistory("a");
    expect(a).toHaveLength(1);
    expect(a[0].claimId).toBe("a");
    expect(getClaimHistory("b")[0].value).toBe(10);
  });

  it("caps history at MAX_PER_CLAIM per claim", () => {
    for (let i = 0; i < 60; i++) {
      appendClaimHistory({ claimId: "a", value: i, severity: "info", ts: i });
    }
    const a = getClaimHistory("a");
    expect(a).toHaveLength(50);
    expect(a[0].value).toBe(10);
    expect(a[a.length - 1].value).toBe(59);
  });

  it("does not drop other claims when trimming", () => {
    appendClaimHistory({ claimId: "keep", value: 1, severity: "info", ts: 1 });
    for (let i = 0; i < 60; i++) {
      appendClaimHistory({ claimId: "churn", value: i, severity: "info", ts: i });
    }
    expect(getClaimHistory("keep")).toHaveLength(1);
    expect(getClaimHistory("churn")).toHaveLength(50);
  });
});
