import { useState, useEffect, useRef } from "react";

const PIPELINE_STEPS = [
  { letter: "C", label: "Collecting inputs…" },
  { letter: "A", label: "Analyzing patterns…" },
  { letter: "R", label: "Recording the hinge…" },
  { letter: "DO", label: "Preparing the move…" },
];

export default function TypingPipeline() {
  const [activeStep, setActiveStep] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % PIPELINE_STEPS.length);
    }, 1800);
    return () => clearInterval(timerRef.current);
  }, []);

  const current = PIPELINE_STEPS[activeStep];

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "6px",
      padding: "10px 0", fontSize: "11px",
    }}>
      {/* Progress dots */}
      <div style={{ display: "flex", gap: "4px", marginRight: "8px" }}>
        {PIPELINE_STEPS.map((step, i) => (
          <span key={step.letter} style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "22px", height: "22px", borderRadius: "5px",
            background: i < activeStep
              ? "rgba(240,201,101,0.18)"
              : i === activeStep
                ? "rgba(240,201,101,0.25)"
                : "rgba(240,201,101,0.06)",
            border: i < activeStep
              ? "1px solid rgba(240,201,101,0.4)"
              : i === activeStep
                ? "1px solid rgba(240,201,101,0.6)"
                : "1px solid rgba(240,201,101,0.12)",
            color: i < activeStep
              ? "rgba(240,201,101,0.7)"
              : i === activeStep
                ? "var(--amber-text)"
                : "var(--text-dim)",
            fontWeight: 700, fontSize: "10px",
            transition: "all 0.4s ease",
            boxShadow: i === activeStep
              ? "0 0 10px rgba(240,201,101,0.3)"
              : "none",
          }}>
            {i < activeStep ? "✓" : step.letter}
          </span>
        ))}
      </div>

      {/* Current step label */}
      <span style={{
        color: "var(--amber-text)", fontWeight: 600,
        animation: "fadeInStep 0.4s ease",
        minWidth: "140px",
      }}>
        {current.letter} · {current.label}
      </span>
    </div>
  );
}
