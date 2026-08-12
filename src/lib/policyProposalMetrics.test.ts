import {
  upsertProposals,
  acceptProposal,
  rejectProposal,
  markImplemented,
  dismissProposal,
  clearProposals,
  getProposals,
} from "./policyProposalStore";
import type { PolicyProposal } from "./policyProposalEngine";
import { computeProposalMetrics } from "./policyProposalMetrics";

function proposal(id: string): PolicyProposal {
  return {
    id,
    signal: "missed-escalation",
    category: "routing",
    title: "t",
    evidence: "e",
    suggestedChange: "s",
    requestIds: [id],
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("computeProposalMetrics", () => {
  it("empty store → zeros, precision and realization null", () => {
    const m = computeProposalMetrics(getProposals());
    expect(m).toEqual({
      total: 0,
      reviewed: 0,
      accepted: 0,
      rejected: 0,
      implemented: 0,
      precision: null,
      realization: null,
      withValue: 0,
    });
  });

  it("precision = accepted / (accepted + rejected), null until first review", () => {
    upsertProposals([proposal("a1"), proposal("a2"), proposal("r1")]);
    // Nothing reviewed yet.
    expect(computeProposalMetrics(getProposals()).precision).toBeNull();

    acceptProposal("a1");
    acceptProposal("a2");
    rejectProposal("r1");
    const m = computeProposalMetrics(getProposals());
    expect(m.total).toBe(3);
    expect(m.reviewed).toBe(3);
    expect(m.accepted).toBe(2);
    expect(m.rejected).toBe(1);
    expect(m.precision).toBe(67);
  });

  it("dismissed proposals are NOT counted as reviews (not accepted nor rejected)", () => {
    upsertProposals([proposal("a1"), proposal("d1")]);
    acceptProposal("a1");
    dismissProposal("d1");
    const m = computeProposalMetrics(getProposals());
    expect(m.reviewed).toBe(1);
    expect(m.precision).toBe(100);
  });

  it("realization = implemented / accepted, null until an accept exists", () => {
    upsertProposals([proposal("a1"), proposal("a2")]);
    expect(computeProposalMetrics(getProposals()).realization).toBeNull();

    acceptProposal("a1");
    acceptProposal("a2");
    expect(computeProposalMetrics(getProposals()).realization).toBe(0);

    markImplemented("a1", "baseline 0.0041 → post 0.0020");
    const m = computeProposalMetrics(getProposals());
    expect(m.implemented).toBe(1);
    expect(m.realization).toBe(50);
  });

  it("withValue counts implemented proposals carrying a value note", () => {
    upsertProposals([proposal("a1"), proposal("a2")]);
    acceptProposal("a1");
    acceptProposal("a2");
    markImplemented("a1", "baseline 0.0041 → post 0.0020");
    markImplemented("a2", "");
    const m = computeProposalMetrics(getProposals());
    expect(m.implemented).toBe(2);
    expect(m.withValue).toBe(1);
  });
});
