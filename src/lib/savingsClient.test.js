// Unit tests for src/lib/savingsClient.js — the frontend savings fetch wrapper.
// Verifies wire reshaping and the honesty invariant: failed/absent telemetry
// resolves to the empty-but-honest shape, never an invented "measured" number.

import { fetchSavings } from "./savingsClient";

const jsonRes = (data, ok = true, status = 200) =>
  Promise.resolve({ ok, status, json: () => Promise.resolve(data) });

describe("savingsClient", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("reshapes a measured payload", async () => {
    global.fetch.mockResolvedValueOnce(jsonRes({
      tenant: "pilot", from: "2026-08-13", to: "2026-08-13",
      requests: 5, totalSaved: 0.02, totalPremiumBaseline: 0.1,
      avgSavingsPercent: 20,
      cacheAggregates: {
        requestsWithUsage: 4, cacheHitTokens: 1350, cacheMissTokens: 150, measuredCacheHitRate: 90,
      },
      series: [{ ts: "2026-08-13", saved: 0.02, spend: 0.1, requests: 5 }],
      savingsMode: "measured",
    }));
    const out = await fetchSavings({ tenant: "pilot", from: new Date("2026-08-13"), to: new Date("2026-08-13") });
    expect(out.savingsMode).toBe("measured");
    expect(out.totalSaved).toBe(0.02);
    expect(out.avgSavingsPercent).toBe(20);
    expect(out.series).toHaveLength(1);
    expect(out.cacheAggregates.requestsWithUsage).toBe(4);
    expect(out.cacheAggregates.cacheHitTokens).toBe(1350);
    expect(out.cacheAggregates.cacheMissTokens).toBe(150);
    expect(out.cacheAggregates.measuredCacheHitRate).toBe(90);
  });

  it("zeros cache aggregates when measuredCacheHitRate is absent", async () => {
    global.fetch.mockResolvedValueOnce(jsonRes({
      tenant: "pilot", from: "2026-08-13", to: "2026-08-13",
      requests: 5, totalSaved: 0.02, totalPremiumBaseline: 0.1,
      avgSavingsPercent: 20,
      cacheAggregates: { requestsWithUsage: 0, cacheHitTokens: 0, cacheMissTokens: 0, measuredCacheHitRate: null },
      series: [],
      savingsMode: "measured",
    }));
    const out = await fetchSavings();
    expect(out.savingsMode).toBe("measured");
    expect(out.cacheAggregates.measuredCacheHitRate).toBeNull();
    expect(out.cacheAggregates.cacheHitTokens).toBe(0);
  });

  it("keeps cache aggregates null/zero when the mode is not measured", async () => {
    global.fetch.mockResolvedValueOnce(jsonRes({ savingsMode: "bogus", totalSaved: 999, cacheAggregates: { measuredCacheHitRate: 90, cacheHitTokens: 999 } }));
    const out = await fetchSavings();
    expect(out.savingsMode).toBe("empty-unavailable");
    expect(out.totalSaved).toBe(0);
    expect(out.cacheAggregates.measuredCacheHitRate).toBeNull();
    expect(out.cacheAggregates.cacheHitTokens).toBe(0);
  });

  it("returns the empty-but-honest shape on HTTP failure (no fabricated number)", async () => {
    global.fetch.mockResolvedValueOnce(jsonRes({}, false, 500));
    const out = await fetchSavings();
    expect(out.savingsMode).toBe("empty-unavailable");
    expect(out.requests).toBe(0);
    expect(out.totalSaved).toBe(0);
    expect(out.series).toEqual([]);
    expect(out.cacheAggregates.measuredCacheHitRate).toBeNull();
    expect(out.cacheAggregates.cacheHitTokens).toBe(0);
  });

  it("defaults to a 30-day window when no range is given", async () => {
    const calls = [];
    global.fetch.mockImplementation((url) => { calls.push(String(url)); return jsonRes({ savingsMode: "measured" }); });
    await fetchSavings();
    expect(calls).toHaveLength(1);
    const qs = new URLSearchParams(calls[0].split("?")[1]);
    expect(qs.get("tenant")).toBe("pilot");
    expect(qs.get("from")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(qs.get("to")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
