import { render, screen } from "@testing-library/react";
import ActivityTimeline from "./ActivityTimeline.jsx";

test("Activity timeline exposes projection honesty and correlated event summaries", () => {
  render(<ActivityTimeline projections={[{
    schemaVersion: 1,
    requestId: "req-a",
    status: "partial",
    sources: { routing: "present", decision: "missing", evaluation: "present" },
    events: [{
      schemaVersion: 1,
      id: "routing:req-a:routing.request_routed",
      requestId: "req-a",
      timestamp: "2026-01-01T00:00:00Z",
      category: "routing",
      type: "routing.request_routed",
      stage: "route",
      status: "success",
      summary: "Request routed",
      sourceStore: "routing",
      sourceRecordId: "routing:req-a",
    }],
  }]} />);
  expect(screen.getByText(/partial/i)).toBeInTheDocument();
  expect(screen.getByText("Request routed")).toBeInTheDocument();
  expect(screen.getByText(/Decision: missing/i)).toBeInTheDocument();
  expect(screen.queryByText("req-a")).not.toBeInTheDocument();
});
