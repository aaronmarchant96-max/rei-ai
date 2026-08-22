import { useState, useEffect } from "react";
import { Terminal, Code, Play, Check, Copy, Shield, Cpu, ExternalLink, Zap } from "lucide-react";

export default function PilotOnboarding() {
  const [copiedSection, setCopiedSection] = useState(null);
  const [healthStatus, setHealthStatus] = useState({ loading: true, ready: false });
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const baseUrl = "https://prompthound-labs.vercel.app/api/v1";
  const defaultKey = "rei_key_pilot_demo";

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setHealthStatus({ loading: false, ready: data.status === "ready", data });
      })
      .catch(() => {
        setHealthStatus({ loading: false, ready: false });
      });
  }, []);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const runTestRequest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${defaultKey}`
        },
        body: JSON.stringify({
          model: "rei-auto",
          messages: [{ role: "user", content: "Explain how CARDO REI finds the core hinge of a problem in 1 short sentence." }]
        })
      });
      const data = await res.json();
      setTestResult({ status: res.status, ok: res.ok, data });
    } catch (err) {
      setTestResult({ status: 500, ok: false, data: { error: { message: err.message } } });
    } finally {
      setTestLoading(false);
    }
  };

  const curlSnippet = `curl -X POST ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer ${defaultKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "rei-auto",
    "messages": [{"role": "user", "content": "Explain this function"}]
  }'`;

  const pythonSnippet = `from openai import OpenAI

client = OpenAI(
    api_key="${defaultKey}",
    base_url="${baseUrl}"
)

response = client.chat.completions.create(
    model="rei-auto",
    messages=[{"role": "user", "content": "Explain this function"}]
)

print(response.choices[0].message.content)
print("Receipt:", response.receipt)`;

  const nodeSnippet = `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "${defaultKey}",
  baseURL: "${baseUrl}",
});

const response = await client.chat.completions.create({
  model: "rei-auto",
  messages: [{ role: "user", content: "Explain this function" }],
});

console.log(response.choices[0].message.content);
console.log("Receipt:", response.receipt);`;

  return (
    <div className="rei-dashboard-wrapper" style={{ padding: "32px 24px", maxWidth: "1100px", margin: "0 auto", color: "var(--text-primary, #f8fafc)" }}>
      {/* Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", paddingBottom: "20px", borderBottom: "1px solid var(--border, #334155)" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(240, 201, 101, 0.12)", border: "1px solid rgba(240, 201, 101, 0.3)", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", fontWeight: 700, color: "var(--amber, #f0c965)", marginBottom: "8px" }}>
            <Cpu size={14} /> Developer Infrastructure & Pilot Gateway
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>OpenAI-Compatible FinOps Gateway</h1>
          <p style={{ margin: "6px 0 0", color: "var(--text-muted, #94a3b8)", fontSize: "14.5px" }}>
            Drop-in proxy executing pre-inference model routing, single-flight coalescing, and auditable delivery receipts.
          </p>
        </div>

        {/* Readiness Badge */}
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: healthStatus.ready ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)", border: `1px solid ${healthStatus.ready ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)"}`, padding: "6px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, color: healthStatus.ready ? "#4ade80" : "#f87171" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: healthStatus.ready ? "#22c55e" : "#ef4444" }}></span>
            {healthStatus.loading ? "Probing Gateway..." : healthStatus.ready ? "Gateway Online (Ready)" : "Degraded"}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-dim, #64748b)", marginTop: "4px" }}>
            Version: {healthStatus.data?.version || "40a244c"} · $0.00 Inference Cost
          </div>
        </div>
      </div>

      {/* ── Founder's Invitation: The Bootstrap Loop 🪝 ── */}
      <div style={{ background: "linear-gradient(135deg, rgba(240, 201, 101, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)", border: "1px solid rgba(240, 201, 101, 0.4)", borderRadius: "12px", padding: "20px 24px", marginBottom: "28px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
        <div style={{ fontSize: "24px", background: "rgba(240, 201, 101, 0.15)", border: "1px solid rgba(240, 201, 101, 0.3)", borderRadius: "10px", width: "42px", height: "42px", display: "flex", alignItems: "center", justifyCenter: "center", flexShrink: 0 }}>
          🪝
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--amber, #f0c965)" }}>The Bootstrap Loop</span>
            <span style={{ fontSize: "10px", fontWeight: 700, background: "rgba(240, 201, 101, 0.2)", color: "var(--amber, #f0c965)", padding: "2px 8px", borderRadius: "10px" }}>C-Activity Flywheel</span>
          </div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 6px 0", color: "#f8fafc" }}>
            Are you going to try using it?
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-muted, #cbd5e1)", lineHeight: "1.6", margin: 0 }}>
            Because the demo is live. And when you throw a prompt at the gateway, you’re not just a user—you’re contributing to the bootstrap loop. Your telemetry makes the router smarter. And the router getting smarter means the next person who uses it gets a better result for less money. <b>That’s the whole point.</b>
          </p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>
        <div style={{ background: "var(--surface-lift, #0f172a)", border: "1px solid var(--border, #334155)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800, color: "var(--amber, #f0c965)", marginBottom: "8px" }}>
            1. Base URL
          </div>
          <div style={{ display: "flex", alignItems: "center", background: "#020617", border: "1px solid #1e293b", borderRadius: "8px", padding: "10px 14px", fontFamily: "monospace", fontSize: "13.5px" }}>
            <span style={{ flexGrow: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{baseUrl}</span>
            <button type="button" onClick={() => copyToClipboard(baseUrl, "url")} style={{ background: "none", border: "none", color: "var(--amber)", cursor: "pointer", padding: "4px" }}>
              {copiedSection === "url" ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted, #94a3b8)", marginTop: "8px", margin: 0 }}>
            Point your Cursor, LangChain, or OpenAI SDK `base_url` to this endpoint.
          </p>
        </div>

        <div style={{ background: "var(--surface-lift, #0f172a)", border: "1px solid var(--border, #334155)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800, color: "var(--amber, #f0c965)", marginBottom: "8px" }}>
            2. Authentication & Pilot Keys
          </div>
          <div style={{ display: "flex", alignItems: "center", background: "#020617", border: "1px solid #1e293b", borderRadius: "8px", padding: "10px 14px", fontFamily: "monospace", fontSize: "13.5px" }}>
            <span style={{ flexGrow: 1 }}>Bearer {defaultKey}</span>
            <button type="button" onClick={() => copyToClipboard(defaultKey, "key")} style={{ background: "none", border: "none", color: "var(--amber)", cursor: "pointer", padding: "4px" }}>
              {copiedSection === "key" ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted, #94a3b8)", marginTop: "8px", margin: 0 }}>
            Includes 100 req/min pilot quota. Custom tenant keys can be requested.
          </p>
        </div>
      </div>

      {/* Drop-In Code Examples */}
      <div style={{ background: "var(--surface-lift, #0f172a)", border: "1px solid var(--border, #334155)", borderRadius: "12px", padding: "24px", marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
            <Terminal size={18} className="text-amber-400" /> Drop-In Integration Code
          </div>
        </div>

        {/* cURL */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", marginBottom: "6px" }}>One-Line cURL</div>
          <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "8px", padding: "14px", fontFamily: "monospace", fontSize: "12.5px", whiteSpace: "pre-wrap", color: "#e2e8f0", position: "relative" }}>
            {curlSnippet}
            <button type="button" onClick={() => copyToClipboard(curlSnippet, "curl")} style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", color: "var(--amber)", cursor: "pointer" }}>
              {copiedSection === "curl" ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Python vs Node Snippets */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", marginBottom: "6px" }}>Python (OpenAI SDK)</div>
            <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "8px", padding: "14px", fontFamily: "monospace", fontSize: "12px", whiteSpace: "pre-wrap", color: "#e2e8f0", position: "relative" }}>
              {pythonSnippet}
              <button type="button" onClick={() => copyToClipboard(pythonSnippet, "python")} style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", color: "var(--amber)", cursor: "pointer" }}>
                {copiedSection === "python" ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", marginBottom: "6px" }}>Node / TypeScript (OpenAI SDK)</div>
            <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "8px", padding: "14px", fontFamily: "monospace", fontSize: "12px", whiteSpace: "pre-wrap", color: "#e2e8f0", position: "relative" }}>
              {nodeSnippet}
              <button type="button" onClick={() => copyToClipboard(nodeSnippet, "node")} style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", color: "var(--amber)", cursor: "pointer" }}>
                {copiedSection === "node" ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Gateway Test & Receipt Inspector */}
      <div style={{ background: "var(--surface-lift, #0f172a)", border: "1px solid var(--border, #334155)", borderRadius: "12px", padding: "24px", marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
              <Zap size={18} className="text-amber-400" /> Interactive Gateway Test & Receipt Inspector
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "var(--text-muted, #94a3b8)" }}>
              Fires a low-cost synthetic prompt to verify gateway routing, finish-reason preservation, and delivery receipts.
            </p>
          </div>

          <button
            type="button"
            onClick={runTestRequest}
            disabled={testLoading}
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "10px 18px", borderRadius: "8px", fontWeight: 700, fontSize: "13px",
              background: "var(--amber, #f0c965)", color: "#0f172a", border: "none", cursor: testLoading ? "wait" : "pointer",
              boxShadow: "0 0 16px rgba(240, 201, 101, 0.25)"
            }}
          >
            {testLoading ? "Running Inference..." : <><Play size={14} fill="#0f172a" /> Fire Test Request</>}
          </button>
        </div>

        {testResult && (
          <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "10px", padding: "16px", marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #1e293b", paddingBottom: "10px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: testResult.ok ? "#4ade80" : "#f87171" }}>
                Status {testResult.status} — {testResult.ok ? "Gateway Execution Success" : "Request Failed"}
              </div>
              {testResult.data?.receipt && (
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                  Policy: <span style={{ color: "var(--amber)" }}>{testResult.data.receipt.savings_policy_version}</span>
                </div>
              )}
            </div>

            {testResult.data?.receipt && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
                <div style={{ background: "#0f172a", padding: "10px", borderRadius: "6px" }}>
                  <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" }}>Observed Spend</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#38bdf8" }}>${testResult.data.receipt.observed_cost_usd}</div>
                </div>
                <div style={{ background: "#0f172a", padding: "10px", borderRadius: "6px" }}>
                  <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" }}>Modeled Difference</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#a855f7" }}>${testResult.data.receipt.modeled_difference_usd}</div>
                </div>
                <div style={{ background: "#0f172a", padding: "10px", borderRadius: "6px" }}>
                  <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" }}>Eligible Savings</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#4ade80" }}>${testResult.data.receipt.eligible_savings_usd}</div>
                </div>
                <div style={{ background: "#0f172a", padding: "10px", borderRadius: "6px" }}>
                  <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" }}>Finish Status</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: testResult.data.receipt.finish_status === "complete" ? "#4ade80" : "#f87171" }}>
                    {testResult.data.receipt.finish_status}
                  </div>
                </div>
              </div>
            )}

            <div style={{ fontSize: "12px", fontFamily: "monospace", color: "#e2e8f0", whiteSpace: "pre-wrap", maxHeight: "250px", overflowY: "auto" }}>
              {JSON.stringify(testResult.data, null, 2)}
            </div>
          </div>
        )}
      </div>

      {/* Data Retention & Security Disclosure */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "rgba(148, 163, 184, 0.06)", border: "1px solid rgba(148, 163, 184, 0.15)", borderRadius: "8px", padding: "14px 18px", fontSize: "12px", color: "#94a3b8" }}>
        <Shield size={18} className="text-amber-400 flex-shrink-0" />
        <div>
          <strong>Data Retention & Privacy Disclosure:</strong> REI.ai operates as a zero-retention gateway. Requests are evaluated for routing features in-memory and dispatched to provider endpoints. Telemetry receipts preserve token counts and cost basis without storing raw prompt contents in durable databases.
        </div>
      </div>
    </div>
  );
}
