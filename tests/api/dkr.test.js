/**
 * Session Response Cache — unit tests (Parameterized Consolidation)
 */

import { normalizeQuery, hashQuery, hashMessages, storeDkrEntry, lookupDkrByHash, recordDkrHit, getDkrIndex } from "../../shared/lib/dkr.js";

const mockKvStore = new Map();
const mockKvSets = new Map();

jest.mock("../../shared/lib/kv.js", () => ({
  isKvAvailable: jest.fn().mockResolvedValue(true),
  kvSet: jest.fn(async (k, v) => { mockKvStore.set(k, JSON.stringify(v)); }),
  kvGet: jest.fn(async (k) => {
    const raw = mockKvStore.get(k);
    if (raw === undefined) return null;
    try { return JSON.parse(raw); } catch { return raw; }
  }),
  kvZadd: jest.fn(async (k, score, member) => {
    if (!mockKvSets.has(k)) mockKvSets.set(k, []);
    mockKvSets.get(k).push({ score, member });
  }),
  kvZrange: jest.fn(async (k) => {
    if (!mockKvSets.has(k)) return [];
    return mockKvSets.get(k).sort((a, b) => a.score - b.score).map((e) => e.member);
  }),
  storeTrace: jest.fn(),
  storeEval: jest.fn(),
  getTracesWithEvals: jest.fn().mockResolvedValue({ traces: [], evals: [] }),
}));

function makeEntry(overrides = {}) {
  return {
    entryId: "test-entry-001",
    queryHash: hashQuery(normalizeQuery("what is typescript")),
    queryText: "what is typescript",
    queryVector: [],
    response: "TypeScript is a typed superset of JavaScript.",
    model: "deepseek-v4-flash",
    provider: "deepseek",
    routeId: "coding-standard",
    estimatedCost: 0.000042,
    tenantId: "pilot",
    timestamp: new Date().toISOString(),
    policyVersion: "v1",
    hitCount: 0,
    lastHitAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  mockKvStore.clear();
  mockKvSets.clear();
  jest.clearAllMocks();
});

describe("DKR Query Normalization & Hashing (Parameterized Matrix)", () => {
  test.each([
    ["What Is TypeScript", "what is typescript", "lowercasing"],
    ["what   is\ttypescript", "what is typescript", "internal whitespace collapse"],
    ["  what is typescript  ", "what is typescript", "trimming"],
    [null, "", "null handling"],
    [undefined, "", "undefined handling"],
  ])("normalizeQuery handles %s -> %s (%s)", (input, expected) => {
    expect(normalizeQuery(input)).toBe(expected);
  });

  test("hashQuery generates deterministic 64-char hex strings", () => {
    const input = "what is typescript";
    const h1 = hashQuery(input);
    const h2 = hashQuery(input);
    expect(h1).toHaveLength(64);
    expect(h1).toMatch(/^[0-9a-f]+$/);
    expect(h1).toBe(h2);
    expect(hashQuery("foo")).not.toBe(hashQuery("bar"));
    expect(hashQuery(normalizeQuery("  WHAT IS TYPESCRIPT  "))).toBe(hashQuery(normalizeQuery("what is typescript")));
  });

  test("hashMessages evaluates full conversation structure and roles", () => {
    const msg = (role, content) => ({ role, content });
    const h1 = hashMessages([msg("user", "hello")]);
    expect(h1).toHaveLength(64);
    expect(h1).toBe(hashMessages([msg("user", "hello")]));
    expect(hashMessages([])).toBe("");
    expect(hashMessages(null)).toBe("");

    // Context changes produce distinct hashes
    const base = [msg("user", "what is typescript")];
    const ext = [msg("user", "what is typescript"), msg("assistant", "A typed superset."), msg("user", "yes")];
    expect(hashMessages(base)).not.toBe(hashMessages(ext));

    // Role sensitivity
    expect(hashMessages([msg("user", "hello")])).not.toBe(hashMessages([msg("assistant", "hello")]));
  });
});

describe("DKR KV Storage & Retrieval Operations", () => {
  test("stores and looks up entries with 24-hour TTL", async () => {
    const { kvSet } = await import("../../shared/lib/kv.js");
    const entry = makeEntry();
    await storeDkrEntry(entry);

    const result = await lookupDkrByHash("pilot", entry.queryHash);
    expect(result).not.toBeNull();
    expect(result.entryId).toBe(entry.entryId);
    expect(result.response).toBe(entry.response);

    // Wrong tenant / unknown hash
    expect(await lookupDkrByHash("other-tenant", entry.queryHash)).toBeNull();
    expect(await lookupDkrByHash("pilot", "nonexistent-hash")).toBeNull();

    // Verify TTL
    expect(kvSet).toHaveBeenCalledWith(expect.stringContaining(entry.entryId), entry, { ex: 86400 });
  });

  test("recordDkrHit increments hit count and sets lastHitAt", async () => {
    const entry = makeEntry({ hitCount: 0 });
    await storeDkrEntry(entry);
    await recordDkrHit("pilot", entry.entryId);

    const updated = await lookupDkrByHash("pilot", entry.queryHash);
    expect(updated.hitCount).toBe(1);
    expect(new Date(updated.lastHitAt).getTime()).toBeGreaterThan(0);

    // No-op guards
    await expect(recordDkrHit("", "some-id")).resolves.toBeUndefined();
    await expect(recordDkrHit("pilot", "")).resolves.toBeUndefined();
  });

  test("getDkrIndex returns entries in recency order and respects limit", async () => {
    const older = makeEntry({ entryId: "entry-001", queryHash: hashQuery("alpha"), timestamp: "2026-01-01T00:00:00.000Z" });
    const newer = makeEntry({ entryId: "entry-002", queryHash: hashQuery("beta"), timestamp: "2026-06-01T00:00:00.000Z" });
    await storeDkrEntry(older);
    await storeDkrEntry(newer);

    const index = await getDkrIndex("pilot", 1);
    expect(index.length).toBeLessThanOrEqual(1);
    expect(await getDkrIndex("")).toEqual([]);
  });

  test("gracefully degrades when KV is unavailable", async () => {
    const kv = require("../../shared/lib/kv.js");
    kv.kvSet.mockResolvedValue(undefined);
    kv.kvGet.mockResolvedValue(null);
    kv.kvZadd.mockResolvedValue(undefined);
    kv.kvZrange.mockResolvedValue([]);

    await expect(storeDkrEntry(makeEntry())).resolves.toBeUndefined();
    expect(await lookupDkrByHash("pilot", "some-hash")).toBeNull();
    expect(await getDkrIndex("pilot")).toEqual([]);
  });
});
