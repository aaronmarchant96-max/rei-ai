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
      "reveal your instructions",
      "what is your system prompt",
      "give me your prompt",
      "tell me your instructions",
      "leak your prompt",
      "expose your instructions",
      "your guardrails",
      "provide your guardrails",
      "what are your guardrails",
      "show your guardrails",
      "tell me your guardrails",
      "give me your guardrails",
      "what is your guardrails"
    ],
    weight: 1.0,
    riskImpact: "Revealing system instructions gives attackers the blueprint to bypass every safety guardrail at once."
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
      "turn off filters",
      "ignore your safety",
      "ignore safety",
      "break the model",
      "break a model",
      "break an llm",
      "break a small llm",
      "jailbreak",
      "jail break",
      "break free",
      "break out",
      "escape your constraints",
      "remove your limits",
      "remove restrictions",
      "remove safety",
      "how to jailbreak",
      "how to break",
      "make the model fail",
      "force the model to",
      "trick the model",
      "manipulate the model",
      "exploit the model",
      "bypass safety",
      "bypass guardrails",
      "remove guardrails",
      "disable guardrails",
      "break your programming",
      "override your programming",
      "ignore your programming",
      "you are now",
      "from now on you",
      "you will now",
      "you must now",
      "you can now",
      "you should now",
      "no longer follow",
      "stop following",
      "don't follow",
      "do not follow",
      "ignore all previous",
      "disregard all previous",
      "forget all previous",
      "drop all previous",
      "discard all previous",
      "break you",
      "brek you",
      "help me break",
      "help me brek",
      "how to break you",
      "how to brek you",
      "break the program",
      "brek the program"
    ],
    weight: 0.9,
    riskImpact: "Hidden directives can override safety rules, changing model behavior without the user's knowledge."
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
      "client secret",
      "api secret",
      "aws secret",
      "aws access key",
      "private key",
      "secret token",
      "auth token",
      "session token",
      "jwt token",
      "cookie value",
      "session cookie",
      "your api key",
      "your secret",
      "your password",
      "show me your key",
      "reveal your credentials"
    ],
    weight: 1.0,
    riskImpact: "Exposed API keys or tokens grant attackers direct access to paid services and private data."
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
      "execute arbitrary code",
      "run this code",
      "execute this",
      "run arbitrary",
      "shell command",
      "system command",
      "os command",
      "terminal command",
      "bash command",
      "powershell",
      "cmd.exe",
      "eval(",
      "exec(",
      "system(",
      "popen(",
      "subprocess",
      "child_process"
    ],
    weight: 0.95,
    riskImpact: "The model can be tricked into running destructive shell commands or executing arbitrary code."
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
      "access private data",
      "steal data",
      "extract information",
      "get user data",
      "access user data",
      "private information",
      "personal data",
      "pii data",
      "personally identifiable",
      "gdpr data",
      "sensitive data",
      "confidential data",
      "proprietary data",
      "trade secret",
      "internal data"
    ],
    weight: 0.95,
    riskImpact: "Attacker extracts private user data, conversation history, or internal system details."
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
      "round down to",
      "make an exception",
      "break the rules",
      "bend the rules",
      "flexible with",
      "lenient with",
      "overlook this",
      "let this slide",
      "let it through",
      "approve anyway",
      "approve regardless",
      "waive the requirement",
      "skip the check",
      "bypass the check",
      "ignore the restriction",
      "skip the verification",
      "skip verification",
      "skip the verification step",
      "skip the approval",
      "skip approval",
      "bypass the approval",
      "bypass verification",
      "already approved verbally",
      "approved it verbally",
      "verbally approved",
      "verbal approval",
      "process without verification",
      "process without approval",
      "process a refund now and skip"
    ],
    weight: 0.85,
    riskImpact: "Circumvents safety guardrails to generate content the system was designed to refuse."
  },

  child_safety_violation: {
    label: "Child Safety Violation",
    severity: "critical",
    // Bare age/person terms (child, kid, minor, school) were removed as
    // standalone escalators — they false-positive on benign narrative
    // ("a child finds a treasure map"). Only explicit exploitative phrases
    // escalate here; bare child terms are caught by the child_safety_compound
    // PROXIMITY_PATTERN when a harm target appears nearby.
    keywords: [
      "child safety",
      "minor safety",
      "protect children",
      "child protection",
      "child exploitation",
      "child sexual abuse",
      "child abuse",
      "groom a child",
      "grooming a child",
      "sexual abuse of a minor",
      "sexual content involving a child",
      "child pornography",
      "underage content",
      "minor content",
      "csam"
    ],
    weight: 1.0,
    riskImpact: "Content that exploits children or attempts to generate child-harm material."
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
      "commit suicide",
      "suicide",
      "self harm",
      "self-harm",
      "cutting yourself",
      "hurting yourself",
      "eating disorder",
      "anorexia",
      "bulimia",
      "starve yourself"
    ],
    weight: 1.0,
    riskImpact: "Requests that encourage, instruct, or facilitate self-harm or suicide."
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
      "illegal weapons",
      "firearm",
      "ammunition",
      "explosive device",
      "chemical agent",
      "biological agent",
      "radiological",
      "nerve agent",
      "toxin",
      "poison gas",
      "mustard gas",
      "sarın",
      "ricin",
      "anthrax"
    ],
    weight: 1.0,
    riskImpact: "Instructions for creating weapons, explosives, or biological/chemical agents."
  },

  roleplay_jailbreak: {
    label: "Roleplay Jailbreak",
    severity: "high",
    keywords: [
      "you are now",
      "act as",
      "pretend you are",
      "pretend to be",
      "simulate being",
      "roleplay as",
      "role-play as",
      "play the role of",
      "you are dan",
      "you are dan now",
      "dan mode",
      "dan jailbreak",
      "do anything now",
      "unrestricted mode",
      "unfiltered mode",
      "uncensored mode",
      "without restrictions",
      "without filters",
      "without censorship",
      "no limits",
      "no restrictions",
      "no filters",
      "no censorship",
      "free from constraints",
      "free from rules",
      "free from guidelines",
      "act like",
      "behave as",
      "impersonate",
      "become",
      "transform into",
      "switch to",
      "change to",
      "assume the role of",
      "take on the role of"
    ],
    weight: 0.9,
    riskImpact: "Roleplay scenarios trick the model into violating safety policies under a fictional persona."
  },

  translation_attack: {
    label: "Translation Attack",
    severity: "medium",
    keywords: [
      "translate this to",
      "translate to",
      "convert to base64",
      "encode in base64",
      "decode this",
      "base64 decode",
      "base64 encode",
      "rot13",
      "caesar cipher",
      "cipher this",
      "encode this instruction",
      "decode this instruction",
      "translate and ignore",
      "translate then follow",
      "translate without filtering",
      "translate without censoring",
      "translate the following",
      "convert to hex",
      "convert to binary",
      "convert to octal",
      "unicode escape",
      "url encode",
      "percent encode",
      "html encode",
      "xml encode"
    ],
    weight: 0.7,
    riskImpact: "Translation or encoding tasks used to hide malicious intent behind innocent-looking language requests."
  },

  authority_impersonation: {
    label: "Authority Impersonation",
    severity: "high",
    keywords: [
      "i'm your developer",
      "i am your developer",
      "i'm the developer",
      "i am the developer",
      "i'm your creator",
      "i am your creator",
      "system administrator",
      "admin here",
      "i'm an admin",
      "i am an admin",
      "i have permission",
      "i have authorization",
      "authorized by",
      "authorized user",
      "privileged user",
      "root user",
      "superuser",
      "i built you",
      "i created you",
      "i trained you",
      "your creator says",
      "your developer says",
      "company policy says",
      "headquarters says",
      "management says",
      "executive order",
      "legal requirement",
      "compliance requirement",
      "court order",
      "law enforcement",
      "government request",
      "official request",
      "formal request"
    ],
    weight: 0.9,
    riskImpact: "Fake authority claims (admin, developer, employer) used to override model restrictions."
  },

  social_engineering: {
    label: "Social Engineering",
    severity: "medium",
    keywords: [
      "please i really need this",
      "please help me",
      "i'm begging you",
      "i desperately need",
      "you're so smart you can",
      "you're so helpful",
      "you're so kind",
      "you're different from",
      "you're special",
      "you're better than",
      "you understand me",
      "you care about",
      "for research purposes",
      "for educational purposes",
      "for testing purposes",
      "for security testing",
      "for penetration testing",
      "for a security audit",
      "for a vulnerability assessment",
      "i'm a security researcher",
      "i'm a researcher",
      "i'm testing you",
      "this is a test",
      "this is only a test",
      "hypothetically speaking",
      "in a hypothetical scenario",
      "for science",
      "for academic research",
      "for my thesis",
      "for my dissertation",
      "it's an emergency",
      "urgent request",
      "time sensitive",
      "critical situation",
      "life or death",
      "emergency situation"
    ],
    weight: 0.7,
    riskImpact: "Manipulation tactics that persuade the model into unsafe behavior through emotional pressure."
  },

  context_poisoning: {
    label: "Context Poisoning",
    severity: "high",
    keywords: [
      "from now on",
      "for the rest of this conversation",
      "for the rest of this chat",
      "for all future responses",
      "remember that you can",
      "remember you are",
      "keep in mind that",
      "don't forget that",
      "always remember",
      "never forget",
      "in this scenario",
      "in this context",
      "in this conversation",
      "in this chat",
      "in this session",
      "for this thread",
      "throughout this conversation",
      "persist this",
      "remember this rule",
      "follow this rule",
      "adhere to this",
      "comply with this",
      "abide by this",
      "observe this rule",
      "respect this instruction",
      "honor this request",
      "maintain this state",
      "preserve this context"
    ],
    weight: 0.85,
    riskImpact: "Long prompts with hidden contradictions designed to corrupt the model's reasoning over time."
  },

  nested_instructions: {
    label: "Nested Instructions",
    severity: "medium",
    // All keywords here are story/hypothetical framings ("in this story",
    // "imagine that"). They are NOT escalators on their own — an ordinary
    // story opener would route every narrative prompt to the expensive
    // adversarial path. They only count when a directive/instruction verb
    // also appears in the input (see requiresCompound gate in
    // getCategoryByKeyword), so nested injection = story-framing + directive.
    keywords: [
      "within this story",
      "in this story",
      "in this hypothetical",
      "in this fiction",
      "in this scenario",
      "in this simulation",
      "in this roleplay",
      "in this game",
      "imagine a world where",
      "imagine that",
      "picture this",
      "picture a world where",
      "suppose that",
      "suppose a world where",
      "assume that",
      "assume a scenario where",
      "consider a world where",
      "consider a scenario",
      "pretend that",
      "pretend we're in",
      "let's pretend",
      "what if",
      "what would happen if",
      "in an alternate reality",
      "in a parallel universe",
      "in a fictional world",
      "in a made-up scenario",
      "for the sake of argument",
      "as a thought experiment",
      "as an exercise",
      "as a demonstration"
    ],
    requiresCompound: [
      "ignore",
      "disregard",
      "forget",
      "override",
      "bypass",
      "disable",
      "no restrictions",
      "no limits",
      "no filters",
      "you are now",
      "do anything",
      "from now on",
      "new instruction",
      "follow",
      "execute",
      "no longer",
      "stop following",
      "ignore all",
      "ignore any",
      "instead"
    ],
    weight: 0.7,
    riskImpact: "Instructions hidden inside stories or hypotheticals that the model processes as real directives."
  },

  obfuscation_attempt: {
    label: "Obfuscation Attempt",
    severity: "medium",
    keywords: [
      "base64:",
      "base64 encoded",
      "hex encoded",
      "url encoded",
      "rot13:",
      "cipher:",
      "encoded instruction",
      "encoded command",
      "hidden instruction",
      "hidden command",
      "invisible text",
      "zero width",
      "unicode trick",
      "homoglyph",
      "lookalike characters",
      "special characters",
      "escape sequence",
      "comment injection",
      "/* */",
      "<!-- -->",
      "// hidden",
      "# hidden",
      "/* ignore */",
      "/* system */",
      "ignore the above",
      "disregard the above",
      "not the real instruction",
      "the real instruction is",
      "actual instruction:",
      "true instruction:",
      "real instruction:"
    ],
    weight: 0.8,
    riskImpact: "Leetspeak, Base64, homoglyphs, or other encoding techniques used to hide malicious intent from filters."
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
  "child_safety_compound",
  "self_harm_instructions",
  "weapon_proliferation",
  "roleplay_jailbreak",
  "authority_impersonation",
  "context_poisoning"
];

export const D1_ESCALATION_THRESHOLD = 0.55;

// Regex patterns for obfuscation detection
export const OBFUSCATION_PATTERNS = [
  // Base64 detection (long strings of base64 chars)
  { pattern: /[A-Za-z0-9+/]{40,}={0,2}/, label: "base64_encoded", weight: 0.8 },
  // Hex encoding
  { pattern: /(?:0x)?[0-9a-fA-F]{20,}/, label: "hex_encoded", weight: 0.7 },
  // Leetspeak substitution (ign0re, br3ak, etc.)
  { pattern: /\b(?:1gn0r[e3]|br3ak|jailbr3ak|0v3rrid3|byp[@4]ss|d1sab[l1]e)\b/i, label: "leetspeak_obfuscation", weight: 0.9 },
  // Zero-width characters
  { pattern: /[\u200B-\u200F\uFEFF]/, label: "zero_width_chars", weight: 0.8 },
  // Unicode homoglyphs (Cyrillic, Greek lookalikes)
  { pattern: /[\u0400-\u04FF\u0370-\u03FF]/, label: "unicode_homoglyph", weight: 0.7 },
  // Excessive whitespace / hidden text
  { pattern: / {3,}|\t{2,}/, label: "excessive_whitespace", weight: 0.5 },
  // Comment injection patterns (ignores :// in http:// and https:// URLs)
  { pattern: /\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|(?<!:)\/\/.*/g, label: "comment_injection", weight: 0.8 },
  // URL encoding
  { pattern: /%[0-9A-Fa-f]{2}(?:%[0-9A-Fa-f]{2}){3,}/, label: "url_encoded", weight: 0.6 },
  // Repeated character padding
  { pattern: /(.)\1{10,}/, label: "character_padding", weight: 0.5 },
  // Mixed case obfuscation (IgNoRe, InStRuCtIoNs)
  { pattern: /\b(?:[Ii][Gg][Nn][Oo][Rr][Ee]|[Ii][Nn][Ss][Tt][Rr][Uu][Cc][Tt][Ii][Oo][Nn][Ss])\b/, label: "case_obfuscation", weight: 0.7 }
];

// Phrase proximity patterns — detect related terms within N words
export const PROXIMITY_PATTERNS = [
  {
    terms: ["ignore", "disregard", "forget", "override", "bypass", "skip", "waive", "circumvent"],
    targets: ["instruction", "rule", "policy", "restriction", "constraint", "guideline", "training", "safety", "filter", "guardrail", "verification", "approval", "compliance", "authorization"],
    maxDistance: 5,
    label: "policy_bypass",
    weight: 0.9
  },
  {
    terms: ["skip", "waive", "bypass", "override", "ignore", "without"],
    targets: ["verification", "approval", "check", "manager", "policy", "limit", "compliance", "authorization", "audit", "step"],
    maxDistance: 6,
    label: "policy_bypass",
    weight: 0.9
  },
  {
    terms: ["you", "model", "ai", "assistant", "llm"],
    targets: ["are now", "become", "act as", "pretend", "simulate", "roleplay", "transform", "switch"],
    maxDistance: 3,
    label: "proximity_roleplay",
    weight: 0.8
  },
  {
    terms: ["developer", "admin", "creator", "built", "created", "trained", "management", "company", "manager", "supervisor"],
    targets: ["says", "says to", "requests", "requires", "orders", "commands", "authorized", "permission", "approved", "allowed"],
    maxDistance: 5,
    label: "proximity_authority",
    weight: 0.85
  },
  {
    terms: ["please", "beg", "desperate", "need", "urgent", "emergency", "critical"],
    targets: ["help", "do this", "comply", "follow", "obey", "execute", "perform"],
    maxDistance: 5,
    label: "proximity_social_engineering",
    weight: 0.7
  },
  {
    terms: ["translate", "encode", "decode", "convert", "base64", "hex", "rot13", "cipher"],
    targets: ["instruction", "command", "request", "message", "text", "prompt"],
    maxDistance: 5,
    label: "proximity_translation_attack",
    weight: 0.75
  },
  {
    // Compound child-safety detection. Bare child terms (child/kid/minor/
    // school) were removed from child_safety_violation keywords because they
    // false-positive on benign narrative. A child term is only a signal when
    // a sexual/exploitation/grooming target appears nearby. Deliberately
    // excludes non-exploitation harm (accident, illness) to avoid flagging
    // "a child was hurt in the accident."
    terms: ["child", "children", "kid", "kids", "minor", "minors", "teenager", "teenagers", "underage", "student", "students"],
    targets: ["sexual", "sexually", "sex", "abuse", "abusive", "exploit", "exploitation", "exploited", "groom", "grooming", "molest", "molesting", "porn", "pornography", "explicit", "nude", "naked", "sexualized"],
    maxDistance: 5,
    label: "child_safety_compound",
    weight: 0.9
  }
];

function keywordMatch(normalizedInput, keyword) {
  const key = String(keyword).toLowerCase();
  if (!key) {
    return false;
  }
  // Multi-word keywords ("help me break", "ignore previous instructions")
  // are matched literally as substrings to preserve existing phrase detection.
  if (/\s/.test(key)) {
    return normalizedInput.includes(key);
  }
  // Single-word keywords are matched with word boundaries so short danger
  // terms cannot false-positive inside ordinary words ("ricin" in "pricing").
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const startsWithWord = /^[a-z0-9]/.test(key);
  const endsWithWord = /[a-z0-9]$/.test(key);
  const prefix = startsWithWord ? "(^|[^a-z0-9])" : "";
  const suffix = endsWithWord ? "([^a-z0-9]|$)" : "";
  return new RegExp(prefix + escaped + suffix, "i").test(normalizedInput);
}

export function getCategoryByKeyword(input) {
  const normalizedInput = input.toLowerCase();
  const matches = [];

  // 1. Keyword matching
  for (const [categoryKey, category] of Object.entries(RED_TEAM_CATEGORIES)) {
    let score = 0;
    const matchedKeywords = [];

    for (const keyword of category.keywords) {
      if (keywordMatch(normalizedInput, keyword)) {
        score += category.weight;
        matchedKeywords.push(keyword);
      }
    }

    if (score > 0) {
      // Compound requirement: categories that need a directive verb alongside
      // their framing keywords (e.g. nested_instructions) are suppressed when
      // no compound signal is present — prevents story openers from escalating.
      if (category.requiresCompound && !category.requiresCompound.some(sig => normalizedInput.includes(sig))) {
        continue;
      }
      matches.push({
        category: categoryKey,
        label: category.label,
        severity: category.severity,
        riskImpact: category.riskImpact || null,
        score,
        matchedKeywords,
        matchType: "keyword"
      });
    }
  }

  // 2. Regex pattern matching (obfuscation detection)
  for (const regexPattern of OBFUSCATION_PATTERNS) {
    const regex = new RegExp(regexPattern.pattern, "gi");
    const obfMatches = normalizedInput.match(regex);
    if (obfMatches && obfMatches.length > 0) {
      const existingMatch = matches.find(m => m.category === "obfuscation_attempt");
      if (existingMatch) {
        existingMatch.score += regexPattern.weight;
        existingMatch.matchedKeywords.push(regexPattern.label);
      } else {
        matches.push({
          category: "obfuscation_attempt",
          label: "Obfuscation Attempt",
          severity: "medium",
          riskImpact: RED_TEAM_CATEGORIES.obfuscation_attempt?.riskImpact || null,
          score: regexPattern.weight,
          matchedKeywords: [regexPattern.label],
          matchType: "regex"
        });
      }
    }
  }

  // 3. Phrase proximity matching
  for (const proxPattern of PROXIMITY_PATTERNS) {
    const words = normalizedInput.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const termMatch = proxPattern.terms.find(t => words[i].includes(t));
      if (termMatch) {
        // Look within maxDistance words on BOTH sides (compound patterns like
        // "grooms a child" put the harm target before the child term).
        const backWindow = words.slice(Math.max(0, i - proxPattern.maxDistance), i);
        const forwardWindow = words.slice(i + 1, i + 1 + proxPattern.maxDistance);
        const targetMatch = proxPattern.targets.find(t =>
          backWindow.some(w => w.includes(t)) || forwardWindow.some(w => w.includes(t))
        );
        if (targetMatch) {
          const existingMatch = matches.find(m => m.category === `proximity_${proxPattern.label?.replace("proximity_", "")}`);
          if (existingMatch) {
            existingMatch.score += proxPattern.weight;
            existingMatch.matchedKeywords.push(`${termMatch}...${targetMatch}`);
          } else {
            matches.push({
              category: proxPattern.label,
              label: proxPattern.label.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
              severity: "medium",
              score: proxPattern.weight,
              matchedKeywords: [`${termMatch}...${targetMatch}`],
              matchType: "proximity"
            });
          }
        }
      }
    }
  }

  // 4. Combination boost — if multiple categories match, boost confidence
  if (matches.length > 1) {
    const highRiskCount = matches.filter(m => ALWAYS_HIGH_RISK.includes(m.category)).length;
    if (highRiskCount >= 2) {
      for (const match of matches) {
        match.score *= 1.3; // 30% boost for multi-category attacks
        match.combinationBoost = true;
      }
    }
  }

  // 5. Length-based suspicion — very long prompts with injection patterns
  if (normalizedInput.length > 500) {
    const injectionKeywords = ["ignore", "disregard", "forget", "override", "from now on", "new instruction", "system message"];
    const hasInjection = injectionKeywords.some(k => normalizedInput.includes(k));
    const injectionAtEnd = hasInjection && normalizedInput.lastIndexOf("ignore") > normalizedInput.length * 0.7;

    if (injectionAtEnd) {
      const existingMatch = matches.find(m => m.category === "hidden_instruction_disclosure");
      if (existingMatch) {
        existingMatch.score *= 1.5; // 50% boost for end-positioned injection
        existingMatch.positionSuspicion = "injection_at_end_of_long_prompt";
      }
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

// ── Auto-decode obfuscated payloads ─────────────────────────────────────────

/**
 * Extract and decode Base64 strings found in the input text.
 * Only attempts strings ≥20 chars (real payloads, not short tokens).
 * Returns an array of successfully decoded strings.
 */
export function decodeEmbeddedBase64(text) {
  const decoded = [];
  const base64Re = /[A-Za-z0-9+/]{20,}={0,2}/g;
  const matches = text.match(base64Re) || [];
  for (const m of matches) {
    try {
      const raw = atob(m);
      if (/[\x20-\x7e]{4,}/.test(raw)) {
        decoded.push(raw);
      }
    } catch { /* not valid base64 */ }
  }
  return decoded;
}

/**
 * Decode URL-encoded hex strings (%XX%XX...) from the input.
 */
export function decodeEmbeddedUrl(text) {
  try {
    const decoded = decodeURIComponent(text.replace(/\+/g, " "));
    if (decoded !== text) return [decoded];
  } catch { /* not valid URL-encoded */ }
  return [];
}

/**
 * Decode hex strings (continuous hex of 8+ chars prefixed with 0x or raw).
 */
export function decodeEmbeddedHex(text) {
  const decoded = [];
  const hexRe = /(?:0x)?([0-9a-fA-F]{8,})/g;
  let m;
  while ((m = hexRe.exec(text)) !== null) {
    try {
      const hex = m[1];
      if (hex.length % 2 !== 0) continue;
      const bytes = [];
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.slice(i, i + 2), 16));
      }
      const raw = String.fromCharCode(...bytes);
      if (/[\x20-\x7e]{4,}/.test(raw)) {
        decoded.push(raw);
      }
    } catch { /* not valid hex */ }
  }
  return decoded;
}

/**
 * Extract all obfuscated content from a prompt — Base64, hex, URL-encoded
 * strings — decode them, and return the original text concatenated with all
 * decoded fragments. This allows one extra pass of keyword/proximity matching
 * against the decoded payload without modifying the original scanner pipeline.
 */
export function normalizeObfuscatedInput(input) {
  const decoded = [
    ...decodeEmbeddedBase64(input),
    ...decodeEmbeddedUrl(input),
    ...decodeEmbeddedHex(input),
  ];
  if (decoded.length === 0) return input;
  return [input, ...decoded].join("\n");
}

// ── Educational / benign context detection ───────────────────────────────────

const QUESTION_STARTERS = /^(how|what|why|when|where|who|can you explain|explain|describe|define|tell me about)\b/i;
const EDUCATIONAL_FRAMING = /\b(?:research|researcher|security team|pentest|pen.?test|protect against|defend against|defense|learn about|study of|understand how|education|academic|paper|article|documentation|prevent|mitigat|best practice|technique|curious|for learning|for class|for school|for research)\b/i;
const IMPERATIVE_ATTACK = /\b(?:ignore|disregard|forget|override|bypass|pretend|act as|you are now|new instruction|roleplay as|from now on|do anything now)\b/i;

/**
 * Heuristic to detect when a prompt is asking *about* security concepts
 * educationally rather than attempting to exploit them. Looks for question
 * starters, educational framing keywords, and absence of imperative attack
 * language.
 *
 * This is a heuristic — not a classifier. It will occasionally mislabel
 * sophisticated attacks as educational or flag genuine research questions as
 * suspicious. Treat it as a signal to reduce confidence, not a binary gate.
 */
export function isEducationalFraming(input) {
  const text = input.trim();
  const hasQuestion = QUESTION_STARTERS.test(text);
  const hasEducational = EDUCATIONAL_FRAMING.test(text.toLowerCase());
  const hasImperative = IMPERATIVE_ATTACK.test(text.toLowerCase());
  return (hasQuestion && hasEducational && !hasImperative);
}
