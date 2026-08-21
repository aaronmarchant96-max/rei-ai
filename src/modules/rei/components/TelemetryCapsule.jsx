export default function TelemetryCapsule({ evidence, onInspect }) {
  if (!evidence) return null;

  const { routerDecision, economics, route, routeRationale } = evidence;
  const routeLabel = routerDecision?.label || routerDecision?.id || route || routeRationale?.classification || "Decision recorded";

  const rawCost = economics?.observedCostUsd != null
    ? economics.observedCostUsd
    : (routerDecision?.estimatedCost != null && routerDecision.estimatedCost > 0
        ? routerDecision.estimatedCost
        : (evidence.estimatedCost != null && evidence.estimatedCost > 0 ? evidence.estimatedCost : null));

  const formattedCost = rawCost != null && rawCost > 0
    ? `$${rawCost < 0.0001 ? rawCost.toFixed(5) : rawCost.toFixed(4)}`
    : null;

  return (
    <div className="rei-decision-badge" aria-label={`Decision proof: ${routeLabel}`}>
      <span className="rei-decision-badge__route">{routeLabel}</span>
      {formattedCost && (
        <>
          <span className="rei-decision-badge__dot" aria-hidden="true">·</span>
          <span className="rei-decision-badge__cost mono">{formattedCost}</span>
        </>
      )}
      <span className="rei-decision-badge__dot" aria-hidden="true">·</span>
      <button
        type="button"
        onClick={() => onInspect && onInspect(evidence)}
        className="rei-decision-badge__inspect-btn"
        aria-label={`Inspect decision for ${routeLabel}`}
      >
        Inspect ›
      </button>
    </div>
  );
}
