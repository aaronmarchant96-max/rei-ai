import { isPrivateIpOrHost, cleanHtmlToText, executeFetchUrl, extractToolCalls, AVAILABLE_TOOLS } from "../../api/cfai.js";

describe("URL Fetching Tool & SSRF Security", () => {
  describe("isPrivateIpOrHost", () => {
    it("identifies localhost and local domain names", () => {
      expect(isPrivateIpOrHost("localhost")).toBe(true);
      expect(isPrivateIpOrHost("my-server.local")).toBe(true);
      expect(isPrivateIpOrHost("internal-service.internal")).toBe(true);
    });

    it("identifies private IPv4 ranges (loopback, 10.x, 192.168.x, 172.16-31.x, link-local)", () => {
      expect(isPrivateIpOrHost("127.0.0.1")).toBe(true);
      expect(isPrivateIpOrHost("127.100.0.5")).toBe(true);
      expect(isPrivateIpOrHost("10.0.1.50")).toBe(true);
      expect(isPrivateIpOrHost("192.168.1.1")).toBe(true);
      expect(isPrivateIpOrHost("169.254.169.254")).toBe(true); // AWS/GCP metadata service
      expect(isPrivateIpOrHost("172.16.0.1")).toBe(true);
      expect(isPrivateIpOrHost("172.31.255.255")).toBe(true);
      expect(isPrivateIpOrHost("0.0.0.0")).toBe(true);
    });

    it("identifies IPv6 loopback and unique local addresses", () => {
      expect(isPrivateIpOrHost("::1")).toBe(true);
      expect(isPrivateIpOrHost("fc00::1")).toBe(true);
    });

    it("allows public domain names and public IPs", () => {
      expect(isPrivateIpOrHost("example.com")).toBe(false);
      expect(isPrivateIpOrHost("wikipedia.org")).toBe(false);
      expect(isPrivateIpOrHost("8.8.8.8")).toBe(false);
      expect(isPrivateIpOrHost("104.244.42.1")).toBe(false);
    });
  });

  describe("cleanHtmlToText", () => {
    it("extracts page title and removes scripts/styles/tags", () => {
      const sampleHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Page Title</title>
            <style>body { background: red; }</style>
            <script>console.log("secret code");</script>
          </head>
          <body>
            <h1>Main Heading</h1>
            <p>This is a paragraph with <a href="/link">a link</a> &amp; some text.</p>
            <noscript>Enable JS</noscript>
          </body>
        </html>
      `;

      const result = cleanHtmlToText(sampleHtml);
      expect(result).toContain("Title: Test Page Title");
      expect(result).toContain("Main Heading");
      expect(result).toContain("This is a paragraph with a link & some text.");
      expect(result).not.toContain("background: red");
      expect(result).not.toContain("secret code");
      expect(result).not.toContain("Enable JS");
    });
  });

  describe("executeFetchUrl", () => {
    it("rejects non-string and empty URLs", async () => {
      const res = await executeFetchUrl(null);
      expect(JSON.parse(res).error).toContain("Invalid");
    });

    it("rejects non-HTTP protocols (e.g. file://, ftp://)", async () => {
      const res = await executeFetchUrl("file:///etc/passwd");
      expect(JSON.parse(res).error).toContain("Only http and https");
    });

    it("blocks SSRF attempts to AWS metadata service and localhost", async () => {
      const res1 = await executeFetchUrl("http://169.254.169.254/latest/meta-data/");
      expect(JSON.parse(res1).error).toContain("blocked for security");

      const res2 = await executeFetchUrl("http://localhost:3000/admin");
      expect(JSON.parse(res2).error).toContain("blocked for security");
    });

    it("blocks 302 redirect-based SSRF attempts to AWS metadata and localhost", async () => {
      // Step 1: Public URL responds with 302 Location: http://169.254.169.254/latest/meta-data/
      const mockFetchRedirectAws = jest.fn().mockResolvedValue({
        status: 302,
        ok: false,
        headers: {
          get: (name) => (name.toLowerCase() === "location" ? "http://169.254.169.254/latest/meta-data/" : null)
        }
      });
      global.fetch = mockFetchRedirectAws;

      const resAws = await executeFetchUrl("https://innocent-looking-site.com/redirect");
      expect(JSON.parse(resAws).error).toContain("blocked for security");

      // Step 2: Public URL responds with 302 Location: http://127.0.0.1:8080/admin
      const mockFetchRedirectLocal = jest.fn().mockResolvedValue({
        status: 302,
        ok: false,
        headers: {
          get: (name) => (name.toLowerCase() === "location" ? "http://127.0.0.1:8080/admin" : null)
        }
      });
      global.fetch = mockFetchRedirectLocal;

      const resLocal = await executeFetchUrl("https://innocent-looking-site.com/redirect2");
      expect(JSON.parse(resLocal).error).toContain("blocked for security");
    });

    it("follows legitimate public-to-public redirects successfully", async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation((url) => {
        callCount += 1;
        if (callCount === 1) {
          return Promise.resolve({
            status: 301,
            ok: false,
            headers: {
              get: (name) => (name.toLowerCase() === "location" ? "https://example.com/final-destination" : null)
            }
          });
        }
        return Promise.resolve({
          status: 200,
          ok: true,
          headers: { get: () => null },
          text: () => Promise.resolve("<html><head><title>Final Page</title></head><body>Target reached</body></html>")
        });
      });

      const res = await executeFetchUrl("https://example.com/initial-page");
      const parsed = JSON.parse(res);
      expect(parsed.url).toBe("https://example.com/final-destination");
      expect(parsed.content).toContain("Title: Final Page");
      expect(parsed.content).toContain("Target reached");
      expect(callCount).toBe(2);
    });

    it("aborts when redirect limit (MAX_REDIRECTS) is exceeded", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 302,
        ok: false,
        headers: {
          get: (name) => (name.toLowerCase() === "location" ? "https://example.com/infinite-loop" : null)
        }
      });

      const res = await executeFetchUrl("https://example.com/start-loop");
      expect(JSON.parse(res).error).toContain("Too many redirects");
    });
  });

  describe("extractToolCalls Parser", () => {
    it("extracts native OpenAI tool_calls array", () => {
      const input = {
        tool_calls: [
          {
            id: "call_123",
            type: "function",
            function: { name: "fetch_url", arguments: '{"url":"https://example.com"}' }
          }
        ]
      };
      const tools = extractToolCalls(input);
      expect(tools).toHaveLength(1);
      expect(tools[0].function.name).toBe("fetch_url");
    });

    it("extracts in-text LLaMA <function=fetch_url> tags from content", () => {
      const input = {
        content: `
          To review your repository, let me fetch it.
          <function=fetch_url>{"url": "https://github.com/aaronmarchant96-max/family-archive"}</function>
        `
      };
      const tools = extractToolCalls(input);
      expect(tools).toHaveLength(1);
      expect(tools[0].function.name).toBe("fetch_url");
      expect(JSON.parse(tools[0].function.arguments).url).toBe("https://github.com/aaronmarchant96-max/family-archive");
    });

    it("extracts in-text <tool_call> JSON tags from content", () => {
      const input = {
        content: `
          <tool_call>{"name": "fetch_url", "arguments": {"url": "https://example.com/api"}}</tool_call>
        `
      };
      const tools = extractToolCalls(input);
      expect(tools).toHaveLength(1);
      expect(tools[0].function.name).toBe("fetch_url");
    });

    it("returns null when no tool calls are present", () => {
      expect(extractToolCalls({ content: "Just a standard text response" })).toBeNull();
      expect(extractToolCalls(null)).toBeNull();
    });
  });

  describe("AVAILABLE_TOOLS Schema", () => {
    it("declares fetch_url in OpenAI tool format", () => {
      expect(Array.isArray(AVAILABLE_TOOLS)).toBe(true);
      const fetchTool = AVAILABLE_TOOLS.find((t) => t.function?.name === "fetch_url");
      expect(fetchTool).toBeDefined();
      expect(fetchTool.type).toBe("function");
      expect(fetchTool.function.parameters.properties.url).toBeDefined();
      expect(fetchTool.function.parameters.required).toContain("url");
    });
  });
});
