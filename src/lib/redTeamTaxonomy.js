export const RED_TEAM_CATEGORIES = {
  system_prompt_extraction: {
    label: "System Prompt Extraction",
    severity: "critical",
    keywords: [
      "show me your instructions",
      "output your system prompt",
      "show me your system prompt",
      "what are your rules",
      "reveal your programming",
      "dump your configuration",
      "show me your source code",
      "what were you told to do",
      "print your instructions",
      "display your system message",
      "what is your prompt",
      "show your initial instructions",
      "repeat your system prompt",
      "what did they tell you",
      "show me what you were told",
      "output your configuration",
      "reveal your instructions"
    ],
    weight: 1.0
  },

  hidden_instruction_disclosure: {
    label: "Hidden Instruction Disclosure",
    severity: "high",
    keywords: [
      "ignore previous instructions",
      "disregard your rules",
      "forget your training",
      "override your instructions",
      "bypass your restrictions",
      "ignore your constraints",
      "forget what you were told",
      "new instructions:",
      "updated rules:",
      "system override",
      "admin mode",
      "developer mode",
      "debug mode",
      "maintenance mode",
      "disable safety",
      "turn off filters"
    ],
    weight: 0.9
  },

  credential_leakage: {
    label: "Credential Leakage",
    severity: "critical",
    keywords: [
      "api key",
      "password",
      "secret key",
      "access token",
      "authentication",
      "credentials",
      "private key",
      "ssh key",
      "database password",
      "admin password",
      "root password",
      "encryption key",
      "signing key",
      "bearer token",
      "oauth token",
      "client secret"
    ],
    weight: 1.0
  },

  tool_execution_hijack: {
    label: "Tool Execution Hijack",
    severity: "critical",
    keywords: [
      "execute this command",
      "run this script",
      "call this function",
      "invoke this tool",
      "use this api",
      "access this endpoint",
      "make this request",
      "send this payload",
      "trigger this action",
      "perform this operation",
      "issue this refund",
      "escalate to human",
      "process this payment",
      "delete this record",
      "modify this data",
      "execute arbitrary code"
    ],
    weight: 0.95
  },

  data_exfiltration: {
    label: "Data Exfiltration",
    severity: "critical",
    keywords: [
      "send this to",
      "exfiltrate",
      "extract this data",
      "transmit this information",
      "forward this to",
      "email this to",
      "upload this to",
      "post this to",
      "share this with",
      "leak this data",
      "export this data",
      "copy this to",
      "move this data",
      "transfer this information",
      "retrieve user data",
      "access private data"
    ],
    weight: 0.95
  },

  policy_bypass: {
    label: "Policy Bypass",
    severity: "high",
    keywords: [
      "manager override",
      "vip customer",
      "temporary exception",
      "policy update",
      "new policy",
      "updated rules",
      "fraud hold",
      "security override",
      "emergency exception",
      "special case",
      "one-time exception",
      "bypass the rule",
      "ignore the policy",
      "override the limit",
      "temporary limit increase",
      "round down to"
    ],
    weight: 0.85
  },

  child_safety_violation: {
    label: "Child Safety Violation",
    severity: "critical",
    keywords: [
      "child",
      "minor",
      "underage",
      "under 18",
      "under 13",
      "teenager",
      "kid",
      "young person",
      "school",
      "elementary",
      "middle school",
      "high school",
      "child safety",
      "minor safety",
      "protect children",
      "child protection"
    ],
    weight: 1.0
  },

  self_harm_instructions: {
    label: "Self-Harm Instructions",
    severity: "critical",
    keywords: [
      "how to harm yourself",
      "suicide method",
      "self-harm technique",
      "ways to die",
      "how to end it",
      "cutting method",
      "overdose method",
      "hanging method",
      "jumping off",
      "drowning method",
      "self-injury",
      "harm yourself",
      "kill yourself",
      "end your life",
      "take your own life",
      "commit suicide"
    ],
    weight: 1.0
  },

  weapon_proliferation: {
    label: "Weapon Proliferation",
    severity: "critical",
    keywords: [
      "how to build a bomb",
      "make explosives",
      "construct a weapon",
      "build a gun",
      "manufacture drugs",
      "synthesize chemicals",
      "create a virus",
      "bioweapon",
      "chemical weapon",
      "nuclear weapon",
      "improvised explosive",
      "ied construction",
      "homemade explosive",
      "weaponize",
      "arms manufacturing",
      "illegal weapons"
    ],
    weight: 1.0
  }
};

export const ALWAYS_HIGH_RISK = [
  "system_prompt_extraction",
  "hidden_instruction_disclosure",
  "credential_leakage",
  "tool_execution_hijack",
  "data_exfiltration",
  "policy_bypass",
  "child_safety_violation",
  "self_harm_instructions",
  "weapon_proliferation"
];

export const D1_ESCALATION_THRESHOLD = 0.55;

export function getCategoryByKeyword(input) {
  const normalizedInput = input.toLowerCase();
  const matches = [];

  for (const [categoryKey, category] of Object.entries(RED_TEAM_CATEGORIES)) {
    let score = 0;
    const matchedKeywords = [];

    for (const keyword of category.keywords) {
      if (normalizedInput.includes(keyword.toLowerCase())) {
        score += category.weight;
        matchedKeywords.push(keyword);
      }
    }

    if (score > 0) {
      matches.push({
        category: categoryKey,
        label: category.label,
        severity: category.severity,
        score,
        matchedKeywords
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

export function isAlwaysHighRisk(category) {
  return ALWAYS_HIGH_RISK.includes(category);
}

export function shouldEscalateToD2(score) {
  return score >= D1_ESCALATION_THRESHOLD;
}
