import { useState } from "react";
import { normalizePilotTraffic } from "../../lib/pilotIngest/index";
import { buildExecutivePilotReport } from "../../lib/pilotReport";
import { buildAuditMarkdown, buildCanonicalAuditJson } from "../../lib/pilotExport/index";
import { Upload, FileText, CheckCircle2, ShieldCheck, Download, AlertTriangle, ArrowRight } from "lucide-react";

const SAMPLE_PILOT_JSON = JSON.stringify(
  [
    {
      id: "demo-001",
      model: "gpt-4o",
      usage: { prompt_tokens: 240, completion_tokens: 65 },
      messages: [{ role: "user", content: "Extract company names and addresses from this raw text string." }],
      created: 1724626800,
    },
    {
      id: "demo-002",
      model: "gpt-4o",
      usage: { prompt_tokens: 850, completion_tokens: 310 },
      messages: [{ role: "user", content: "Summarize this quarterly earnings transcript into 3 key takeaways." }],
      created: 1724626860,
    },
    {
      id: "demo-003",
      model: "claude-3-5-sonnet-20240620",
      usage: { input_tokens: 1200, output_tokens: 450 },
      messages: [{ role: "user", content: "Refactor this Go function to avoid data races on shared map state." }],
      created: 1724626920,
    },
    {
      id: "demo-004",
      model: "gpt-4o",
      usage: { prompt_tokens: 150, completion_tokens: 25 },
      messages: [{ role: "user", content: "Convert this date string '2026-08-26' to unix epoch timestamp." }],
      created: 1724626980,
    },
    {
      id: "demo-005",
      model: "gpt-4o",
      usage: { prompt_tokens: 100, completion_tokens: 20 },
      // missing routing prompt text (simulates redacted input)
      created: 1724627040,
    },
  ],
  null,
  2
);

export default function PilotWorkspace() {
  const [inputText, setInputText] = useState(SAMPLE_PILOT_JSON);
  const [ingestResult, setIngestResult] = useState(() => normalizePilotTraffic(SAMPLE_PILOT_JSON));

  const report = buildExecutivePilotReport(ingestResult.canonicalRequests);

  const handleRunAudit = () => {
    const res = normalizePilotTraffic(inputText);
    setIngestResult(res);
  };

  const handleDownloadMarkdown = () => {
    const md = buildAuditMarkdown(report);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `REI_Decision_Audit_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
  };

  const handleDownloadJson = () => {
    const json = buildCanonicalAuditJson(report);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `REI_Evidence_Package_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 text-gray-100 font-sans">
      {/* Header */}
      <div className="border-b border-gray-800 pb-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-amber-400" size={32} />
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">REI.ai Customer Pilot Workspace</h1>
            <p className="text-sm text-gray-400">
              Zero-Risk Decision Audit • Counterfactual Log Replay • Prospective Shadow Pilot
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload vs Readiness Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Area (2 Cols) */}
        <div className="lg:col-span-2 space-y-4 bg-gray-900/60 p-5 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Upload size={18} className="text-amber-400" />
              1. Import API Traffic Logs (JSON or CSV)
            </h2>
            <button
              onClick={() => {
                setInputText(SAMPLE_PILOT_JSON);
                setIngestResult(normalizePilotTraffic(SAMPLE_PILOT_JSON));
              }}
              className="text-xs text-amber-400 hover:text-amber-300 underline"
            >
              Load Demo Sample
            </button>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={10}
            className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 font-mono text-xs text-gray-300 focus:outline-none focus:border-amber-500/50"
            placeholder="Paste OpenAI JSON, Anthropic JSON, Gemini JSON, or CSV log rows..."
          />

          <div className="flex justify-end">
            <button
              onClick={handleRunAudit}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm rounded-lg flex items-center gap-2 transition-colors"
            >
              Generate Decision Audit
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Pilot Readiness Checklist (1 Col) */}
        <div className="bg-gray-900/60 p-5 rounded-xl border border-gray-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-gray-400">
            Pilot Readiness Checklist
          </h3>
          <ul className="space-y-2.5 text-xs text-gray-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>1–14 days</strong> of request logs</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Model names</strong> (e.g. gpt-4o, claude-3-5)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Token counts</strong> (input & output tokens)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Routing text</strong> (or structural metadata)</span>
            </li>
            <li className="flex items-start gap-2 text-gray-400">
              <span className="text-amber-400 font-bold">•</span>
              <span><em>Optional:</em> Cached tokens, actual spend, latency</span>
            </li>
          </ul>

          <div className="pt-3 border-t border-gray-800 text-[11px] text-gray-400 space-y-1">
            <p className="font-semibold text-gray-300">Privacy Guarantee:</p>
            <p>Redacted prompts are normalized and counted in the audit denominator, but marked <code className="text-amber-400">replayEligible: false</code> and excluded from savings claims.</p>
          </div>
        </div>
      </div>

      {/* Audit Results Dashboard */}
      {report && (
        <div className="space-y-6">
          {/* Executive Recommendation Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 tracking-wider uppercase mb-1">
                Executive Recommendation • Sufficiency: [{report.sufficiency}]
              </div>
              <h3 className="text-xl font-bold text-white">
                {report.recommendation === "SHADOW_PILOT_RECOMMENDED" && "🚀 14-Day Shadow Pilot Recommended"}
                {report.recommendation === "CONTINUE_DATA_COLLECTION" && "📊 Continue Data Collection"}
                {report.recommendation === "NO_CHANGE_RECOMMENDED" && "✅ No Routing Change Recommended"}
              </h3>
              <p className="text-xs text-gray-300 mt-1">
                {report.recommendation === "SHADOW_PILOT_RECOMMENDED" && "High-confidence evidence indicates routing opportunities exist. Run in Shadow Mode alongside production to observe response quality with zero production risk."}
                {report.recommendation === "CONTINUE_DATA_COLLECTION" && "Sample size or routing text telemetry is limited. Supply complete request traces to compute an auditable replay."}
              </p>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleDownloadMarkdown}
                className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-gray-700 transition-colors"
              >
                <Download size={14} />
                Download Audit (.md)
              </button>
              <button
                onClick={handleDownloadJson}
                className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-gray-700 transition-colors"
              >
                <FileText size={14} />
                Evidence JSON (v2.0)
              </button>
            </div>
          </div>

          {/* 3-Bucket Traffic Segmentation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Bucket 1: Candidate to Shadow */}
            <div className="bg-gray-900/60 p-5 rounded-xl border border-amber-500/40 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400">1. Candidate to Shadow</div>
              <div className="text-2xl font-bold text-white">
                {report.segmentation.candidateToShadow.requestCount} <span className="text-xs font-normal text-gray-400">({report.segmentation.candidateToShadow.pctOfTotal}%)</span>
              </div>
              <p className="text-xs text-gray-400">
                {report.segmentation.candidateToShadow.description}
              </p>
              <div className="pt-2 text-xs text-emerald-400 font-semibold">
                Est. Savings: ${report.segmentation.candidateToShadow.counterfactualMonthlySavingsUSD.toFixed(2)}/mo
              </div>
            </div>

            {/* Bucket 2: Retain Current Tier */}
            <div className="bg-gray-900/60 p-5 rounded-xl border border-gray-800 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400">2. Retain Current Tier</div>
              <div className="text-2xl font-bold text-white">
                {report.segmentation.retainCurrentTier.requestCount} <span className="text-xs font-normal text-gray-400">({report.segmentation.retainCurrentTier.pctOfTotal}%)</span>
              </div>
              <p className="text-xs text-gray-400">
                {report.segmentation.retainCurrentTier.description}
              </p>
              <div className="pt-2 text-xs text-gray-400 font-semibold">
                Est. Savings: $0.00 (Tier Preserved)
              </div>
            </div>

            {/* Bucket 3: Insufficient Evidence */}
            <div className="bg-gray-900/60 p-5 rounded-xl border border-gray-800 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400">3. Insufficient Evidence</div>
              <div className="text-2xl font-bold text-white">
                {report.segmentation.insufficientEvidence.requestCount} <span className="text-xs font-normal text-gray-400">({report.segmentation.insufficientEvidence.pctOfTotal}%)</span>
              </div>
              <p className="text-xs text-gray-400">
                {report.segmentation.insufficientEvidence.description}
              </p>
              <div className="pt-2 text-xs text-gray-500 font-semibold">
                Excluded from Claims
              </div>
            </div>
          </div>

          {/* Denominator Audit & Exclusions Panel */}
          <div className="bg-gray-900/60 p-5 rounded-xl border border-gray-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              Denominator Audit & Exclusions
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="text-gray-400 block">Total Evaluated</span>
                <span className="text-base font-bold text-white">{report.totalRequestsEvaluated}</span>
              </div>
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="text-gray-400 block">Replay-Eligible</span>
                <span className="text-base font-bold text-emerald-400">{report.replayEligibleRequests}</span>
              </div>
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="text-gray-400 block">Excluded Count</span>
                <span className="text-base font-bold text-amber-400">{report.excludedRequests}</span>
              </div>
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <span className="text-gray-400 block">Source Format</span>
                <span className="text-base font-bold text-gray-200 uppercase">{report.provenanceSummary.sources.join(", ")}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
