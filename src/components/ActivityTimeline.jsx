function formatRisk(failureRisk) {
  if (typeof failureRisk !== "number") return "unavailable";
  return `${(failureRisk * 100).toFixed(1)}%`;
}

function formatInterval(interval) {
  if (!interval || typeof interval.low !== "number" || typeof interval.high !== "number") return null;
  return `${(interval.low * 100).toFixed(1)}–${(interval.high * 100).toFixed(1)}%`;
}

export default function ActivityTimeline({ projections = [] }) {
  if (!projections.length) {
    return <div className="rei-side-empty">No recorded activity yet.</div>;
  }

  return (
    <div className="rei-activity-timeline" aria-label="Activity decision ledger">
      {projections.map((projection, index) => (
        <details className="rei-activity-group" key={projection.requestId} open={index === projections.length - 1}>
          <summary>
            <span>Request {index + 1}</span>
            <span className={`rei-activity-status is-delivery-${projection.delivery ?? "unknown"}`}>
              {projection.delivery ?? "unknown"}
            </span>
          </summary>
          <div className="rei-activity-sources">
            Delivery: {projection.delivery ?? "unknown"} · Evidence: {projection.status} · Routing: {projection.sources.routing} · Decision: {projection.sources.decision} · Evaluation: {projection.sources.evaluation}
          </div>
          <ol>
            {projection.events.map((event) => (
              <li key={event.id}>
                <span className="rei-activity-event-dot" aria-hidden="true" />
                <span>{event.summary}</span>
                <small>{event.category}</small>
                {event.category === "prediction" && event.details && (
                  <small className="rei-activity-event-detail">
                    Delivery risk: {formatRisk(event.details.failureRisk)}
                    {" · "}Support: {event.details.support}
                    {formatInterval(event.details.riskInterval95) ? ` · 95% interval: ${formatInterval(event.details.riskInterval95)}` : ""}
                    {" · "}Evidence: {event.details.evidenceQuality}
                  </small>
                )}
              </li>
            ))}
          </ol>
        </details>
      ))}
    </div>
  );
}
