import { describe, it, expect } from "@jest/globals";

/**
 * Concurrency Invariants Static Evaluator
 * Audits code output for 4 non-negotiable concurrency correctness rules:
 * 1. No mutation under RLock (e.g. MoveToFront, Remove, map writes)
 * 2. Double-checked re-verification on RLock->Lock upgrade
 * 3. Graceful stop/cancellation on background worker loops
 * 4. Minimum ticker interval guard
 */
export function evaluateConcurrencyInvariants(codeSnippet = "") {
  const violations = [];

  // Rule 1: Check for mutation under RLock
  const rlockBlocks = codeSnippet.match(/RLock\(\)[\s\S]*?RUnlock\(\)/g) || [];
  for (const block of rlockBlocks) {
    if (/\b(MoveToFront|Remove|PushFront|PushBack|delete\(|\w+\[[^\]]+\]\s*=|\bappend\()\b/.test(block)) {
      violations.push({
        rule: "NO_MUTATION_UNDER_RLOCK",
        severity: "FATAL",
        message: "Data race: Shared memory mutation detected inside RLock() block.",
        snippet: block.slice(0, 100),
      });
    }
  }

  // Rule 2: Check lock upgrade re-verification
  if (codeSnippet.includes("RUnlock()") && codeSnippet.includes("Lock()")) {
    const lockUpgradeBlocks = codeSnippet.match(/RUnlock\(\)[\s\S]*?Lock\(\)[\s\S]*?Unlock\(\)/g) || [];
    for (const block of lockUpgradeBlocks) {
      if (/\b(remove|delete|evict|Set)\b/i.test(block) && !/\b(if|ok|present|cur\s*==|c\.isExpired)\b/.test(block)) {
        violations.push({
          rule: "UNGUARDED_LOCK_UPGRADE",
          severity: "HIGH",
          message: "State race: Lock acquired after RUnlock without re-checking existence or expiry.",
          snippet: block.slice(0, 100),
        });
      }
    }
  }

  // Rule 3: Background worker lifecycle check
  if (codeSnippet.includes("go ") && (codeSnippet.includes("sweeper") || codeSnippet.includes("worker") || codeSnippet.includes("Ticker"))) {
    const hasStopChannel = /stopCh|ctx\.Done\(\)|Stop\(\)|cancel\(\)/.test(codeSnippet);
    const hasCloseMethod = /func\s*\([^)]*\)\s*(Close|Stop)\s*\(\)/.test(codeSnippet);
    if (!hasStopChannel || !hasCloseMethod) {
      violations.push({
        rule: "MISSING_WORKER_CLEANUP",
        severity: "MEDIUM",
        message: "Goroutine leak: Background worker lacks a Close()/Stop() method or cancellation channel.",
      });
    }
  }

  // Rule 4: Ticker interval guard
  if (codeSnippet.includes("NewTicker(")) {
    const hasMinGuard = /min|50\*time\.Millisecond|interval\s*<|100\*time\.Millisecond/i.test(codeSnippet);
    if (!hasMinGuard) {
      violations.push({
        rule: "UNBOUNDED_TICKER_INTERVAL",
        severity: "LOW",
        message: "CPU thrashing risk: NewTicker used without a minimum interval floor for short TTLs.",
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    score: Math.max(0, 10 - violations.length * 2.5),
  };
}

describe("Concurrency Invariants Evaluator", () => {
  it("flags RLock mutation data race in naive Go code", () => {
    const naiveCode = `
      func (c *Cache) Get(key string) (any, bool) {
        c.mu.RLock()
        e, ok := c.items[key]
        if ok {
          c.lru.MoveToFront(e.element)
        }
        c.mu.RUnlock()
        return e.value, ok
      }
    `;
    const res = evaluateConcurrencyInvariants(naiveCode);
    expect(res.valid).toBe(false);
    expect(res.violations.some((v) => v.rule === "NO_MUTATION_UNDER_RLOCK")).toBe(true);
  });

  it("passes correct concurrent Go implementation", () => {
    const correctCode = `
      func (c *Cache) Get(key string) (any, bool) {
        c.mu.RLock()
        e, ok := c.items[key]
        if !ok {
          c.mu.RUnlock()
          return nil, false
        }
        expired := c.isExpired(e)
        c.mu.RUnlock()

        c.mu.Lock()
        if cur, present := c.items[key]; present && cur == e && !c.isExpired(cur) {
          c.lru.MoveToFront(cur.element)
          c.mu.Unlock()
          return cur.value, true
        }
        c.mu.Unlock()
        return nil, false
      }

      func (c *Cache) Close() {
        close(c.stopCh)
      }

      func (c *Cache) sweeper() {
        interval := c.ttl / 2
        if interval < 50*time.Millisecond {
          interval = 50 * time.Millisecond
        }
        ticker := time.NewTicker(interval)
        defer ticker.Stop()
        for {
          select {
          case <-c.stopCh:
            return
          case <-ticker.C:
          }
        }
      }
    `;
    const res = evaluateConcurrencyInvariants(correctCode);
    expect(res.valid).toBe(true);
    expect(res.violations).toHaveLength(0);
    expect(res.score).toBe(10);
  });
});
