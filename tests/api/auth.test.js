import { checkApiKey, requireApiKey } from "../../shared/lib/auth.js";

function makeReq(headers) {
  return { headers: headers || {} };
}

function makeRes() {
  var obj = {
    _status: null,
    _body: null,
    _header: null,
    status: function (code) { obj._status = code; return obj; },
    setHeader: function (name, value) { obj._header = value; return obj; },
    json: function (data) { obj._body = data; return obj; },
  };
  return obj;
}

describe("checkApiKey", function () {
  var prev;

  beforeEach(function () {
    prev = process.env.REI_API_KEYS;
    delete process.env.REI_API_KEYS;
  });

  afterEach(function () {
    if (prev !== undefined) process.env.REI_API_KEYS = prev;
    else delete process.env.REI_API_KEYS;
  });

  it("passes when REI_API_KEYS is not set (auth disabled)", function () {
    expect(checkApiKey(makeReq())).toBe(true);
  });

  it("passes when REI_API_KEYS is an empty string", function () {
    process.env.REI_API_KEYS = "  ";
    expect(checkApiKey(makeReq())).toBe(true);
  });

  it("rejects when no header is present and auth is enabled", function () {
    process.env.REI_API_KEYS = "key-abc";
    expect(checkApiKey(makeReq())).toBe(false);
  });

  it("accepts a valid x-rei-api-key header", function () {
    process.env.REI_API_KEYS = "key-abc";
    expect(checkApiKey(makeReq({ "x-rei-api-key": "key-abc" }))).toBe(true);
  });

  it("accepts a Bearer token", function () {
    process.env.REI_API_KEYS = "key-xyz";
    expect(checkApiKey(makeReq({ authorization: "Bearer key-xyz" }))).toBe(true);
  });

  it("rejects a wrong key via x-rei-api-key", function () {
    process.env.REI_API_KEYS = "key-abc";
    expect(checkApiKey(makeReq({ "x-rei-api-key": "wrong-key" }))).toBe(false);
  });

  it("rejects a wrong Bearer token", function () {
    process.env.REI_API_KEYS = "key-xyz";
    expect(checkApiKey(makeReq({ authorization: "Bearer wrong-token" }))).toBe(false);
  });

  it("accepts any key from a multi-key list", function () {
    process.env.REI_API_KEYS = "k1, k2, k3";
    expect(checkApiKey(makeReq({ "x-rei-api-key": "k2" }))).toBe(true);
    expect(checkApiKey(makeReq({ "x-rei-api-key": "k1" }))).toBe(true);
    expect(checkApiKey(makeReq({ "x-rei-api-key": "k3" }))).toBe(true);
  });

  it("rejects an empty token", function () {
    process.env.REI_API_KEYS = "key-abc";
    expect(checkApiKey(makeReq({ "x-rei-api-key": "" }))).toBe(false);
  });
});

describe("requireApiKey", function () {
  it("sends 401 JSON when unauthorised", function () {
    process.env.REI_API_KEYS = "key-abc";
    var res = makeRes();
    var result = requireApiKey(makeReq(), res);
    expect(result).toBe(false);
    expect(res._status).toBe(401);
    expect(res._body.error).toBe("Unauthorized");
  });

  it("returns true when authorised (no 401 emitted)", function () {
    process.env.REI_API_KEYS = "key-abc";
    var res = makeRes();
    var result = requireApiKey(makeReq({ "x-rei-api-key": "key-abc" }), res);
    expect(result).toBe(true);
    expect(res._status).toBeNull();
  });
});

import { resolveTenantContext } from "../../shared/lib/authTenantEngine.js";

describe("resolveTenantContext P0 auth security gate", function () {
  var prevKeys;

  beforeEach(function () {
    prevKeys = process.env.REI_API_KEYS;
  });

  afterEach(function () {
    if (prevKeys !== undefined) process.env.REI_API_KEYS = prevKeys;
    else delete process.env.REI_API_KEYS;
  });

  it("strictly rejects unconfigured rei_key_* credentials when REI_API_KEYS is set", function () {
    process.env.REI_API_KEYS = "valid_key_123:tenant_a";
    const ctx = resolveTenantContext("rei_key_unconfigured_hacker");
    expect(ctx.isAllowed).toBe(false);
    expect(ctx.status).toBe(401);
  });

  it("allows configured keys when REI_API_KEYS is set", function () {
    process.env.REI_API_KEYS = "valid_key_123:tenant_a";
    const ctx = resolveTenantContext("valid_key_123");
    expect(ctx.isAllowed).toBe(true);
    expect(ctx.tenantId).toBe("tenant_a");
  });

  it("allows fallback key in unconfigured non-production environment", function () {
    delete process.env.REI_API_KEYS;
    delete process.env.REI_API_KEY;
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const ctx = resolveTenantContext("rei_key_dev_probe");
    expect(ctx.isAllowed).toBe(true);
    process.env.NODE_ENV = prevEnv;
  });
});
