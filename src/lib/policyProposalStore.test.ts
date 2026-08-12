import {
  upsertProposals,
  dismissProposal,
  acceptProposal,
  rejectProposal,
  markImplemented,
  getProposals,
  clearProposals,
} from "./policyProposalStore";
import type { PolicyProposal } from "./policyProposalEngine";

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

describe("policyProposalStore", () => {
  it("stores new proposals with status proposed + createdAt", () => {
    upsertProposals([proposal("p1")]);
    const stored = getProposals();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe("p1");
    expect(stored[0].status).toBe("proposed");
    expect(typeof stored[0].createdAt).toBe("string");
  });

  it("is idempotent — regenerating the same proposal does not duplicate it", () => {
    upsertProposals([proposal("p1")]);
    upsertProposals([proposal("p1")]);
    expect(getProposals()).toHaveLength(1);
  });

  it("keeps a dismissed proposal dismissed across regeneration", () => {
    upsertProposals([proposal("p1")]);
    dismissProposal("p1");
    upsertProposals([proposal("p1")]);
    const stored = getProposals();
    expect(stored).toHaveLength(1);
    expect(stored[0].status).toBe("dismissed");
  });

  it("caps the store at 100 entries, dropping the oldest first", () => {
    const many: PolicyProposal[] = [];
    for (let i = 0; i < 105; i++) many.push(proposal(`p${i}`));
    upsertProposals(many);
    const stored = getProposals();
    expect(stored).toHaveLength(100);
    const ids = stored.map((p) => p.id);
    expect(ids).not.toContain("p0");
    expect(ids).toContain("p104");
  });

  it("clearProposals empties the store", () => {
    upsertProposals([proposal("p1")]);
    clearProposals();
    expect(getProposals()).toEqual([]);
  });

  it("survives corrupted storage (returns empty array)", () => {
    localStorage.setItem("rei_policy_proposals", "{{not json");
    expect(getProposals()).toEqual([]);
  });

  it("acceptProposal records reviewedAt and sets accepted (precision numerator)", () => {
    upsertProposals([proposal("p1")]);
    acceptProposal("p1");
    const stored = getProposals();
    expect(stored[0].status).toBe("accepted");
    expect(typeof stored[0].reviewedAt).toBe("string");
  });

  it("rejectProposal records reviewedAt and sets rejected (reviewed denominator)", () => {
    upsertProposals([proposal("p1")]);
    rejectProposal("p1");
    const stored = getProposals();
    expect(stored[0].status).toBe("rejected");
    expect(typeof stored[0].reviewedAt).toBe("string");
  });

  it("markImplemented requires accepted and stores the value note", () => {
    upsertProposals([proposal("p1")]);
    // Cannot implement a proposed proposal — disposition lifecycle enforced.
    markImplemented("p1", "baseline 0.0041 → post 0.0020");
    expect(getProposals()[0].status).toBe("proposed");

    acceptProposal("p1");
    markImplemented("p1", "baseline 0.0041 → post 0.0020");
    const stored = getProposals();
    expect(stored[0].status).toBe("implemented");
    expect(stored[0].valueNote).toBe("baseline 0.0041 → post 0.0020");
    expect(typeof stored[0].implementedAt).toBe("string");
  });

  it("rejected proposals stay rejected across regeneration (human disposition is durable)", () => {
    upsertProposals([proposal("p1")]);
    rejectProposal("p1");
    upsertProposals([proposal("p1")]);
    expect(getProposals()[0].status).toBe("rejected");
  });
});
