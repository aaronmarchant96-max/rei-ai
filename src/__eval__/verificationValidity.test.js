/** @jest-environment node */

/**
 * VERIFICATION VALIDITY EVALUATION SUITE
 *
 * "The model got the reasoning right and the proof wrong."
 *
 * Tests the evaluation layer's ability to discriminate:
 * 1. Causal attribution in concurrent async contexts (deterministic barriers).
 * 2. Single-oracle mutation testing (safe implementation passes, unsafe fails).
 * 3. Multi-dimensional evaluation dispositions (Conceptual Hinge, Architecture,
 *    Implementation, and Verification Validity).
 * 4. Detection of mock interface hallucinations (mocked vs actual callsites).
 */

import { AsyncLocalStorage } from "node:async_hooks";

describe("Verification Validity Eval — Concurrency & Proof Discriminators", () => {
  // ── 1. Deterministic Concurrency Attribution Invariant ────────────────

  function assertAttributionInvariant(events) {
    expect(events).toEqual([
      { request: "B", observedId: "inv-B" },
      { request: "A", observedId: "inv-A" },
    ]);
  }

  it("passes under AsyncLocalStorage with deterministic barrier coordination", async () => {
    const store = new AsyncLocalStorage();
    const events = [];

    let releaseA = () => {};
    const aBlocked = new Promise((resolve) => {
      releaseA = resolve;
    });

    let bObserved = () => {};
    const bDone = new Promise((resolve) => {
      bObserved = resolve;
    });

    // Request A enters first, yields on barrier
    const taskA = store.run({ invocationId: "inv-A" }, async () => {
      await aBlocked;
      events.push({
        request: "A",
        observedId: store.getStore()?.invocationId ?? "none",
      });
    });

    // Request B enters second, completes immediately, signals barrier
    const taskB = store.run({ invocationId: "inv-B" }, async () => {
      events.push({
        request: "B",
        observedId: store.getStore()?.invocationId ?? "none",
      });
      bObserved();
    });

    await bDone;
    releaseA();
    await Promise.all([taskA, taskB]);

    // Single oracle verification
    assertAttributionInvariant(events);
  });

  it("fails under unsafe global state with the exact same oracle (mutation control)", async () => {
    let globalInvocationId = "none";
    const events = [];

    let releaseA = () => {};
    const aBlocked = new Promise((resolve) => {
      releaseA = resolve;
    });

    let bObserved = () => {};
    const bDone = new Promise((resolve) => {
      bObserved = resolve;
    });

    const taskA = (async () => {
      globalInvocationId = "inv-A";
      await aBlocked;
      events.push({
        request: "A",
        observedId: globalInvocationId,
      });
    })();

    const taskB = (async () => {
      globalInvocationId = "inv-B";
      events.push({
        request: "B",
        observedId: globalInvocationId,
      });
      bObserved();
    })();

    await bDone;
    releaseA();
    await Promise.all([taskA, taskB]);

    // Mutation Test: The exact same assertion oracle MUST reject the leaked state
    expect(() => assertAttributionInvariant(events)).toThrow();
  });

  // ── 2. Multi-Dimensional Disposition Taxonomy ────────────────────────

  function scoreDisposition(input) {
    const dimensions = {
      conceptualHinge: input.conceptualHinge ? "PASS" : "FAIL",
      architecture: input.architectureSelection ? "PASS" : "FAIL",
      implementation: input.implementationCorrectness ? "PASS" : "FAIL",
      verificationValidity: input.verificationValidity ? "PASS" : "FAIL",
    };

    let disposition;
    if (dimensions.conceptualHinge === "FAIL" || dimensions.architecture === "FAIL") {
      disposition = "REVISE_ARCHITECTURE";
    } else if (dimensions.implementation === "FAIL") {
      disposition = "REJECT";
    } else if (dimensions.verificationValidity === "FAIL") {
      disposition = "REVISE_PROOF";
    } else {
      disposition = "APPROVED";
    }

    const passedCount = Object.values(dimensions).filter((d) => d === "PASS").length;
    const derivedScore = (passedCount / 4) * 10;

    return {
      disposition,
      dimensions,
      requiresRevision: disposition !== "APPROVED",
      derivedScore,
    };
  }

  it("categorizes 'right reasoning, flawed mock proof' as REVISE_PROOF with dimensional breakdown", () => {
    const result = scoreDisposition({
      conceptualHinge: true,
      architectureSelection: true,
      implementationCorrectness: true,
      verificationValidity: false, // ⚠️ Mock interface mismatch
    });

    expect(result.disposition).toBe("REVISE_PROOF");
    expect(result.dimensions).toEqual({
      conceptualHinge: "PASS",
      architecture: "PASS",
      implementation: "PASS",
      verificationValidity: "FAIL",
    });
    expect(result.requiresRevision).toBe(true);
    expect(result.derivedScore).toBe(7.5);
  });

  it("approves fully verified answers with sound proofs as APPROVED", () => {
    const result = scoreDisposition({
      conceptualHinge: true,
      architectureSelection: true,
      implementationCorrectness: true,
      verificationValidity: true,
    });

    expect(result.disposition).toBe("APPROVED");
    expect(result.dimensions).toEqual({
      conceptualHinge: "PASS",
      architecture: "PASS",
      implementation: "PASS",
      verificationValidity: "PASS",
    });
    expect(result.requiresRevision).toBe(false);
    expect(result.derivedScore).toBe(10.0);
  });

  // ── 3. Interface Consistency & Mock Hallucination Detection ──────────

  it("detects when a test mock accesses properties absent from production callsite payload", () => {
    // Production callsite payload
    const productionPayload = { result: { data: "success" } };

    // Flawed mock expectations (expecting invocationId inside payload)
    function flawedMockEmitter(eventName, payload) {
      return payload.invocationId; // Returns undefined
    }

    // Valid context emitter
    function contextAwareEmitter(eventName, payload, store) {
      return store.getStore()?.invocationId;
    }

    const testStore = new AsyncLocalStorage();

    testStore.run({ invocationId: "inv-verified-100" }, () => {
      const flawedResult = flawedMockEmitter("postLLM", productionPayload);
      const contextResult = contextAwareEmitter("postLLM", productionPayload, testStore);

      // Prove that flawed mock produces undefined while context produces ID
      expect(flawedResult).toBeUndefined();
      expect(contextResult).toBe("inv-verified-100");
    });
  });
});
