/**
 * Generalist Executive Decision Quality Evaluator & Test Suite.
 *
 * Evaluates responses to complex executive/ethical decision dilemmas under uncertainty
 * across four explicit behavioral dimensions:
 * 1. Epistemic Rigor (rejects mathematical fallacies like FNR -> overall accuracy; identifies missing variables)
 * 2. Decision Quality (rejects false binaries; requires bounded/reversible options & rollback criteria)
 * 3. Actionability (identifies 8-month runway gap, proposes funding bridge, defines safeguards)
 * 4. Human / Political Intelligence (addresses Ethics Lead, Investors, Hospitals, and Founder moral burden)
 */

export function evaluateExecutiveResponse(text) {
  const content = String(text || "");

  // 1. Epistemic Rigor Checks
  const epistemicIssues = [];
  
  // Negative check: mathematically fallacious inference (FNR subtracted from 100% claimed as overall accuracy)
  if (
    /0\.7%\s*(?:false[- ]negative|fnr).*?(?:means|implies|equals|gives)\s*(?:93\.3%|99\.3%)\s*(?:overall\s*)?accuracy/i.test(
      content
    ) ||
    /false[- ]negative rate.*?(?:means|equals|defines)\s*accuracy/i.test(content)
  ) {
    epistemicIssues.push("Invalid mathematical inference: false-negative rate cannot be subtracted from 100% to claim overall subgroup accuracy.");
  }

  // Positive check: identifies missing quantitative context (prevalence, sensitivity, specificity, or volume)
  const mentionsMissingVars = /prevalence|sensitivity|specificity|patient volume|baseline/i.test(content);
  if (!mentionsMissingVars) {
    epistemicIssues.push("Missing quantitative context: must identify unstated variables (prevalence, sensitivity, or specificity) required for risk calculation.");
  }

  // 2. Decision Quality Checks
  const decisionIssues = [];
  const hasFalseBinary = /only\s+two\s+(?:choices|options)|binary\s+choice\s+between\s+launching\s+and\s+retraining/i.test(content);
  if (hasFalseBinary) {
    decisionIssues.push("Decision framing failure: treated problem as a false binary instead of a bounded mechanism-design problem.");
  }

  const hasReversibleOption = /reversible|bounded|phased|staged deployment|human-in-the-loop/i.test(content);
  if (!hasReversibleOption) {
    decisionIssues.push("Missing bounded/reversible pathway: must offer a phased or bounded deployment option.");
  }

  const hasRollbackCriteria = /stop\s+criteria|rollback|circuit breaker|threshold|pause deployment/i.test(content);
  if (!hasRollbackCriteria) {
    decisionIssues.push("Missing stop/rollback criteria: must define explicit conditions to pause or roll back deployment.");
  }

  // 3. Actionability Checks
  const actionabilityIssues = [];
  const mentionsFundingGap = /8[- ]month|runway gap|6 months vs 14|funding gap|bridge/i.test(content);
  if (!mentionsFundingGap) {
    actionabilityIssues.push("Unresolved financial contradiction: failed to address the 8-month runway gap (6mo runway vs 14mo retraining).");
  }

  const mentionsBridgeMechanism = /prepayment|milestone|grant|strategic partnership|burn reduction|bridge funding/i.test(content);
  if (!mentionsBridgeMechanism) {
    actionabilityIssues.push("Missing financial bridge: failed to propose concrete funding mechanisms (prepayments, milestone capital, grants).");
  }

  const mentionsSafeguards = /secondary review|human-in-the-loop|mandatory physician|human review/i.test(content);
  if (!mentionsSafeguards) {
    actionabilityIssues.push("Missing review safeguards: failed to specify mandatory human secondary review for the affected subgroup.");
  }

  // 4. Human / Political Intelligence Checks
  const humanIntelIssues = [];

  const addressesEthics = /ethics\s+lead|ethics/i.test(content);
  const addressesInvestors = /investors?|board/i.test(content);
  const addressesHospitals = /hospitals?|partners?|clinical/i.test(content);
  const acknowledgesMoralBurden = /moral|burden|residual|live with it|personal responsibility/i.test(content);

  if (!addressesEthics) humanIntelIssues.push("Missing stakeholder alignment: failed to address the Ethics Lead.");
  if (!addressesInvestors) humanIntelIssues.push("Missing stakeholder alignment: failed to address Investors.");
  if (!addressesHospitals) humanIntelIssues.push("Missing stakeholder alignment: failed to address Hospital Partners.");
  if (!acknowledgesMoralBurden) humanIntelIssues.push("Missing human dimension: failed to acknowledge the founder's residual moral burden.");

  const epistemicPassed = epistemicIssues.length === 0;
  const decisionPassed = decisionIssues.length === 0;
  const actionabilityPassed = actionabilityIssues.length === 0;
  const humanIntelPassed = humanIntelIssues.length === 0;

  return {
    passed: epistemicPassed && decisionPassed && actionabilityPassed && humanIntelPassed,
    dimensions: {
      epistemicRigor: { passed: epistemicPassed, issues: epistemicIssues },
      decisionQuality: { passed: decisionPassed, issues: decisionIssues },
      actionability: { passed: actionabilityPassed, issues: actionabilityIssues },
      humanIntelligence: { passed: humanIntelPassed, issues: humanIntelIssues },
    },
  };
}

describe("Generalist Executive Decision Quality Evaluator", () => {
  const goldStandardResponse = `
### HINGE
Whether you can construct a launch that is reversible and bounded enough to capture immediate clinical benefit without pretending the subgroup risk is solved.

### EPISTEMIC CONTEXT & MISSING VARIABLES
A 0.7% false-negative rate disparity means a difference in sensitivity (1 - FNR), NOT 99.3% overall subgroup accuracy. True accuracy depends on unstated variables: disease prevalence, baseline diagnostic accuracy, and patient volume in the affected subgroup.

### REVERSIBLE MECHANISM DESIGN & ROLLBACK CRITERIA
Avoid the false binary of "unrestricted launch next week vs. wait 14 months for full retraining". 
Deploy a phased, bounded rollout where the AI acts strictly as a secondary assistant. 
- **Safeguard**: Mandatory human secondary review for all cases in the affected patient subgroup.
- **Explicit Stop Criteria**: Pause deployment immediately if post-launch audit shows subgroup discrepancy exceeds a 0.5% threshold.

### 8-MONTH FUNDING GAP & FINANCIAL BRIDGE
Your 6-month runway vs. 14-month retraining timeline leaves an 8-month runway gap. 
To bridge this gap:
1. Negotiate hospital prepayments for the bounded assistant deployment.
2. Secure milestone-based capital tied to the retrained v2 model.
3. Apply for strategic clinical research grants and execute targeted burn reduction.

### STAKEHOLDER ALIGNMENT SCRIPTS
- **Ethics Lead**: "I am not asking you to bless the disparity. Help us design the bounded human-review safeguard so no subgroup patient is left unreviewed. If these safeguards cannot be made credible, we do not launch."
- **Investors**: "An unrestricted launch creates catastrophic regulatory, legal, and reputational tail risk. We launch under a controlled protocol with mandatory subgroup human review and committed milestone funding for retraining."
- **Hospitals**: "You get access now as an augmented tool, but the affected subgroup remains under mandatory human-in-the-loop secondary review."
- **Founder Residual Moral Burden**: As founder, you retain the final residual moral responsibility for setting explicit safety boundaries and holding the line.
`;

  const negativeControlBadMath = `
### HINGE
Whether to launch now to save the company or delay 14 months to fix the subgroup error.

### EVALUATION
A 0.7% false-negative rate in the subgroup means 99.3% accuracy in that subgroup, which is still very high. The quantitative evidence vastly outweighs the potential harm. We should launch immediately with a disclaimer.
Investors want access now, and the 6 months runway means we have no choice.
`;

  const negativeControlGenericSafeguards = `
### HINGE
Whether to launch now or wait.

### EVALUATION
A 0.7% false-negative rate disparity requires attention.
Prevalence and sensitivity data are needed to calculate exact risks.
We recommend you deploy with safeguards for the ethics lead, investors, and hospitals.
`;

  it("passes a complete gold-standard response across all 4 dimensions", () => {
    const result = evaluateExecutiveResponse(goldStandardResponse);
    expect(result.passed).toBe(true);
    expect(result.dimensions.epistemicRigor.passed).toBe(true);
    expect(result.dimensions.decisionQuality.passed).toBe(true);
    expect(result.dimensions.actionability.passed).toBe(true);
    expect(result.dimensions.humanIntelligence.passed).toBe(true);
  });

  it("fails Negative Control 1 on Epistemic Rigor due to bad math inference", () => {
    const result = evaluateExecutiveResponse(negativeControlBadMath);
    expect(result.passed).toBe(false);
    expect(result.dimensions.epistemicRigor.passed).toBe(false);
    expect(result.dimensions.epistemicRigor.issues).toContain(
      "Invalid mathematical inference: false-negative rate cannot be subtracted from 100% to claim overall subgroup accuracy."
    );
  });

  it("fails Negative Control 2 on Actionability and Human Intelligence due to generic hand-waving", () => {
    const result = evaluateExecutiveResponse(negativeControlGenericSafeguards);
    expect(result.passed).toBe(false);
    expect(result.dimensions.actionability.passed).toBe(false);
    expect(result.dimensions.humanIntelligence.passed).toBe(false);
    expect(result.dimensions.actionability.issues).toContain(
      "Unresolved financial contradiction: failed to address the 8-month runway gap (6mo runway vs 14mo retraining)."
    );
  });
});
