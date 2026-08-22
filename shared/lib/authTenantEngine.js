/**
 * @file shared/lib/authTenantEngine.js
 * @description Unified Authentication and Tenant Identity Engine for REI.ai Gateway.
 * Resolves Bearer tokens (rei_key_...) to tenant context, remaining quota, and tenant receipt isolation.
 */

const inMemoryTenantUsage = new Map();

export function parseApiKeyHeader(authHeader) {
  if (!authHeader || typeof authHeader !== "string") return null;
  const parts = authHeader.trim().split(" ");
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
    return parts[1].trim();
  }
  if (parts.length === 1 && parts[0].length > 0) {
    return parts[0].trim();
  }
  return null;
}

export function resolveTenantContext(apiKey) {
  if (!apiKey) {
    return { isAllowed: false, status: 401, code: "CF_AUTH_REQUIRED", message: "Authentication required. Provide a valid Bearer key (e.g. Bearer rei_key_...)." };
  }

  const envKeys = process.env.REI_API_KEYS;
  const singleKey = process.env.REI_API_KEY;

  let keyEntries = [];
  if (envKeys) {
    keyEntries = envKeys.split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    keyEntries = [
      "rei_key_pilot:pilot:100:60",
      "rei_key_quota_test:quota_test:10:60",
      "rei_key_pilot_test:pilot_test:100:60",
      "rei_key_dev:pilot:100:60",
      "rei_key_dev_probe:pilot:100:60"
    ];
    if (singleKey) {
      keyEntries.push(`${singleKey}:pilot:100:60`);
    }
  }

  let matchedTenant = null;

  for (const entry of keyEntries) {
    const [k, tenantId = "pilot", quotaStr = "100", rateStr = "60"] = entry.split(":").map((s) => s.trim());
    if (k === apiKey) {
      matchedTenant = {
        apiKey: k,
        tenantId,
        quotaPerMin: Number(quotaStr) || 100,
        rateLimitPerMin: Number(rateStr) || 60
      };
      break;
    }
  }

  if (!matchedTenant) {
    return { isAllowed: false, status: 401, code: "CF_AUTH_REQUIRED", message: "Invalid or missing API key provided." };
  }

  // Quota & Rate Limit Tracking
  const now = Date.now();
  const windowMs = 60000;
  let usage = inMemoryTenantUsage.get(matchedTenant.tenantId);

  if (!usage || (now - usage.windowStart) > windowMs) {
    usage = { count: 0, windowStart: now };
    inMemoryTenantUsage.set(matchedTenant.tenantId, usage);
  }

  if (usage.count >= matchedTenant.quotaPerMin) {
    return {
      isAllowed: false,
      status: 429,
      code: "CF_QUOTA_EXCEEDED",
      message: `Tenant quota exceeded (${matchedTenant.quotaPerMin} req/min). Try again in a moment.`,
      tenantId: matchedTenant.tenantId
    };
  }

  usage.count += 1;

  return {
    isAllowed: true,
    status: 200,
    tenantId: matchedTenant.tenantId,
    quotaPerMin: matchedTenant.quotaPerMin,
    quotaRemaining: Math.max(0, matchedTenant.quotaPerMin - usage.count)
  };
}
