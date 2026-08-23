import { buildDecisionReport } from "./buildDecisionReport.js";

describe("buildDecisionReport", () => {
  const sections = {
    Hinge: "Does the sensor reading warrant a shutdown?",
    Facts: "Vibration at 4.2 mm/s, threshold is 4.0.",
    Assumptions: "Sensor is calibrated.",
    Evaluation: "Margin is thin; cost to act is low.",
    ChangeMind: "Calibration evidence would change this.",
    Move: "Shut down for inspection.",
  };

  it("renders every populated section as a markdown heading", () => {
    const report = buildDecisionReport({ sections, domainLabel: "Maintenance" });
    expect(report.markdown).toContain("# CARDO Decision Report");
    expect(report.markdown).toContain("## Hinge\n" + sections.Hinge);
    expect(report.markdown).toContain("## Facts\n" + sections.Facts);
    expect(report.markdown).toContain("## Assumptions\n" + sections.Assumptions);
    expect(report.markdown).toContain("## Evaluation\n" + sections.Evaluation);
    expect(report.markdown).toContain("## What Would Change This\n" + sections.ChangeMind);
    expect(report.markdown).toContain("## Recommended Move\n" + sections.Move);
  });

  it("omits empty sections", () => {
    const report = buildDecisionReport({ sections: { Hinge: "  " } });
    expect(report.markdown).not.toContain("## Facts");
    expect(report.markdown).not.toContain("## Evaluation");
  });

  it("includes the router decision line when provided", () => {
    const report = buildDecisionReport({
      sections,
      routerDecision: { label: "Structured Reasoning", model: "llama-3.3-70b" },
    });
    expect(report.markdown).toContain("**Router:** Structured Reasoning (llama-3.3-70b)");
  });

  it("omits the router line when no router decision is provided", () => {
    const report = buildDecisionReport({ sections });
    expect(report.markdown).not.toContain("**Router:**");
  });

  it("includes the source message section when provided", () => {
    const report = buildDecisionReport({ sections, sourceText: "Should I shut down the pump?" });
    expect(report.markdown).toContain("## Source Message\nShould I shut down the pump?");
  });

  it("includes the domain label and generated date", () => {
    const report = buildDecisionReport({ sections, domainLabel: "Legal", createdAt: new Date("2026-08-04T12:00:00") });
    expect(report.markdown).toContain("**Domain:** Legal");
    expect(report.markdown).toContain("**Generated:** August 4, 2026");
  });

  it("returns printable html with sections and meta", () => {
    const strategicSituation = {
      detected: true,
      players: [{ name: "Finance <script>", role: "budget owner", power: "high" }],
      incentives: [], alternatives: [], falsificationConditions: ["Finance rejects verified savings"],
      convergenceZone: { identified: false },
    };
    const report = buildDecisionReport({
      sections,
      routerDecision: { label: "Structured Reasoning", model: "llama-3.3-70b" },
      domainLabel: "Legal",
      strategicSituation,
    });
    expect(report.html).toContain("<!doctype html>");
    expect(report.html).toContain("CARDO Decision Report");
    expect(report.html).toContain(">Hinge</h2>");
    expect(report.html).toContain("Structured Reasoning (llama-3.3-70b)");
    expect(report.html).toContain("Legal");
    expect(report.markdown).toContain("## Strategic Situation");
    expect(report.markdown).toContain("## Candidate Convergence\nNo feasible convergence identified");
    expect(report.html).toContain("Finance &lt;script&gt;");
    expect(report.html).not.toContain("Finance <script>");
  });

  it("defaults domain label to REI.ai", () => {
    const report = buildDecisionReport({ sections });
    expect(report.markdown).toContain("**Domain:** REI.ai");
    expect(report.filename).toMatch(/^cardo-decision-\d+\.md$/);
  });
});
