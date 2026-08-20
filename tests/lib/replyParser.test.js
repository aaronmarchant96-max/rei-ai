import { parseAssistantStyleReply } from "../../src/lib/replyParser.js";

describe("replyParser: structure-preserving CARDO section extraction", () => {
  it("handles empty or null text safely", () => {
    const res = parseAssistantStyleReply(null);
    expect(res.Hinge).toBe("");
    expect(res.Facts).toBe("");
    expect(res.intro).toBe("");
  });

  it("extracts standard CARDO sections", () => {
    const text = `Here is a summary of the situation.

Hinge: The core issue is whether the database index fits in RAM.
Facts: The working dataset is 4GB and memory allocation is 2GB.
Assumptions: Traffic will remain steady at 500 rps.
Evaluation: Adding RAM is 10x cheaper than optimizing sharding.
Move: Upgrade the instance memory pool to 8GB.`;

    const res = parseAssistantStyleReply(text);
    expect(res.intro).toContain("summary of the situation");
    expect(res.Hinge).toBe("The core issue is whether the database index fits in RAM.");
    expect(res.Facts).toBe("The working dataset is 4GB and memory allocation is 2GB.");
    expect(res.Assumptions).toBe("Traffic will remain steady at 500 rps.");
    expect(res.Evaluation).toBe("Adding RAM is 10x cheaper than optimizing sharding.");
    expect(res.Move).toBe("Upgrade the instance memory pool to 8GB.");
  });

  it("preserves multi-line bullet lists inside sections instead of flattening them", () => {
    const text = `Hinge: The architectural tradeoff.

Facts:
• Serverless functions have 15-second cold starts.
• Provisioned concurrency eliminates cold starts but costs $15/mo.
• Latency SLA is 100ms p99.

Move:
1. Enable provisioned concurrency during peak hours.
2. Monitor memory utilization in Grafana.`;

    const res = parseAssistantStyleReply(text);
    expect(res.Facts).toContain("• Serverless functions have 15-second cold starts.\n• Provisioned concurrency eliminates cold starts but costs $15/mo.\n• Latency SLA is 100ms p99.");
    expect(res.Move).toContain("1. Enable provisioned concurrency during peak hours.\n2. Monitor memory utilization in Grafana.");
  });

  it("preserves bold markdown within section bodies", () => {
    const text = `**The Hinge:** We must choose between **speed** and **safety**.
**Facts:** The team has **zero** experience in Rust.
**Move:** Use TypeScript with strict linter.`;

    const res = parseAssistantStyleReply(text);
    expect(res.Hinge).toBe("We must choose between **speed** and **safety**.");
    expect(res.Facts).toBe("The team has **zero** experience in Rust.");
    expect(res.Move).toBe("Use TypeScript with strict linter.");
  });

  it("handles markdown header variations (###, numbered, emojis)", () => {
    const text = `### ⚡ The Hinge:
The single determining factor.

### Facts:
Observed metric data.

### Move:
Immediate execution step.`;

    const res = parseAssistantStyleReply(text);
    expect(res.Hinge).toBe("The single determining factor.");
    expect(res.Facts).toBe("Observed metric data.");
    expect(res.Move).toBe("Immediate execution step.");
  });

  it("strips thinking tags cleanly before extracting sections", () => {
    const text = `<think>
Internal deliberations on whether this is a database bottleneck...
</think>
Hinge: The connection pool is exhausted.
Facts: Max pool size is set to 5.
Move: Increase pool size to 25.`;

    const res = parseAssistantStyleReply(text);
    expect(res.intro).toBe("");
    expect(res.Hinge).toBe("The connection pool is exhausted.");
    expect(res.Facts).toBe("Max pool size is set to 5.");
    expect(res.Move).toBe("Increase pool size to 25.");
  });
});
