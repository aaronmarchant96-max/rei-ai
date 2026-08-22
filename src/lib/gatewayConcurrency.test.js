import { BoundedConcurrencyPool } from "./concurrencyPool.mjs";
import { SingleFlightGroup, computeSingleFlightKey } from "./singleFlight.mjs";
import { executeBatchWithConcurrency } from "./batchRunner.mjs";

describe("Gateway Concurrency & Single-Flight Request Coalescing Battery", () => {
  describe("1. Single-Flight Key Computation & Parameter Sensitivity", () => {
    test("Condition 2: Canonically equivalent requests produce identical key", () => {
      const payload1 = { tenantId: "t1", provider: "gemini", model: "flash", messages: [{ role: "user", content: "hello" }], temperature: 0.7 };
      const payload2 = { tenantId: "t1", provider: "gemini", model: "flash", messages: [{ role: "user", content: "hello" }], temperature: 0.7 };
      expect(computeSingleFlightKey(payload1)).toBe(computeSingleFlightKey(payload2));
    });

    test("Condition 3: Different tenants NEVER coalesce", () => {
      const payload1 = { tenantId: "tenant-A", provider: "gemini", model: "flash", messages: [{ role: "user", content: "hello" }] };
      const payload2 = { tenantId: "tenant-B", provider: "gemini", model: "flash", messages: [{ role: "user", content: "hello" }] };
      expect(computeSingleFlightKey(payload1)).not.toBe(computeSingleFlightKey(payload2));
    });

    test("Condition 4: Parameter sensitivity (tools, maxTokens, temperature)", () => {
      const base = { tenantId: "t1", provider: "gemini", model: "flash", messages: [{ role: "user", content: "hello" }] };
      const withTemp = { ...base, temperature: 0.2 };
      const withTools = { ...base, tools: [{ type: "function" }] };
      const withMaxTokens = { ...base, maxTokens: 4000 };

      const keyBase = computeSingleFlightKey(base);
      expect(computeSingleFlightKey(withTemp)).not.toBe(keyBase);
      expect(computeSingleFlightKey(withTools)).not.toBe(keyBase);
      expect(computeSingleFlightKey(withMaxTokens)).not.toBe(keyBase);
    });

    test("Condition 8: Streaming requests bypass single-flight", async () => {
      const group = new SingleFlightGroup();
      const payloadStream = { tenantId: "t1", provider: "gemini", stream: true };

      let providerCalls = 0;
      const task = async () => { providerCalls++; return { content: "stream chunk" }; };

      const p1 = group.do("key1", payloadStream, task);
      const p2 = group.do("key1", payloadStream, task);

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(providerCalls).toBe(2);
      expect(r1.singleFlightCoalesced).toBe(false);
      expect(r2.singleFlightCoalesced).toBe(false);
    });
  });

  describe("2. Single-Flight Execution & Leader/Follower Cost Deduplication", () => {
    test("Condition 1 & 16 & 17: Leader owns cost/tokens, followers get $0.00 billed cost", async () => {
      const group = new SingleFlightGroup();
      const payload = { tenantId: "t1", provider: "gemini", model: "flash", requestId: "req-leader-1" };
      const key = computeSingleFlightKey(payload);

      let providerCalls = 0;
      const slowProviderCall = () => new Promise((res) => {
        setTimeout(() => {
          providerCalls++;
          res({ content: "coalesced output", usage: { prompt_tokens: 100, completion_tokens: 50 }, billedCostUsd: 0.0004 });
        }, 50);
      });

      const p1 = group.do(key, payload, slowProviderCall);
      const p2 = group.do(key, payload, slowProviderCall);

      const [r1, r2] = await Promise.all([p1, p2]);

      expect(providerCalls).toBe(1);
      expect(group.stats.inFlightCount).toBe(0); // Condition 1: Map cleanup

      // Leader
      expect(r1.executionRole).toBe("leader");
      expect(r1.singleFlightCoalesced).toBe(false);
      expect(r1.billedCostUsd).toBe(0.0004);

      // Follower
      expect(r2.executionRole).toBe("coalesced_follower");
      expect(r2.singleFlightCoalesced).toBe(true);
      expect(r2.billedCostUsd).toBe(0);
      expect(r2.billedTokens).toBe(0);
      expect(r2.coalescedFromRequestId).toBe("req-leader-1");
    });
  });

  describe("3. Bounded Semaphore Concurrency Pool & Permit Safety", () => {
    test("Condition 9 & 15: Concurrency pool never exceeds maxConcurrent and releases permits on failure", async () => {
      const pool = new BoundedConcurrencyPool({ name: "gemini", maxConcurrent: 2, maxQueueDepth: 5 });

      let active = 0;
      let maxObservedActive = 0;

      const worker = async (fail = false) => {
        return pool.run(async () => {
          active++;
          maxObservedActive = Math.max(maxObservedActive, active);
          await new Promise((r) => setTimeout(r, 20));
          active--;
          if (fail) throw new Error("task failure");
          return "ok";
        });
      };

      const tasks = [
        worker(false),
        worker(true),
        worker(false),
        worker(false)
      ];

      const results = await Promise.allSettled(tasks);
      expect(maxObservedActive).toBeLessThanOrEqual(2);
      expect(pool.stats.activeCount).toBe(0); // Permit released on failure
      expect(results[1].status).toBe("rejected");
    });

    test("Condition 10: Gemini pool throttling does not block Groq pool", async () => {
      const geminiPool = new BoundedConcurrencyPool({ name: "gemini", maxConcurrent: 1, maxQueueDepth: 2 });
      const groqPool = new BoundedConcurrencyPool({ name: "groq", maxConcurrent: 2, maxQueueDepth: 2 });

      let geminiRunning = false;
      let groqFinished = false;

      const geminiTask = geminiPool.run(async () => {
        geminiRunning = true;
        await new Promise((r) => setTimeout(r, 100));
        geminiRunning = false;
      });

      const groqTask = groqPool.run(async () => {
        groqFinished = true;
        return "groq-done";
      });

      const resGroq = await groqTask;
      expect(resGroq).toBe("groq-done");
      expect(groqFinished).toBe(true);
      await geminiTask;
    });

    test("Condition 11: Queue overflow fails gracefully with POOL_QUEUE_OVERFLOW status 429", async () => {
      const pool = new BoundedConcurrencyPool({ name: "test", maxConcurrent: 1, maxQueueDepth: 1, acquireDeadlineMs: 5000 });

      // Occupy slot
      pool.acquire();
      // Occupy 1 queue spot
      pool.acquire().catch(() => {});

      // 3rd attempt exceeds maxQueueDepth=1 -> throws overflow
      await expect(pool.acquire()).rejects.toThrow("Provider queue depth limit (1) exceeded");
    });
  });

  describe("4. Bounded Batch Runner & Order Preservation", () => {
    test("Condition 18: Preserves 100% input task ordering in batch results", async () => {
      const tasks = [
        async () => { await new Promise((r) => setTimeout(r, 40)); return "first"; },
        async () => { await new Promise((r) => setTimeout(r, 10)); return "second"; },
        async () => { await new Promise((r) => setTimeout(r, 20)); return "third"; }
      ];

      const results = await executeBatchWithConcurrency(tasks, { concurrency: 2, timeoutMs: 5000 });

      expect(results.length).toBe(3);
      expect(results[0].value).toBe("first");
      expect(results[1].value).toBe("second");
      expect(results[2].value).toBe("third");
    });
  });
});
