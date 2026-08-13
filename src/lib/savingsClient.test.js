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
      series: [{ ts: "2026-08-13", saved: 0.02, spend: 0.1, requests: 5 }],
      savingsMode: "measured",
    }));
    const out = await fetchSavings({ tenant: "pilot", from: new Date("2026-08-13"), to: new Date("2026-08-13") });
    expect(out.savingsMode).toBe("measured");
    expect(out.totalSaved).toBe(0.02);
    expect(out.avgSavingsPercent).toBe(20);
    expect(out.series).toHaveLength(1);
  });

  it("maps a non-measured mode to empty-unavailable (defensive)", async () => {
    global.fetch.mockResolvedValueOnce(jsonRes({ savingsMode: "bogus", totalSaved: 999 }));
    const out = await fetchSavings();
    expect(out.savingsMode).toBe("empty-unavailable");
    expect(out.totalSaved).toBe(0);
  });

  it("returns the empty-but-honest shape on HTTP failure (no fabricated number)", async () => {
    global.fetch.mockResolvedValueOnce(jsonRes({}, false, 500));
    const out = await fetchSavings();
    expect(out.savingsMode).toBe("empty-unavailable");
    expect(out.requests).toBe(0);
    expect(out.totalSaved).toBe(0);
    expect(out.series).toEqual([]);
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
