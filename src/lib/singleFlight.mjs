/**
 * @file src/lib/singleFlight.mjs
 * @description Instance-Local, Tenant-Scoped Single-Flight Deduplication.
 * Coalesces in-flight identical non-streaming requests from the same tenant.
 * Streaming requests (stream: true) explicitly bypass single-flight.
 */

import crypto from "crypto";

export function computeSingleFlightKey(requestPayload) {
  const {
    tenantId = "default-tenant",
    provider = "unknown",
    model = "default-model",
    messages = [],
    systemPrompt = "",
    tools = null,
    temperature = 0.7,
    maxTokens = 2048,
    top_p = 1.0,
    seed = null,
    stop = null,
    responseFormat = null,
    routingVersion = "v3.4"
  } = requestPayload;

  const canonicalParams = {
    tenantId: String(tenantId).trim(),
    provider: String(provider).trim(),
    model: String(model).trim(),
    systemPrompt: String(systemPrompt).trim(),
    messages: Array.isArray(messages) ? messages : [],
    tools: tools || null,
    temperature: Number(temperature),
    maxTokens: Number(maxTokens),
    top_p: Number(top_p),
    seed: seed !== null ? Number(seed) : null,
    stop: stop || null,
    responseFormat: responseFormat || null,
    routingVersion: String(routingVersion)
  };

  const canonicalJson = JSON.stringify(canonicalParams);
  const hash = crypto.createHash("sha256").update(canonicalJson).digest("hex");
  return `sf:${tenantId}:${provider}:${model}:${hash}`;
}

export class SingleFlightGroup {
  constructor() {
    this.inFlight = new Map();
  }

  get stats() {
    return {
      inFlightCount: this.inFlight.size
    };
  }

  async do(key, requestPayload, executionFn) {
    // 1. Streaming Bypass Check
    if (requestPayload?.stream === true) {
      const leaderResult = await executionFn();
      return {
        ...leaderResult,
        executionRole: "leader",
        singleFlightCoalesced: false
      };
    }

    // 2. Coalescing Check
    if (this.inFlight.has(key)) {
      const leaderEntry = this.inFlight.get(key);
      const leaderResult = await leaderEntry.promise;

      return {
        ...leaderResult,
        executionRole: "coalesced_follower",
        singleFlightCoalesced: true,
        providerCalled: false,
        billedTokens: 0,
        billedCostUsd: 0,
        coalescedFromRequestId: leaderEntry.requestId
      };
    }

    // 3. Leader Execution
    const requestId = requestPayload?.requestId || `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    let resolvePromise, rejectPromise;
    const promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    const entry = { requestId, promise };
    this.inFlight.set(key, entry);

    try {
      const result = await executionFn();
      const leaderPayload = {
        ...result,
        executionRole: "leader",
        singleFlightCoalesced: false,
        requestId
      };
      resolvePromise(leaderPayload);
      return leaderPayload;
    } catch (err) {
      rejectPromise(err);
      throw err;
    } finally {
      this.inFlight.delete(key);
    }
  }

  clear() {
    this.inFlight.clear();
  }
}
