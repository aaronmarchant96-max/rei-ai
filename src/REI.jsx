import { useState } from "react";

const DOMAIN_PROFILES = [
  {
    id: "genealogy",
    label: "Genealogy",
    badge: "Active",
    description: "Family Archive data pipeline managing 117 profiles and 73 documents.",
    rules: ["Parent age min: 13", "Mother age max: 55", "Father age max: 80"],
    exemplar: "Thomas Ramsey same-name disambiguation profile separation."
  },
  {
    id: "llm",
    label: "LLM Arena",
    badge: "Active",
    description: "Adversarial testing harness probing prompt injections and semantic leakage.",
    rules: ["Control/poison run isolation", "Verbatim snippet extraction checks"],
    exemplar: "Case 006 poisoned context resistance analysis."
  },
  {
    id: "debate",
    label: "Debate Furnace",
    badge: "Active",
    description: "Orchestration layer evaluating arguments under custom heat profiles.",
    rules: ["Verdict compass mapping", "Decision path classification"],
    exemplar: "Balanced/Aggressive topic profile weight comparisons."
  },
  {
    id: "risk",
    label: "CARDO GUARD",
    badge: "Active",
    description: "Expected cost evaluator gating action on model confidence scores.",
    rules: ["Action Waste = Cost * False Alarm Rate", "Miss Loss = Cost * (1 - False Alarm)"],
    exemplar: "Reroute decision expected cost margin analysis."
  }
];

export default function REI() {
  const [selectedDomain, setSelectedDomain] = useState("genealogy");
  const [proofInput, setProofInput] = useState("");
  const [claimInput, setClaimInput] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationOutput, setEvaluationOutput] = useState(null);

  const currentDomain = DOMAIN_PROFILES.find((d) => d.id === selectedDomain) || DOMAIN_PROFILES[0];

  function runREIEvaluation() {
    if (!proofInput.trim() || !claimInput.trim()) {
      alert("Please provide inputs in both the Proof and Claim panels to run the evaluation.");
      return;
    }

    setIsEvaluating(true);
    setEvaluationOutput(null);

    // Simulate terminal execution of Hinge AI engine
    setTimeout(() => {
      // Basic rule-based dynamic evaluation matching inputs
      const proofLower = proofInput.toLowerCase();
      const claimLower = claimInput.toLowerCase();

      // Find keywords in proof and claim to calculate a mock delta/confidence
      const hasPrimary = proofLower.includes("primary") || proofLower.includes("original") || proofLower.includes("certified");
      const hasInconsistency = claimLower.includes("always") || claimLower.includes("never") || (claimLower.length > proofLower.length * 1.5);
      
      let score = 70; // baseline
      if (hasPrimary) score += 15;
      if (hasInconsistency) score -= 10;
      score = Math.max(55, Math.min(97, score));

      // Extract unburned claims (simulated delta)
      const claimsList = [];
      if (!proofLower.includes("marriage") && claimLower.includes("marriage")) {
        claimsList.push("Assertion of marriage date is unsupported by the provided source context.");
      }
      if (claimLower.length > proofLower.length) {
        claimsList.push("Claim introduces detail extensions not explicitly present in the proof trail.");
      }
      if (claimsList.length === 0) {
        claimsList.push("No obvious unburned claims identified; the claim stays within context boundaries.");
      }

      const mockJSONResult = {
        meta: {
          engine: "REI-Hinge-Core v0.3",
          domain: selectedDomain,
          timestamp: new Date().toISOString(),
          delta_check: "passed"
        },
        evaluation: {
          confidence_score: `${score}%`,
          decision_hinge: `Whether the proof bounds explicitly confirm the assertions in the claim or leave critical gaps in evidence.`,
          unburned_claims: claimsList,
          limitations: [
            "REI does not forecast or assume missing links.",
            "Evaluation depends entirely on user-provided proof context.",
            "Always enforce the human verification gate before pushing rules."
          ]
        }
      };

      setEvaluationOutput(mockJSONResult);
      setIsEvaluating(false);
    }, 900);
  }

  return (
    <section className="rei-dashboard-wrapper" style={{ background: "#05161C", color: "#E2E8F0", fontFamily: "Inter, sans-serif", minHeight: "100vh", padding: "20px" }}>
      
      {/* 4A. Minimalist Header */}
      <header className="rei-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1A4B5C", paddingBottom: "16px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Owl/Balance SVG Logo (Midnight Teal & Amber) */}
          <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="REI owl logo">
            <circle cx="50" cy="50" r="45" fill="#0B2B36" stroke="#1A4B5C" strokeWidth="3" />
            <polygon points="35,65 50,45 65,65" fill="#FFB300" />
            <circle cx="40" cy="40" r="6" fill="#FFB300" />
            <circle cx="60" cy="40" r="6" fill="#FFB300" />
            <line x1="50" y1="25" x2="50" y2="45" stroke="#1A4B5C" strokeWidth="4" />
          </svg>
          <div>
            <h1 style={{ fontSize: "1.5em", fontWeight: "bold", margin: 0, letterSpacing: "-0.5px" }}>REI</h1>
            <p style={{ fontSize: "0.8em", color: "#94A3B8", margin: 0 }}>Methodology-First Evaluation Engine</p>
          </div>
        </div>

        {/* Domain selection badge strip */}
        <div style={{ display: "flex", gap: "8px" }}>
          {DOMAIN_PROFILES.map((dom) => (
            <button
              key={dom.id}
              type="button"
              onClick={() => setSelectedDomain(dom.id)}
              style={{
                background: selectedDomain === dom.id ? "#0B2B36" : "transparent",
                color: selectedDomain === dom.id ? "#FFB300" : "#94A3B8",
                border: "1px solid",
                borderColor: selectedDomain === dom.id ? "#FFB300" : "#1A4B5C",
                padding: "6px 12px",
                borderRadius: "4px",
                fontSize: "0.8em",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {dom.label}
            </button>
          ))}
        </div>
      </header>

      {/* Domain Context Information Bar */}
      <div style={{ background: "#0B2B36", border: "1px solid #1A4B5C", padding: "12px 16px", borderRadius: "6px", marginBottom: "24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <span style={{ fontSize: "0.75em", textTransform: "uppercase", color: "#FFB300", fontWeight: "bold", display: "block" }}>Active Domain Description</span>
          <span style={{ fontSize: "0.9em" }}>{currentDomain.description}</span>
        </div>
        <div style={{ display: "flex", gap: "24px" }}>
          <div>
            <span style={{ fontSize: "0.75em", textTransform: "uppercase", color: "#FFB300", fontWeight: "bold", display: "block" }}>Validation Rules</span>
            <span style={{ fontSize: "0.9em", color: "#94A3B8" }}>{currentDomain.rules.join(" | ")}</span>
          </div>
          <div>
            <span style={{ fontSize: "0.75em", textTransform: "uppercase", color: "#FFB300", fontWeight: "bold", display: "block" }}>Grounding Exemplar</span>
            <span style={{ fontSize: "0.9em", color: "#94A3B8" }}>{currentDomain.exemplar}</span>
          </div>
        </div>
      </div>

      {/* 4B. The Split Workspace */}
      <div className="rei-workspace" style={{ display: "flex", gap: "20px", marginBottom: "24px", position: "relative" }}>
        {/* Left Pane (The Proof) */}
        <div className="rei-pane" style={{ flex: 1, background: "#0B2B36", border: "1px solid #1A4B5C", padding: "16px", borderRadius: "8px", display: "flex", flexDirection: "column" }}>
          <div style={{ borderBottom: "1px solid #1A4B5C", paddingBottom: "8px", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: "bold", fontSize: "0.9em", letterSpacing: "0.5px" }}>LEFT PANE: THE PROOF</span>
            <span style={{ fontSize: "0.75em", color: "#94A3B8" }}>Context / Source Telemetry</span>
          </div>
          <textarea
            value={proofInput}
            onChange={(e) => setProofInput(e.target.value)}
            placeholder="Input raw context, documents, transcripts, or radar telemetry here..."
            style={{
              flex: 1,
              minHeight: "180px",
              background: "#05161C",
              color: "#E2E8F0",
              border: "1px solid #1A4B5C",
              borderRadius: "4px",
              padding: "12px",
              fontFamily: "JetBrains Mono, Fira Code, monospace",
              fontSize: "0.9em",
              resize: "vertical"
            }}
          />
        </div>

        {/* The Center Evaluation Button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 10 }}>
          <button
            type="button"
            onClick={runREIEvaluation}
            disabled={isEvaluating}
            style={{
              background: "#FFB300",
              color: "#05161C",
              border: "none",
              borderRadius: "50%",
              width: "70px",
              height: "70px",
              fontWeight: "bold",
              fontSize: "0.9em",
              cursor: "pointer",
              boxShadow: "0 0 15px rgba(255, 179, 0, 0.4)",
              transition: "transform 0.2s ease, background 0.2s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center"
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.08)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)"}
          >
            <span style={{ fontSize: "1.4em", marginBottom: "-4px" }}>⚡</span>
            <span style={{ fontSize: "0.7em", fontWeight: "900" }}>{isEvaluating ? "..." : "REI"}</span>
          </button>
        </div>

        {/* Right Pane (The Claim) */}
        <div className="rei-pane" style={{ flex: 1, background: "#0B2B36", border: "1px solid #1A4B5C", padding: "16px", borderRadius: "8px", display: "flex", flexDirection: "column" }}>
          <div style={{ borderBottom: "1px solid #1A4B5C", paddingBottom: "8px", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: "bold", fontSize: "0.9em", letterSpacing: "0.5px" }}>RIGHT PANE: THE CLAIM</span>
            <span style={{ fontSize: "0.75em", color: "#94A3B8" }}>Consensus / Theory / Text</span>
          </div>
          <textarea
            value={claimInput}
            onChange={(e) => setClaimInput(e.target.value)}
            placeholder="Input generated text, consensus assertions, or theories to evaluate..."
            style={{
              flex: 1,
              minHeight: "180px",
              background: "#05161C",
              color: "#E2E8F0",
              border: "1px solid #1A4B5C",
              borderRadius: "4px",
              padding: "12px",
              fontFamily: "JetBrains Mono, Fira Code, monospace",
              fontSize: "0.9em",
              resize: "vertical"
            }}
          />
        </div>
      </div>

      {/* 4C. The Output Console */}
      <section className="rei-output-console" style={{ background: "#0B2B36", border: "1px solid #1A4B5C", padding: "20px", borderRadius: "8px" }}>
        <div style={{ borderBottom: "1px solid #1A4B5C", paddingBottom: "8px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: "bold", fontSize: "0.95em", letterSpacing: "0.5px" }}>EVALUATION CONSOLE OUTPUT</span>
          <span style={{ fontSize: "0.8em", color: "#FFB300", fontFamily: "monospace" }}>cfai --evaluate</span>
        </div>

        {evaluationOutput ? (
          <div style={{ background: "#05161C", border: "1px solid #1A4B5C", padding: "16px", borderRadius: "4px", fontFamily: "JetBrains Mono, Fira Code, monospace" }}>
            {/* Score Delta */}
            <div style={{ marginBottom: "16px" }}>
              <span style={{ color: "#94A3B8", fontSize: "0.8em", display: "block" }}>CONFIDENCE DELTA SCORE</span>
              <span style={{ fontSize: "2.2em", fontWeight: "bold", color: "#FFB300" }}>{evaluationOutput.evaluation.confidence_score}</span>
            </div>

            {/* Decision Hinge */}
            <div style={{ marginBottom: "16px" }}>
              <span style={{ color: "#94A3B8", fontSize: "0.8em", display: "block" }}>DECISION HINGE</span>
              <p style={{ color: "#E2E8F0", margin: "4px 0 0 0", fontSize: "0.95em" }}>{evaluationOutput.evaluation.decision_hinge}</p>
            </div>

            {/* Unburned Claims */}
            <div style={{ marginBottom: "16px" }}>
              <span style={{ color: "#94A3B8", fontSize: "0.8em", display: "block" }}>UNBURNED CLAIMS (DELTA GAP)</span>
              <ul style={{ color: "#E2E8F0", margin: "6px 0 0 0", paddingLeft: "20px", fontSize: "0.9em" }}>
                {evaluationOutput.evaluation.unburned_claims.map((claim, idx) => (
                  <li key={idx} style={{ marginBottom: "4px" }}>{claim}</li>
                ))}
              </ul>
            </div>

            {/* Raw JSON Stream Output */}
            <details style={{ marginTop: "20px", borderTop: "1px dashed #1A4B5C", paddingTop: "12px" }}>
              <summary style={{ color: "#94A3B8", fontSize: "0.8em", cursor: "pointer", outline: "none" }}>Show Raw Response JSON</summary>
              <pre style={{ fontSize: "0.85em", color: "#94A3B8", overflowX: "auto", marginTop: "10px", background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "4px" }}>
                <code>{JSON.stringify(evaluationOutput, null, 2)}</code>
              </pre>
            </details>

            {/* Slate Grey Limitations Block */}
            <div style={{ borderTop: "1px solid #1A4B5C", marginTop: "20px", paddingTop: "12px", color: "#94A3B8", fontSize: "0.75em" }}>
              {evaluationOutput.evaluation.limitations.map((limit, idx) => (
                <div key={idx} style={{ marginBottom: "2px" }}>• {limit}</div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", color: "#94A3B8" }}>
            <span style={{ fontSize: "2.5em", marginBottom: "10px" }}>⏳</span>
            <span style={{ fontFamily: "JetBrains Mono, Fira Code, monospace", fontSize: "0.9em" }}>
              {isEvaluating ? "Executing REI verification engine..." : "Awaiting input trigger. Input Proof and Claim, then ignite the Hinge."}
            </span>
          </div>
        )}
      </section>
    </section>
  );
}
