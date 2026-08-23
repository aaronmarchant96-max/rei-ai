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
            <span className={`rei-activity-status is-${projection.status}`}>{projection.status}</span>
          </summary>
          <div className="rei-activity-sources">
            Routing: {projection.sources.routing} · Decision: {projection.sources.decision} · Evaluation: {projection.sources.evaluation}
          </div>
          <ol>
            {projection.events.map((event) => (
              <li key={event.id}>
                <span className="rei-activity-event-dot" aria-hidden="true" />
                <span>{event.summary}</span>
                <small>{event.category}</small>
              </li>
            ))}
          </ol>
        </details>
      ))}
    </div>
  );
}
