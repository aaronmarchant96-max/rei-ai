// api/lib/auth.js
//
// API-key authentication for the evaluation plane endpoints.  Called from
// Vercel serverless functions (api/eval/*.js) and the Express dev server.
//
// When the REI_API_KEYS environment variable is absent, all requests pass
// unauthenticated (public demo mode).  When it IS present, every request to
// a guarded endpoint MUST carry a valid key via the x-rei-api-key header or
// an Authorization: Bearer <token> header.
//
// REI_API_KEYS is a comma-separated list.  Comparison is constant-time so
// timing side-channels leak no information about valid keys.
//
// See docs/POLICY_LOOP.md — this is the first P1 production-security
// increment (authenticated API).

/**
 * Return true when the request carries a valid API key or when auth is
 * disabled (REI_API_KEYS not set).  False otherwise.
 */
export function checkApiKey(req) {
  var keys = process.env.REI_API_KEYS;
  if (!keys || typeof keys !== "string" || keys.trim().length === 0) {
    return true; // auth disabled — public demo
  }

  // Extract the bearer token from either transport.
  var token = null;
  if (req.headers) {
    // x-rei-api-key (recommended — single-purpose)
    if (typeof req.headers["x-rei-api-key"] === "string") {
      token = req.headers["x-rei-api-key"].trim();
    }
    // Authorization: Bearer <token>
    if (!token && typeof req.headers.authorization === "string") {
      var m = req.headers.authorization.match(/^Bearer\s+(.+)$/i);
      if (m) token = m[1].trim();
    }
  }

  if (!token || token.length === 0) return false;

  var validKeys = keys.split(",").map(function (k) { return k.trim(); });
  for (var i = 0; i < validKeys.length; i++) {
    if (constantTimeEqual(token, validKeys[i])) return true;
  }
  return false;
}

/**
 * Convenience wrapper: sends a 401 JSON response when the request is
 * unauthenticated, returns true when authorised.  Call at the top of a
 * guarded handler:
 *
 *   if (!requireApiKey(req, res)) return;
 */
export function requireApiKey(req, res) {
  if (checkApiKey(req)) return true;
  res
    .status(401)
    .setHeader("Content-Type", "application/json")
    .json({
      error: "Unauthorized",
      hint: "Provide an API key via the x-rei-api-key header or Authorization: Bearer <token>",
    });
  return false;
}

/**
 * Character-wise constant-time string comparison.
 * Iterates every character of both strings once regardless of early mismatch
 * so a timing clock cannot infer the position of the first incorrect byte.
 */
function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  var len = Math.max(a.length, b.length);
  var result = 0;
  for (var i = 0; i < len; i++) {
    var ca = i < a.length ? a.charCodeAt(i) : 0;
    var cb = i < b.length ? b.charCodeAt(i) : 0;
    result |= ca ^ cb;
  }
  // Also compare lengths — identical strings must have identical lengths.
  result |= a.length ^ b.length;
  return result === 0;
}
