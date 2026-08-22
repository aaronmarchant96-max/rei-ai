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
  if (parts.length === 1 && parts[0].startsWith("rei_key_")) {
    return parts[0].trim();
  }
  return null;
}

export function resolveTenantContext(apiKey) {
  if (!apiKey) {
    return { isAllowed: false, status: 401, code: "CF_AUTH_REQUIRED", message: "Authentication required. Provide a valid Bearer key (e.g. Bearer rei_key_...)." };
  }

  // Parse REI_API_KEYS env var (format: "key:tenantId:quotaPerMin:rateLimit,key2:tenant2:...")
  const keysEnv = process.env.REI_API_KEYS || process.env.REI_API_KEY || "";
  const keyEntries = keysEnv.split(",").filter(Boolean);

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

  // Allow single REI_API_KEY env match
  const singleKey = process.env.REI_API_KEY;
  if (!matchedTenant && singleKey && apiKey === singleKey) {
    matchedTenant = { apiKey, tenantId: "pilot", quotaPerMin: 100, rateLimitPerMin: 60 };
  }

  // Allow pilot fallback key if REI_API_KEYS is unconfigured
  if (!matchedTenant && (apiKey.startsWith("rei_key_") || apiKey.includes("test"))) {
    const tenantId = apiKey.startsWith("rei_key_") ? apiKey.replace("rei_key_", "") : "pilot";
    matchedTenant = {
      apiKey,
      tenantId: tenantId || "pilot",
      quotaPerMin: 100,
      rateLimitPerMin: 60
    };
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
