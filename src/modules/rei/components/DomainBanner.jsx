export default function DomainBanner({ currentDomain, selectedDomain, reasoningLoopSteps }) {
  return (
    <div className="rei-domain-banner">
      <div className="rei-domain-banner__eyebrow">Active Voice</div>
      <div className="rei-domain-banner__row">
        <div className="rei-domain-banner__meta">
          <span className="rei-domain-banner__label">Mode:</span>
          <span>{currentDomain.description}</span>
        </div>
        <div className="rei-domain-banner__meta rei-domain-banner__meta--secondary">
          <span className="rei-domain-banner__label">Voice cues:</span>
          <span>{currentDomain.rules.join(" | ")}</span>
        </div>
      </div>
      {selectedDomain === "assistant" && (
        <>
          <div className="rei-reasoning-loop">
            {reasoningLoopSteps.map((step) => (
              <div key={step.id} className="rei-reasoning-loop__step">
                <span className="rei-reasoning-loop__label">{step.label}</span>
                <span className="rei-reasoning-loop__detail">{step.detail}</span>
              </div>
            ))}
          </div>
          <div className="rei-domain-banner__steps">
            {["Collect", "Analyze", "Record", "Distinguish", "Organize", "Review", "Evaluate", "Iterate"].map((step) => (
              <span key={step} className="rei-domain-banner__step">
                {step}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
