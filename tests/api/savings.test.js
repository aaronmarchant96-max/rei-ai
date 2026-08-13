// Unit tests for the ROADMAP Phase 3 savings aggregation endpoint.
// Verifies dollar-savings math, day-series bucketing, and the honesty
// invariant: when KV is unavailable the endpoint reports empty-unavailable,
// never a fabricated "measured" number.

jest.mock("../../shared/lib/kv.js", function () {
  return {
    isKvAvailable: jest.fn(function () { return Promise.resolve(true); }),
    getTracesWithEvals: jest.fn(function () { return Promise.resolve({ traces: [], evals: [] }); }),
  };
});

const kv = require("../../shared/lib/kv.js");

function mockRes() {
  return {
    _status: null,
    _body: null,
    status(c) { this._status = c; return this; },
    json(d) { this._body = d; },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("/api/savings", () => {
  it("405 for non-GET", async () => {
    const handler = (await import("../../api/savings.js")).default;
    const req = { method: "POST", query: {} };
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it("400 when tenant/from/to missing", async () => {
    const handler = (await import("../../api/savings.js")).default;
    const req = { method: "GET", query: { tenant: "pilot" } };
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it("aggregates dollar savings and buckets the day series", async () => {
    kv.getTracesWithEvals.mockResolvedValueOnce({
      traces: [
        { timestamp: "2026-08-13T10:00:00Z", premiumCost: 0.0100, estimatedCost: 0.0020 },
        { timestamp: "2026-08-13T11:00:00Z", premiumCost: 0.0050, estimatedCost: 0.0005 },
        { timestamp: "2026-08-12T09:00:00Z", premiumCost: 0.0080, estimatedCost: 0.0030 },
      ],
      evals: [],
    });
    const handler = (await import("../../api/savings.js")).default;
    const req = { method: "GET", query: { tenant: "pilot", from: "2026-08-12", to: "2026-08-13" } };
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    // premium total = 0.023 ; savings = (0.010-0.002)+(0.005-0.0005)+(0.008-0.003) = 0.008+0.0045+0.005 = 0.0175
    expect(res._body.totalSaved).toBeCloseTo(0.0175, 6);
    expect(res._body.totalPremiumBaseline).toBeCloseTo(0.0230, 6);
    expect(res._body.requests).toBe(3);
    expect(res._body.avgSavingsPercent).toBeCloseTo((0.0175 / 0.0230) * 100, 6);
    expect(res._body.savingsMode).toBe("measured");
    expect(res._body.series).toHaveLength(2);
    expect(res._body.series[0].ts).toBe("2026-08-12");
    expect(res._body.series[0].saved).toBeCloseTo(0.005, 6);
    expect(res._body.series[1].ts).toBe("2026-08-13");
    expect(res._body.series[1].saved).toBeCloseTo(0.0125, 6);
  });

  it("skips traces that lack a measurable premium/estimated pair", async () => {
    kv.getTracesWithEvals.mockResolvedValueOnce({
      traces: [
        { timestamp: "2026-08-13T10:00:00Z", premiumCost: 0.0100, estimatedCost: 0.0020 },
        { timestamp: "2026-08-13T11:00:00Z", premiumCost: null, estimatedCost: 0.0005 },
        { timestamp: "2026-08-13T12:00:00Z", premiumCost: 0.0, estimatedCost: 0.0005 },
      ],
      evals: [],
    });
    const handler = (await import("../../api/savings.js")).default;
    const req = { method: "GET", query: { tenant: "pilot", from: "2026-08-13", to: "2026-08-13" } };
    const res = mockRes();
    await handler(req, res);
    expect(res._body.requests).toBe(1);
    expect(res._body.totalSaved).toBeCloseTo(0.008, 6);
  });

  it("reports empty-unavailable (NOT measured) when KV is unavailable", async () => {
    kv.isKvAvailable.mockResolvedValueOnce(false);
    const handler = (await import("../../api/savings.js")).default;
    const req = { method: "GET", query: { tenant: "pilot", from: "2026-08-12", to: "2026-08-13" } };
    const res = mockRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._body.savingsMode).toBe("empty-unavailable");
    expect(res._body.requests).toBe(0);
    // getTracesWithEvals must not even be called when KV is down.
    expect(kv.getTracesWithEvals).not.toHaveBeenCalled();
  });
});
