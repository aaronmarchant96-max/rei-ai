/**
 * Session Response Cache — unit tests
 *
 * Tests cover:
 *   - normalizeQuery determinism
 *   - hashQuery determinism (single-string path)
 *   - hashMessages determinism (full messages array path, used by completions.js)
 *   - storeDkrEntry + lookupDkrByHash round-trip
 *   - recordDkrHit increment
 *   - getDkrIndex ordering
 *   - Graceful degrade when KV is unavailable
 */

import { normalizeQuery, hashQuery, hashMessages, storeDkrEntry, lookupDkrByHash, recordDkrHit, getDkrIndex } from "../../shared/lib/dkr.js";

// ── Mock KV layer ─────────────────────────────────────────────────────────────
// Isolates DKR tests from real Vercel KV / network calls.
//
// Variables in jest.mock() factories must be prefixed with "mock" (case-insensitive)
// to be allowed to reference outer scope. See Jest docs on mock hoisting.

const mockKvStore = new Map();
const mockKvSets = new Map(); // sorted sets: key → [{score, member}]

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Test suite ────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockKvStore.clear();
  mockKvSets.clear();
  jest.clearAllMocks();
});

describe("normalizeQuery", () => {
  test("lowercases input", () => {
    expect(normalizeQuery("What Is TypeScript")).toBe("what is typescript");
  });

  test("collapses internal whitespace", () => {
    expect(normalizeQuery("what   is\ttypescript")).toBe("what is typescript");
  });

  test("trims leading and trailing whitespace", () => {
    expect(normalizeQuery("  what is typescript  ")).toBe("what is typescript");
  });

  test("returns empty string for non-string input", () => {
    expect(normalizeQuery(null)).toBe("");
    expect(normalizeQuery(undefined)).toBe("");
  });

  test("is idempotent", () => {
    const once = normalizeQuery("  WHAT  IS  TypeScript  ");
    const twice = normalizeQuery(once);
    expect(once).toBe(twice);
  });
});

describe("hashQuery", () => {
  test("returns a 64-character hex string", () => {
    const h = hashQuery("what is typescript");
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });

  test("is deterministic — same input always yields the same hash", () => {
    const input = "what is typescript";
    expect(hashQuery(input)).toBe(hashQuery(input));
  });

  test("different inputs yield different hashes", () => {
    expect(hashQuery("foo")).not.toBe(hashQuery("bar"));
  });

  test("normalizeQuery + hashQuery pipeline is deterministic across casing/whitespace", () => {
    const h1 = hashQuery(normalizeQuery("  WHAT IS TYPESCRIPT  "));
    const h2 = hashQuery(normalizeQuery("what is typescript"));
    expect(h1).toBe(h2);
  });
});

describe("hashMessages", () => {
  const msg = (role, content) => ({ role, content });

  test("returns a 64-character hex string", () => {
    const h = hashMessages([msg("user", "hello")]);
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });

  test("is deterministic — same messages always yield the same hash", () => {
    const msgs = [msg("system", "You are helpful."), msg("user", "Hi")];
    expect(hashMessages(msgs)).toBe(hashMessages(msgs));
  });

  test("covers the FULL array — adding one message changes the hash", () => {
    const base = [msg("user", "what is typescript")];
    const extended = [msg("user", "what is typescript"), msg("assistant", "A typed superset."), msg("user", "yes")];
    expect(hashMessages(base)).not.toBe(hashMessages(extended));
  });

  test("short follow-up messages ('yes', 'go on') do NOT collide across different conversations", () => {
    const convoA = [msg("user", "explain neural networks"), msg("assistant", "A neural network is..."), msg("user", "yes")];
    const convoB = [msg("user", "explain quantum physics"), msg("assistant", "Quantum physics is..."), msg("user", "yes")];
    // Same final message ('yes') but different context → must produce different hashes
    expect(hashMessages(convoA)).not.toBe(hashMessages(convoB));
  });

  test("is case and whitespace normalised (via normalizeQuery on content)", () => {
    const h1 = hashMessages([msg("user", "  WHAT IS TYPESCRIPT  ")]);
    const h2 = hashMessages([msg("user", "what is typescript")]);
    expect(h1).toBe(h2);
  });

  test("role is included in the hash — same content different role yields different hash", () => {
    const h1 = hashMessages([msg("user", "hello")]);
    const h2 = hashMessages([msg("assistant", "hello")]);
    expect(h1).not.toBe(h2);
  });

  test("returns empty string for empty array", () => {
    expect(hashMessages([])).toBe("");
  });

  test("returns empty string for non-array input", () => {
    expect(hashMessages(null)).toBe("");
    expect(hashMessages(undefined)).toBe("");
  });
});

describe("storeDkrEntry + lookupDkrByHash", () => {
  test("stores an entry and retrieves it by hash", async () => {
    const entry = makeEntry();
    await storeDkrEntry(entry);

    const result = await lookupDkrByHash("pilot", entry.queryHash);
    expect(result).not.toBeNull();
    expect(result.entryId).toBe(entry.entryId);
    expect(result.response).toBe(entry.response);
  });

  test("returns null for an unknown hash", async () => {
    const result = await lookupDkrByHash("pilot", "nonexistent-hash-abc123");
    expect(result).toBeNull();
  });

  test("returns null for wrong tenant", async () => {
    const entry = makeEntry();
    await storeDkrEntry(entry);
    const result = await lookupDkrByHash("other-tenant", entry.queryHash);
    expect(result).toBeNull();
  });

  test("stores entry with 24-hour TTL (86400s) on both entry and hash keys", async () => {
    const { kvSet } = await import("../../shared/lib/kv.js");
    const entry = makeEntry();
    await storeDkrEntry(entry);

    expect(kvSet).toHaveBeenCalledWith(
      expect.stringContaining(entry.entryId),
      entry,
      { ex: 86400 }
    );
    expect(kvSet).toHaveBeenCalledWith(
      expect.stringContaining(entry.queryHash),
      entry.entryId,
      { ex: 86400 }
    );
  });

  test("is a no-op for entries missing entryId or queryHash", async () => {
    const { kvSet } = await import("../../shared/lib/kv.js");
    await storeDkrEntry({ entryId: "", queryHash: "abc", response: "x", tenantId: "pilot" });
    await storeDkrEntry({ entryId: "abc", queryHash: "", response: "x", tenantId: "pilot" });
    expect(kvSet).not.toHaveBeenCalled();
  });
});

describe("recordDkrHit", () => {
  test("increments hitCount by 1", async () => {
    const entry = makeEntry({ hitCount: 0 });
    await storeDkrEntry(entry);

    await recordDkrHit("pilot", entry.entryId);

    const updated = await lookupDkrByHash("pilot", entry.queryHash);
    expect(updated.hitCount).toBe(1);
  });

  test("sets lastHitAt to a valid ISO string", async () => {
    const entry = makeEntry({ lastHitAt: null });
    await storeDkrEntry(entry);

    await recordDkrHit("pilot", entry.entryId);

    const updated = await lookupDkrByHash("pilot", entry.queryHash);
    expect(typeof updated.lastHitAt).toBe("string");
    expect(new Date(updated.lastHitAt).getTime()).toBeGreaterThan(0);
  });

  test("is a no-op for missing tenant or entryId", async () => {
    // Should not throw
    await expect(recordDkrHit("", "some-id")).resolves.toBeUndefined();
    await expect(recordDkrHit("pilot", "")).resolves.toBeUndefined();
  });
});

describe("getDkrIndex", () => {
  test("returns entries in recency order (newest first)", async () => {
    const older = makeEntry({ entryId: "entry-001", queryHash: hashQuery("alpha"), timestamp: "2026-01-01T00:00:00.000Z" });
    const newer = makeEntry({ entryId: "entry-002", queryHash: hashQuery("beta"), timestamp: "2026-06-01T00:00:00.000Z" });

    await storeDkrEntry(older);
    await storeDkrEntry(newer);

    const index = await getDkrIndex("pilot");
    expect(index.length).toBe(2);
    // Newer entry should be first
    expect(index[0].entryId).toBe("entry-002");
    expect(index[1].entryId).toBe("entry-001");
  });

  test("returns empty array for empty tenant", async () => {
    const result = await getDkrIndex("pilot");
    expect(result).toEqual([]);
  });

  test("returns empty array for missing tenant string", async () => {
    const result = await getDkrIndex("");
    expect(result).toEqual([]);
  });

  test("respects limit parameter", async () => {
    for (let i = 0; i < 5; i++) {
      await storeDkrEntry(makeEntry({ entryId: `entry-${i}`, queryHash: hashQuery(`query ${i}`) }));
    }
    const index = await getDkrIndex("pilot", 3);
    expect(index.length).toBeLessThanOrEqual(3);
  });
});

describe("DKR graceful degrade when KV unavailable", () => {
  beforeEach(() => {
    const kv = require("../../shared/lib/kv.js");
    kv.kvSet.mockResolvedValue(undefined);
    kv.kvGet.mockResolvedValue(null);
    kv.kvZadd.mockResolvedValue(undefined);
    kv.kvZrange.mockResolvedValue([]);
  });

  test("storeDkrEntry does not throw when KV is unavailable", async () => {
    await expect(storeDkrEntry(makeEntry())).resolves.toBeUndefined();
  });

  test("lookupDkrByHash returns null when KV is unavailable", async () => {
    const result = await lookupDkrByHash("pilot", "some-hash");
    expect(result).toBeNull();
  });

  test("getDkrIndex returns empty array when KV is unavailable", async () => {
    const result = await getDkrIndex("pilot");
    expect(result).toEqual([]);
  });
});
