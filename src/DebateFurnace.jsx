import { useEffect, useState } from "react";

const T = {
  bg: "#080810",
  surface: "#0f0f1a",
  card: "#13131f",
  border: "#1e2235",
  ember: "#e8742a",
  brass: "#b8943a",
  gold: "#d4a83a",
  molten: "#f05020",
  charcoal: "#1a1a28",
  sideA: "#5b8dd9",
  sideB: "#c85858",
  smoke: "#f0a030",
  judge: "#4aaa70",
  muted: "#4a5068",
  text: "#d8dce8",
  textDim: "#7a8098",
  warn: "#e05050"
};

const STARTERS = [
  "Is ChatGPT better than Grok?",
  "Does gun control reduce harm?",
  "Is love real?",
  "Is AI art real art?",
  "Are UAPs most likely advanced non-human technology?",
  "Should governments regulate frontier AI more aggressively?",
  "Is remote work better than working in an office?",
  "Are seed oils actually bad for you?",
  "Is free will an illusion?",
  "Should college be free for everyone?",
  "Should parents be allowed to genetically modify their babies for intelligence or health?",
  "Should the 4-day workweek become standard for office jobs?",
  "Should prisons prioritize rehabilitation over punishment?",
  "Should social media be age-gated for teens under 16?",
  "Should housing be treated as a human right?",
  "Is pineapple on pizza acceptable?",
  "Does social media do more harm than good?",
  "Is money the root of all evil?",
  "Are cats better than dogs?",
  "Should capital punishment be abolished?",
  "Should encryption be a human right?"
];

const HEAT = {
  low: ["Low Heat", "Clean disagreement", T.sideA],
  medium: ["Medium Heat", "Contested assumptions", T.gold],
  high: ["High Heat", "Heavy flaws or unresolved claims", T.ember],
  critical: ["Critical Heat", "Core issue unresolved under pressure", T.sideB]
};

function useMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 720);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

function titleCase(value) {
  if (!value) return "";
  if (["yes", "no"].includes(value.toLowerCase().trim())) return value.trim().toUpperCase();
  return value
    .trim()
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function cleanQuestion(q) {
  return q.trim().replace(/\s+/g, " ");
}

function toBase64Url(value) {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function makeSharePayload(question, sideA, sideB, intensity, debate) {
  return { v: 1, question, sideA, sideB, intensity, debate };
}

function buildShareLink(payload) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}#d=${toBase64Url(payload)}`;
}

function summarizeAiFailure(error) {
  const message = String(error?.message || "").toLowerCase();

  if (message.includes("missing gemini_api_key")) {
    return "AI generation was unavailable because GEMINI_API_KEY is not configured.";
  }

  if (message.includes("404")) {
    return "AI generation was unavailable because the /api/debate route was not found. Local vite dev does not serve the API route by itself.";
  }

  if (message.includes("failed to fetch")) {
    return "AI generation was unavailable because the debate API request failed before it reached Gemini.";
  }

  if (message.includes("403")) {
    return "AI generation was unavailable because Gemini rejected the request. Check the API key and deployment configuration.";
  }

  if (message.includes("429")) {
    return "AI generation was unavailable because Gemini rate-limited the request.";
  }

  if (message.includes("500")) {
    return "AI generation was unavailable because the debate API returned a server error.";
  }

  return "AI generation was unavailable, so Debate Furnace used its local fallback.";
}

function safelyReplaceUrl(url) {
  if (typeof window === "undefined" || !url) return;
  try {
    window.history.replaceState({}, "", url);
  } catch {
    window.history.replaceState({}, "", window.location.pathname);
  }
}

const HISTORY_KEY = "debate_furnace_history_v1";
const HISTORY_LIMIT = 12;
const DECISION_PATH_KEY = "debate_furnace_decision_path_v1";

function safeParseHistory(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getSavedDebateHistory() {
  if (typeof window === "undefined") return [];
  return safeParseHistory(window.localStorage.getItem(HISTORY_KEY) || "[]");
}

function summarizeDebate(question, debate) {
  const result = verdictLabel(debate.matchWinner, debate.shortA, debate.shortB);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    question,
    intensity: debate.intensity,
    label: debate.label,
    shortA: debate.shortA,
    shortB: debate.shortB,
    result,
    heatLevel: debate.heatLevel,
    payload: {
      question,
      sideA: debate.sideA,
      sideB: debate.sideB,
      intensity: debate.intensity,
      debate
    }
  };
}

function persistDebateHistory(entry) {
  if (typeof window === "undefined") return [];
  const current = getSavedDebateHistory();
  const next = [entry, ...current.filter((item) => item?.id !== entry.id)].slice(0, HISTORY_LIMIT);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

function formatSavedAt(value) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function getSavedDecisionPathPreference() {
  if (typeof window === "undefined") return "auto";
  const saved = window.localStorage.getItem(DECISION_PATH_KEY);
  return ["auto", "show", "hide"].includes(saved) ? saved : "auto";
}

function shouldShowDecisionPath(debate, preference = "auto") {
  if (preference === "hide") return false;
  if (preference === "show") return true;

  const type = String(debate?.qType || debate?.type || debate?.label || "").toLowerCase();
  if (["moral", "philosophical", "personal"].includes(type)) return false;
  if (["practical", "policy", "work"].includes(type)) return true;

  const q = cleanQuestion(debate?.question || "").toLowerCase();
  const starterTopics = [
    "remote work",
    "office work",
    "gun control",
    "frontier ai",
    "regulate frontier ai",
    "college",
    "tuition",
    "housing",
    "prison",
    "rehabilitation",
    "punishment",
    "capital punishment",
    "encryption",
    "workweek",
    "genetically modify"
  ];
  if (starterTopics.some((kw) => q.includes(kw))) return true;

  const decisionKeywords = ["should", "must", "allow", "ban", "require", "permit", "decide", "choose", "policy", "strategy", "plan"];
  return decisionKeywords.some((kw) => q.includes(kw));
}

function getDecisionPath(debate) {
  const q = cleanQuestion(debate?.question || "").toLowerCase();
  const type = String(debate?.qType || "").toLowerCase();
  const isTech = ["encryption", "frontier ai", "ai", "architecture", "software", "system", "technical", "product"].some((x) => q.includes(x));
  const isHighStakes = ["capital punishment", "genetically modify", "prison", "housing", "gun control", "college"].some((x) => q.includes(x));
  const isTeamOps = ["remote work", "office work", "workweek", "meeting", "team", "async", "decision"].some((x) => q.includes(x));

  if (isTeamOps || type === "practical") {
    return {
      framework: "Written Proposal + Timeboxed Input",
      driver: "The person closest to the problem",
      approver: "The decision owner",
      contributors: "Directly affected teammates",
      deadline: "3 business days",
      logTemplate: "Context | options | recommendation | tradeoffs | risks | decision | follow-up",
      why: "Best when the question is about team workflow, operating rhythm, or a practical work setup."
    };
  }

  if (isTech || ["factual", "open"].includes(type)) {
    return {
      framework: "RFC",
      driver: "The person writing the proposal",
      approver: "The technical owner or team lead",
      contributors: "Reviewers with relevant context",
      deadline: "3 business days",
      logTemplate: "Problem | proposal | alternatives | tradeoffs | decision | review date",
      why: "Best when the choice is technical, implementation-heavy, or likely to be revisited later."
    };
  }

  if (type === "policy" || isHighStakes) {
    return {
      framework: "DACI",
      driver: "The person driving the proposal",
      approver: "The accountable decision maker",
      contributors: "Subject-matter reviewers and impacted stakeholders",
      deadline: "5 business days",
      logTemplate: "Context | decision needed | options | impact by group | risks | recommendation | final call",
      why: "Best when the decision affects multiple groups and needs explicit ownership."
    };
  }

  return {
    framework: "Disagree and Commit",
    driver: "The person making the recommendation",
    approver: "The final decision maker",
    contributors: "People with relevant context",
    deadline: "2 business days",
    logTemplate: "Question | proposal | objections | resolution | decision | review date",
    why: "Best when the choice is reversible or the team needs speed more than process."
  };
}

function isStarterQuestion(q) {
  const cleaned = cleanQuestion(q).toLowerCase();
  return STARTERS.some((starter) => starter.toLowerCase() === cleaned);
}

function classify(question) {
  const l = question.toLowerCase();
  if (l.includes("bush") && l.includes("obama")) return "policy";
  if (l.includes("bald") || (l.includes("hair") && (l.includes("better") || l.includes("than")))) return "personal";
  if (["uap", "ufo", "alien", "non-human", "non human", "unidentified anomalous", "bob lazar", "lazar", "area 51", "s4", "element 115", "sport model", "reverse engineering", "flying saucer"].some((x) => l.includes(x))) return "extraordinary";
  if (["seed oil", "seed oils"].some((x) => l.includes(x))) return "factual";
  if (["free will", "money the root", "pineapple on pizza"].some((x) => l.includes(x))) return "moral";
  if (["social media", "college be free"].some((x) => l.includes(x))) return "policy";
  if ((l.includes("better than") || l.includes(" vs ") || l.includes("versus")) && !l.includes("gun")) return "product";
  if (["love", "real art", "ai art", "free will", "consciousness", "authentic", "meaning"].some((x) => l.includes(x))) return "moral";
  if (["gun", "regulate", "ban", "tax", "law", "government", "policy", "schools", "should "].some((x) => l.includes(x))) return "policy";
  if (["causes", "proven", "evidence", "climate", "vaccine", "study", "studies", "scientific"].some((x) => l.includes(x))) return "factual";
  return "open";
}

function inferSides(question, type) {
  const l = question.toLowerCase();
  if (l.includes("bush") && l.includes("obama")) return ["George W. Bush", "Barack Obama"];
  if (l.includes("bald") || (l.includes("hair") && (l.includes("better") || l.includes("than")))) return ["Being bald is better", "Having hair is better"];
  if (l.includes("bob lazar") || l.includes("lazar")) return ["Bob Lazar is telling the truth", "Bob Lazar has not proven his core claims"];
  if (l.includes("remote work") || l.includes("office work")) return ["Remote work is better", "Office work is better"];
  if (l.includes("seed oil")) return ["Seed oils are actually bad for you", "Seed oils are not uniquely bad for you"];
  if (l.includes("free will")) return ["Free will is an illusion", "Free will is not an illusion"];
  if (l.includes("college") && l.includes("free")) return ["College should be free for everyone", "College should not be free for everyone"];
  if (l.includes("pineapple on pizza")) return ["Pineapple on pizza is acceptable", "Pineapple on pizza is not acceptable"];
  if (l.includes("social media")) return ["Social media does more harm than good", "Social media does more good than harm"];
  if (l.includes("money") && l.includes("root")) return ["Money is the root of all evil", "Money is not the root of all evil"];
  if (l.includes("cats") && l.includes("dogs")) return ["Cats are better than dogs", "Dogs are better than cats"];
  if (type === "moral" && l.includes("love")) return ["Love is real", "Love is not real"];
  if (type === "moral" && l.includes("art")) return ["AI art is real art", "AI art is not real art"];
  if (type === "product" && (l.includes("chatgpt") || l.includes("grok"))) return ["ChatGPT is better than Grok", "Grok is better than ChatGPT"];
  if (type === "extraordinary") return ["UAPs are most likely advanced non-human technology", "Conventional explanations are more likely"];
  if (type === "policy" && l.includes("gun")) return ["Gun control reduces harm", "Gun control does not reduce harm enough to justify the tradeoffs"];
  if (type === "policy" && l.includes("ai")) return ["Governments should regulate frontier AI more aggressively", "Aggressive AI regulation would cause more harm than good"];
  if (l.includes("genetically modify")) return ["Parents should be allowed to genetically modify babies", "Genetic modification of babies should not be allowed"];
  if (l.includes("workweek") || l.includes("4-day")) return ["The 4-day workweek should become standard", "The 4-day workweek should not become standard"];
  if (l.includes("rehabilitation") && l.includes("prison")) return ["Prisons should prioritize rehabilitation", "Prisons should prioritize punishment"];
  if (l.includes("age-gated") || (l.includes("social media") && l.includes("under 16"))) return ["Social media should be age-gated for teens under 16", "Social media should not be age-gated for teens under 16"];
  if (l.includes("housing") && l.includes("human right")) return ["Housing should be treated as a human right", "Housing should not be treated as a human right"];
  if (l.includes("capital punishment")) return ["Capital punishment should be abolished", "Capital punishment should not be abolished"];
  if (l.includes("encryption") && l.includes("human right")) return ["Encryption should be a human right", "Encryption should not be a human right"];
  return ["Yes", "No"];
}

function shortLabel(side) {
  const l = side.toLowerCase().trim();
  if (l === "yes") return "YES";
  if (l === "no") return "NO";
  if (l.startsWith("chatgpt")) return "ChatGPT";
  if (l.startsWith("grok")) return "Grok";
  if (l.startsWith("love is real")) return "Love Is Real";
  if (l.startsWith("love is not")) return "Love Isn't Real";
  if (l.includes("ai art is real")) return "Real Art";
  if (l.includes("ai art is not")) return "Not Real Art";
  if (l.includes("non-human")) return "Non-Human Tech";
  if (l.includes("conventional")) return "Conventional";
  if (l.includes("gun control reduces")) return "Reduces Harm";
  if (l.includes("does not reduce")) return "Tradeoff Skeptic";
  if (l.includes("remote work")) return "Remote Work";
  if (l.includes("office work")) return "Office Work";
  if (l.includes("seed oils are")) return "Seed Oils Bad";
  if (l.includes("not uniquely bad")) return "Not Uniquely Bad";
  if (l.includes("free will is an illusion")) return "Illusion";
  if (l.includes("free will is not")) return "Not Illusion";
  if (l.includes("college should be free")) return "Free College";
  if (l.includes("should not be free")) return "Targeted Aid";
  if (l.includes("pineapple on pizza is acceptable")) return "Acceptable";
  if (l.includes("pineapple on pizza is not")) return "Not Acceptable";
  if (l.includes("social media does more harm")) return "More Harm";
  if (l.includes("social media does more good")) return "More Good";
  if (l.includes("money is the root")) return "Root Of Evil";
  if (l.includes("money is not")) return "Not The Root";
  if (l.includes("cats are better")) return "Cats";
  if (l.includes("dogs are better")) return "Dogs";
  if (l.includes("regulate frontier ai") || l.includes("should regulate")) return "Regulate";
  if (l.includes("regulation would cause") || l.includes("would cause more harm")) return "Light Touch";
  if (l.includes("genetically modify") && l.includes("should be allowed")) return "Allow GM";
  if (l.includes("genetic modification") && l.includes("not be allowed")) return "Ban GM";
  if (l.includes("4-day workweek should become")) return "4-Day Week";
  if (l.includes("4-day workweek should not")) return "5-Day Default";
  if (l.includes("prioritize rehabilitation")) return "Rehab First";
  if (l.includes("prioritize punishment")) return "Punish First";
  if (l.includes("age-gated") && l.includes("should be")) return "Age-Gate";
  if (l.includes("age-gated") && l.includes("should not")) return "No Age-Gate";
  if (l.includes("housing should be treated")) return "Housing Right";
  if (l.includes("housing should not")) return "Market Housing";
  if (l.includes("capital punishment should be abolished")) return "Abolish";
  if (l.includes("capital punishment should not")) return "Keep Death Penalty";
  if (l.includes("encryption should be a human right")) return "Encryption Right";
  if (l.includes("encryption should not")) return "Limited Encryption";
  const words = side.trim().split(/\s+/).slice(0, 3).join(" ");
  return titleCase(words || "Side");
}

function verdictLabel(matchWinner, shortA, shortB) {
  if (matchWinner === "CONTESTED") return "No Clear Winner";
  if (matchWinner === "TIE") return "Split Decision";
  return `${matchWinner === "A" ? shortA : shortB} Performed Better Under Pressure`;
}

const QUESTION_TYPE_LABELS = {
  product: "Value Collision",
  policy: "Policy Mechanism Dispute",
  moral: "Value Collision",
  practical: "Risk Tradeoff",
  factual: "Factual Dispute",
  extraordinary: "Trust Dispute",
  open: "Value Collision",
  personal: "Identity Dispute"
};

function getQuestionTypeLabel(qType) {
  return QUESTION_TYPE_LABELS[qType] || "Value Collision";
}

function getHingeClarity(qType, question) {
  const q = cleanQuestion(question || "").toLowerCase();
  if (!q || q.length < 12 || ["better", "good", "bad", "right", "wrong"].includes(q)) {
    return {
      level: "Low",
      reason: "The question is broad enough that the sides may argue past each other until the terms are tightened."
    };
  }
  if (["moral", "personal"].includes(qType)) {
    return {
      level: "High",
      reason: "The disagreement has a clear value collision, so the hinge is mostly about what each side prioritizes."
    };
  }
  if (["policy", "factual", "extraordinary", "practical"].includes(qType)) {
    return {
      level: "Medium",
      reason: "The debate mixes values with evidence, enforcement, trust, or real-world consequences."
    };
  }
  return {
    level: "Medium",
    reason: "The hinge is visible, but the answer still depends on definitions and what evidence each side accepts."
  };
}

function deriveBridgePoint(questionType, comp) {
  if (questionType === "Factual Dispute") return "Both sides can agree that better evidence should matter more than slogans.";
  if (questionType === "Definition Dispute") return "Both sides can agree that the answer changes if the key term is defined differently.";
  if (questionType === "Trust Dispute") return "Both sides can agree that trust has to be earned by evidence, transparency, and accountability.";
  if (questionType === "Policy Mechanism Dispute") return "Both sides can agree that good intentions are not enough if the mechanism fails in practice.";
  if (questionType === "Risk Tradeoff") return "Both sides can agree that the real choice is which risk is more acceptable to carry.";
  if (questionType === "Identity Dispute") return "Both sides can agree that dignity and belonging should not be dismissed as side issues.";
  return `Both sides can agree that ${comp?.[2] || "the real disagreement needs to be named before it can be judged"}.`;
}

function normalizeHinge(rawHinge, context) {
  const { question, qType, sideA, sideB, comp, core } = context;
  const questionType = rawHinge?.questionType || getQuestionTypeLabel(qType);
  const clarity = getHingeClarity(qType, question);
  const text = (value, fallbackValue) => (typeof value === "string" && value.trim() ? value.trim() : fallbackValue);
  const sideAValue = comp?.[0] || sideA;
  const sideBValue = comp?.[1] || sideB;
  const coreTension = text(rawHinge?.coreTension, core || comp?.[2] || "which value should control the final judgment");

  return {
    questionType: text(rawHinge?.questionType, questionType),
    sideAProtects: text(rawHinge?.sideAProtects, sideAValue),
    sideAFears: text(rawHinge?.sideAFears, `losing ${sideAValue} to the opposing tradeoff`),
    sideBProtects: text(rawHinge?.sideBProtects, sideBValue),
    sideBFears: text(rawHinge?.sideBFears, `losing ${sideBValue} to the opposing tradeoff`),
    coreTension,
    hingeClarityLevel: text(rawHinge?.hingeClarityLevel, clarity.level),
    hingeClarityReason: text(rawHinge?.hingeClarityReason, clarity.reason),
    bridgePoint: text(rawHinge?.bridgePoint, deriveBridgePoint(questionType, comp))
  };
}

function genericProfile(question, a, b) {
  const A = shortLabel(a);
  const B = shortLabel(b);
  return {
    label: "Open Argument Test",
    icon: "🔥",
    criteria: ["exact claim", "definitions", "evidence", "counterexamples", "tradeoffs", "what would change the verdict"],
    desc: `This debate is asking whether the exact claim — “${question}” — survives pressure. The sides should not drift into slogans. They need to define the claim, name what proof would be enough, answer the strongest objection, and explain what would change the verdict.`,
    rounds: [
      [
        `${A}'s strongest opening is not simply to say yes. It has to defend the exact claim in the question and show why that claim is more than an instinct or preference. A serious version gives a clear definition, names the evidence or lived examples that support it, and explains why the opposing side's doubts do not defeat the core point. The strongest version also admits where the claim is uncertain instead of pretending the debate is already settled.`,
        `${B}'s strongest opening is not simply to say no. It has to show why the claim has not met the standard it needs to meet. A serious version identifies the missing proof, tests the definitions, and asks whether alternative explanations fit the facts better. The strongest version does not dismiss the question; it shows why the burden has not been carried yet.`
      ],
      [
        `${A}'s rebuttal should press the difference between uncertainty and defeat. A claim can have fuzzy edges and still point to something real, useful, or true enough to act on. The key move is to show that the opponent is demanding an impossible standard or ignoring the best evidence that actually exists. If ${A} cannot do that, the argument collapses into confidence without proof.`,
        `${B}'s rebuttal should press the difference between plausibility and proof. A claim can sound reasonable and still be under-supported. The key move is to show that ${A} has not ruled out simpler explanations, weaker definitions, or important counterexamples. If ${B} cannot do that, the argument becomes skepticism for its own sake.`
      ],
      [
        `${A}'s final pressure point is that the claim does not need perfection to survive. It needs a better account of the question than the alternative. If the evidence, definitions, and examples all point in the same direction, then the claim deserves weight even if some uncertainty remains. The final question is whether the unresolved doubts are strong enough to overturn the central case.`,
        `${B}'s final pressure point is that unresolved doubts are not a side issue; they may be the whole debate. If the key terms are undefined, the evidence is thin, or the examples do not generalize, then the honest answer may be that the claim has not survived yet. The final question is whether ${A} has proven the claim, or only made it sound attractive.`
      ]
    ],
    take: [
      ["The exact claim matters", "A side should not win by defending a safer or vaguer version of the question."],
      ["Definitions do real work", "If the key terms are not clear, both sides may be arguing past each other."],
      ["Uncertainty is not a verdict by itself", "The question is whether the unresolved doubts are strong enough to change the outcome."]
    ],
    strongA: `${A}'s strongest case is that the claim can be made precise enough to test and still survives the strongest objections.`,
    strongB: `${B}'s strongest case is that the claim has not met the standard needed to treat it as settled.`,
    crackA: `${A} cracks if it relies on confidence, intuition, or broad examples without proving the exact claim.`,
    crackB: `${B} cracks if it treats uncertainty as automatic defeat instead of engaging the best version of the claim.`,
    verify: [
      `The exact definition being used for “${question}.”`,
      "Any factual claims or examples used to support either side.",
      "Whether the sides are defending the original claim or a safer nearby claim.",
      "What evidence would actually be enough to change the verdict.",
      "Whether the strongest counterexample has been answered or avoided."
    ],
    changeA: [
      "A sharper definition of the central claim.",
      "Concrete evidence or examples that directly support the exact question.",
      "A direct answer to the strongest counterexample."
    ],
    changeB: [
      "A clearer standard of proof that does not make the question impossible to answer.",
      "A better alternative explanation or counterexample.",
      "Evidence that the pro side is defending a weaker version of the claim."
    ],
    core: `The heat point is whether “${question}” has been defended as written, or whether the debate drifted into easier claims nearby.`,
    comp: [
      "the best direct case for the exact claim",
      "the missing proof and unresolved counterexamples",
      "whether the original question survived, not just a weaker version of it"
    ]
  };
}

function getArgs(question, type, a, b) {
  const l = question.toLowerCase();
  if (l.includes("bald") || (l.includes("hair") && (l.includes("better") || l.includes("than")))) return {
    label: "Personal / Aesthetic",
    icon: "🪞",
    criteria: ["confidence", "style", "maintenance", "identity", "practicality", "personal preference"],
    desc: "This is a personal and aesthetic question. The real answer depends less on objective superiority and more on confidence, maintenance, identity, comfort, and the kind of look the person actually wants to carry.",
    rounds: [
      [
        "Being bald can look cleaner, more intentional, and more confident than trying to fight hair loss. It removes a daily maintenance problem, saves time and money, and can become part of a strong personal style. For some people, baldness reads as sharper and more self-assured than hair ever did.",
        "Having hair gives people more styling options and more ways to shape how they present themselves. Hair can add texture, softness, and variety, and it often feels easier to change than a shaved head. For many people, keeping hair is less about vanity and more about preserving a familiar part of their identity."
      ],
      [
        "The bald side has a practical point: if hair is thinning, patchy, or expensive to manage, going bald can be the cleaner choice. It often looks better when it looks deliberate instead of defensive. The strongest bald argument is that confidence usually beats pretending you do not care.",
        "The hair side has a flexibility point: not everyone wants a fixed look, and hair gives more room to adapt over time. Some people also feel that hair softens appearance, fits their face better, or simply makes them feel more like themselves. The strongest hair argument is that preference matters more than a single style rule."
      ],
      [
        "The final bald case is that better can mean easier, cleaner, and more confident. If the person wants low maintenance and a direct look, bald is often the stronger aesthetic choice. A deliberate bald look can feel stronger than hanging onto hair out of habit.",
        "The final hair case is that better can mean choice, expression, and familiarity. If the person values styling range, identity, or a look that feels more natural to them, hair remains the better fit. The real question is not which is superior in theory, but which better matches the person wearing it."
      ]
    ],
    take: [
      ["Most people assume this is about looks alone", "but this debate revealed that maintenance, confidence, and identity matter just as much."],
      ["This debate revealed that deliberate style can beat default style", "whether that means embracing baldness or keeping hair with intention."],
      ["Most people assume hair is the safer default", "but this debate revealed that the better choice is the one that actually fits the person."]
    ],
    strongA: "Being bald's strongest case is confidence plus simplicity: less maintenance, a cleaner look, and a style that can read as more intentional.",
    strongB: "Having hair's strongest case is flexibility plus identity: more styling options, more familiarity, and a look that can feel more personal.",
    crackA: "Being bald cracks if it is framed as a universal upgrade instead of a deliberate style choice.",
    crackB: "Having hair cracks if it becomes an expensive way to avoid a look the person would actually wear better bald.",
    verify: [
      "The person's face shape, hairline, and current hair condition.",
      "How much maintenance the person actually wants.",
      "Whether the goal is confidence, style variety, or preserving a familiar look.",
      "Whether the person is choosing intentionally or just avoiding a change."
    ],
    changeA: [
      "Visible hair loss or high maintenance costs.",
      "A preference for low-effort grooming.",
      "A style goal that favors sharper, cleaner presentation."
    ],
    changeB: [
      "A face or style that works better with hair.",
      "A strong preference for styling range.",
      "A desire to preserve identity or familiarity."
    ],
    core: "The hinge is whether the person values a cleaner, lower-maintenance look more than keeping the styling options and familiarity that hair provides.",
    comp: [
      "confidence, low maintenance, and a cleaner look",
      "styling flexibility, familiarity, and personal identity",
      "which option actually fits the person better"
    ]
  };
  if (l.includes("bush") && l.includes("obama")) return {
    label: "Presidential Comparison",
    icon: "🏛",
    criteria: ["crisis leadership", "foreign policy", "economic record", "civil liberties", "healthcare", "long-term consequences"],
    desc: "This is a presidential comparison, not a simple personality contest. The real question depends on which standard matters most: crisis leadership, foreign policy judgment, economic stewardship, institutional trust, civil liberties, healthcare, or long-term damage control.",
    rounds: [
      [
        "Bush's strongest case is leadership under immediate crisis. After 9/11, he projected steadiness at a moment when the country was shocked, frightened, and looking for direction. Supporters point to his ability to rally institutions, create a security posture against further attacks, and pass major bipartisan domestic policy like No Child Left Behind and Medicare Part D. The best Bush argument is not that every decision aged well; it is that he faced a uniquely severe national-security rupture and made hard choices under pressure.",
        "Obama's strongest case is repair and restraint. He inherited a financial crisis, two wars, and collapsing public confidence, then stabilized the economy, expanded health coverage through the Affordable Care Act, and restored a calmer style of governance. Supporters argue that his presidency lowered the temperature, improved America's global image, and moved policy forward without creating disasters on the scale of Iraq. The best Obama argument is competence under constraint."
      ],
      [
        "The Obama side cannot treat inherited difficulty as a blank check. Bush also inherited a changed world after 9/11, and presidents do not get to choose their crisis. Obama's foreign policy had its own failures: Libya's aftermath, drone-war expansion, Syria's red-line problem, and a recovery that many working-class voters experienced as slow and uneven. Bush's rebuttal is that Obama looked smoother, but smoothness is not the same as decisive leadership.",
        "The Bush side cannot outrun Iraq. The invasion damaged U.S. credibility, cost enormous lives and money, destabilized the region, and was justified by intelligence claims that did not hold. Add the financial crisis beginning at the end of his presidency, Hurricane Katrina's response, and expanded surveillance powers, and the burden gets heavy. Obama's rebuttal is that Bush's biggest choices created consequences far larger than Obama's biggest failures."
      ],
      [
        "The final Bush case is that history should judge the full presidency, not only Iraq. He responded to the worst attack on U.S. soil in modern history, prevented another attack of that scale during his term, pushed AIDS relief in Africa, expanded prescription drug coverage, and governed with a moral seriousness his supporters still value. If you prioritize resolve during national trauma, Bush remains defensible.",
        "The final Obama case is that the presidency is partly about avoiding catastrophic errors. Obama was not flawless, but his largest achievements were constructive: economic stabilization, healthcare expansion, climate diplomacy, and a less reckless foreign-policy posture. If you weigh long-term damage, institutional competence, and policy durability, Obama has the cleaner record."
      ]
    ],
    take: [
      ["The standard decides the winner", "Crisis resolve favors Bush more than policy durability does."],
      ["Iraq is the central weight", "Any Bush case has to absorb the cost and credibility damage of the Iraq War."],
      ["Obama's case is steadier than flashier", "His strongest argument is stabilization, healthcare, and fewer catastrophic choices."]
    ],
    strongA: "Bush's strongest case is crisis leadership after 9/11, plus major domestic and global-health initiatives that supporters see as under-credited.",
    strongB: "Obama's strongest case is stabilizing the economy, expanding healthcare, restoring steadier governance, and avoiding a foreign-policy error as costly as Iraq.",
    crackA: "Bush cracks hardest on Iraq, Katrina, surveillance, and the financial crisis shadow at the end of his presidency.",
    crackB: "Obama cracks on Libya, drone warfare, Syria, deportations, and an economic recovery many people experienced as uneven.",
    verify: [
      "Economic indicators at the start and end of each presidency.",
      "The human and financial cost of the Iraq War.",
      "Affordable Care Act coverage and durability.",
      "Katrina, Libya, Syria, surveillance, and drone-policy records.",
      "How much credit or blame each president deserves for inherited conditions."
    ],
    changeA: [
      "A stronger argument that post-9/11 security outcomes outweigh Iraq's cost.",
      "Evidence Bush's domestic achievements had more durable benefit than critics admit.",
      "A fair accounting of inherited crisis versus chosen policy mistakes."
    ],
    changeB: [
      "A clearer defense of Obama's foreign-policy failures.",
      "Evidence the recovery and ACA changed ordinary lives more than critics admit.",
      "A direct argument that avoiding catastrophic mistakes should weigh more than crisis resolve."
    ],
    core: "The hinge is whether you judge presidents more by resolve in crisis, or by long-term policy consequences and avoided damage.",
    comp: [
      "resolve after 9/11 and willingness to make hard security choices",
      "economic stabilization, healthcare expansion, and avoiding catastrophic foreign-policy mistakes",
      "whether crisis leadership or long-term consequences matters more"
    ]
  };

  if (l.includes("remote work") || l.includes("office work")) return {
    label: "Practical Decision",
    icon: "🏠🏢",
    criteria: ["productivity", "work-life balance", "culture", "mentorship", "flexibility", "costs"],
    desc: "This debate is about whether remote work should be treated as the better default for office jobs, or whether in-person work still matters enough to justify the commute, the overhead, and the structure. The real pressure point is not ideology; it is which tradeoffs actually matter for the people doing the work.",
    rounds: [
      [
        "Remote work gives people back their time. No commute, fewer interruptions, more control over the day, and a better shot at work-life balance. It also widens the hiring pool and cuts office costs, which matters for both workers and employers. The strongest remote case is not that offices never matter; it is that flexibility and autonomy are real advantages, and many teams now prove they can work well without being in the same room.",
        "Office work still has advantages remote setups struggle to match. People learn faster when they can ask questions in real time, new hires absorb norms more naturally, and casual interactions often create the best ideas. Culture is harder to fake than people think. The strongest office case is not nostalgia; it is that proximity still solves problems that tools and scheduling can only partly patch."
      ],
      [
        "The office side often overstates the loss. Good teams do not magically become collaborative just because they share a building. If the work is mostly focused and digital, the office can become an expensive background habit. The best remote rebuttal is that intentional communication can replace a lot of what people miss, while the benefits in time, cost, and hiring remain concrete.",
        "The remote side often underestimates what gets lost when the default becomes screens. Junior staff can struggle without informal coaching. Loneliness, boundary blur, and weak social ties are real costs, not minor complaints. The best office rebuttal is that flexibility is valuable, but not every role or team can absorb the cultural and coordination tradeoffs without paying for them later."
      ],
      [
        "The final remote case is that the burden should be on the office model to prove why presence is worth the cost. If the job can be done well from anywhere, forcing a commute is not neutral; it is a demand on time, money, and life quality. The stronger the async tools get, the harder it is to justify office presence as the default instead of the exception.",
        "The final office case is that remote work is a tool, not a universal answer. Some jobs need training, trust-building, brainstorming, and fast correction in ways that are still easier in person. The real question is not whether remote work can succeed; it is whether it should replace offices as the standard for every team and every role."
      ]
    ],
    take: [
      ["Most people assume remote work is mainly about convenience", "but this debate revealed that time, autonomy, and hiring flexibility are real business advantages."],
      ["This debate revealed the tradeoff between flexibility and spontaneous collaboration", "and that the value of each depends heavily on the team and the role."],
      ["Most people assume office work automatically creates culture", "but this debate revealed that culture has to be built on purpose either way."]
    ],
    strongA: "Remote work's strongest case is autonomy: fewer commutes, lower costs, wider hiring, and better control over the workday.",
    strongB: "Office work's strongest case is proximity: faster mentorship, easier collaboration, and a stronger shared culture for some teams.",
    crackA: "Remote work cracks when isolation, weak mentorship, and boundary blur start to outweigh the flexibility it promises.",
    crackB: "Office work cracks when the commute, overhead, and lack of flexibility become costs that do not buy enough real coordination.",
    verify: [
      "Productivity metrics across remote, hybrid, and in-office teams.",
      "Retention, burnout, and engagement data.",
      "The cost of office space, commute time, and coordination overhead.",
      "Whether the role depends on fast feedback, training, or deep asynchronous focus."
    ],
    changeA: [
      "Better remote onboarding and mentorship.",
      "Stronger norms for communication and boundaries.",
      "Evidence that remote teams maintain cohesion over time."
    ],
    changeB: [
      "Clear evidence that in-person coordination materially improves output.",
      "A stronger case that junior training depends on proximity.",
      "Proof that culture loss is more costly than the flexibility gained."
    ],
    core: "The hinge is whether flexibility and autonomy outweigh the social, training, and coordination advantages of shared physical space.",
    comp: [
      "flexibility, autonomy, and lower overhead",
      "proximity, mentorship, and spontaneous collaboration",
      "whether the role needs presence badly enough to justify the cost"
    ]
  };

  if (l.includes("bob lazar") || l.includes("lazar")) return {
    label: "Extraordinary Claim",
    icon: "🛸",
    criteria: ["core claim", "corroboration", "documents", "witness reliability", "alternative explanations", "what proof would be enough"],
    desc: "This debate asks whether Bob Lazar is telling the truth about his core claims: secret work near Area 51, recovered craft, non-human technology, and the details he says he witnessed. The question should be taken seriously without treating the story as proven. The real pressure point is whether the corroborating details are strong enough to overcome the missing documentation and disputed background.",
    rounds: [
      [
        "The strongest case for Lazar is not that every detail is proven. It is that some parts of his story have remained unusually persistent and specific over time. He described a secretive program, a site near Area 51, unusual propulsion claims, security procedures, and technical details before the topic became mainstream internet lore. Supporters argue that the consistency of his account, the later public attention around Area 51, and claims of indirect corroboration make it hard to dismiss him as a simple fraud. The best version of this side says the story has enough smoke to deserve serious review.",
        "The strongest case against Lazar is that extraordinary claims require more than a compelling story. The central claims involve recovered non-human craft and secret reverse engineering, which need strong documentation, not just narrative consistency. His education and employment background have been disputed, and the most important claims are hard to verify independently. A person can be interesting, sincere, or partly connected to real places and still be wrong about the central claim. The best skeptical case is that the evidence does not meet the weight of what he is claiming."
      ],
      [
        "The skeptical side is right that documentation matters, but it cannot ignore the pattern of details that supporters see as unlikely guesswork. If Lazar were inventing the entire story, the question becomes how he produced a narrative that stayed culturally durable and seemed to connect with later confirmed secrecy around the area. Missing records can matter less if the environment itself is secretive and records are controlled. The pro side's strongest rebuttal is that lack of public paperwork is not surprising in the exact kind of program Lazar claims to describe.",
        "The secrecy argument can explain missing records, but it can also become unfalsifiable. If every missing document is treated as evidence of a cover-up, the claim becomes impossible to test. The pro side also has to separate details that are impressive from details that are merely compatible with already existing rumors or general knowledge. Area 51 being real does not prove recovered craft. Element 115 later being named does not prove his version of its properties. The skeptical side wins ground by forcing the debate back to the core claim, not the surrounding atmosphere."
      ],
      [
        "The final case for Lazar is that the story should not be dismissed as random nonsense. It has enough specificity, persistence, and cultural impact to justify continued scrutiny. The pro side survives best when it says the case is unresolved, not fully proven. If the standard is whether Lazar may have had access to something real and interpreted it through the story he tells, the yes side remains alive. The strongest version is cautious: he may not have proved everything, but the story has not been cleanly killed either.",
        "The final skeptical case is that the question is not whether Lazar is interesting, consistent, or culturally important. The question is whether he is telling the truth about the core extraordinary claim. On that standard, the missing hard evidence is still the biggest fact in the room. Without records, physical evidence, independently verifiable technical predictions, or stronger witness corroboration, the safest conclusion is that Lazar has not proven his claims. The no side does not need to prove every detail false; it only needs to show the central claim has not carried its burden."
      ]
    ],
    take: [
      ["The core claim matters", "Area 51 secrecy, odd details, and cultural impact do not automatically prove recovered non-human craft."],
      ["Secrecy cuts both ways", "It can explain missing records, but it can also make the claim impossible to test if used too broadly."],
      ["Interesting is not the same as proven", "Lazar may be worth discussing without the strongest version of his story being established."]
    ],
    strongA: "The strongest yes case is the persistence and specificity of Lazar's story, plus the argument that missing records are not surprising if the alleged program was deeply classified.",
    strongB: "The strongest no case is that the central claim is extraordinary and still lacks the kind of hard, independent evidence needed to carry it.",
    crackA: "YES cracks when surrounding details are treated as proof of the central recovered-craft claim.",
    crackB: "NO cracks if it dismisses every odd detail as irrelevant without explaining why some parts of the story appeared to line up with later public knowledge.",
    verify: [
      "Which parts of Lazar's story were documented before they became widely known.",
      "The disputed education and employment claims.",
      "Claims about Los Alamos, Area 51, S4, and who independently corroborated what.",
      "The Element 115 claim and whether later naming of the element actually supports Lazar's version.",
      "Whether any physical evidence, documents, or witnesses directly support the core recovered-craft claim."
    ],
    changeA: [
      "Independent records placing Lazar in the claimed program or facility.",
      "Verifiable witnesses with direct knowledge of the alleged work.",
      "Technical claims that were specific, documented early, and later confirmed in a way not explainable by chance or prior rumor.",
      "Physical evidence with a clear chain of custody."
    ],
    changeB: [
      "Clear evidence that key parts of the story were borrowed from earlier public rumors.",
      "Confirmed contradictions in the timeline or technical claims.",
      "A conventional explanation for the details supporters treat as corroboration.",
      "Evidence that the strongest claimed corroborators did not actually support the core claim."
    ],
    core: "The heat point is whether Lazar's specific and persistent story is enough to overcome the missing hard proof for the central recovered-craft claim.",
    comp: [
      "specificity, consistency, and the possibility of controlled records",
      "missing hard evidence, disputed background, and the burden on extraordinary claims",
      "whether the strongest corroborating details actually reach the core claim"
    ]
  };

  if (type === "product" && l.includes("grok")) return {
    label: "Product Comparison",
    icon: "🔧",
    criteria: ["better for what", "writing", "coding", "current events", "accuracy risk", "tone", "ecosystem"],
    desc: `This is a product comparison. The real question is not which model is universally better. The real question is which tool is better for the user's actual use case: structured work, coding, current events, speed, tone, or reliability.`,
    rounds: [
      [
        "ChatGPT's strongest case is consistency across serious everyday work. For structured writing, coding help, document review, debugging, and planning, it usually gives cleaner formatting and more reliable follow-through. Its advantage is not that it is always smarter than Grok. The advantage is that it behaves more like a dependable general-purpose work tool. If better means the tool most users can trust for professional output, ChatGPT has the stronger default case.",
        "Grok's strongest case is immediacy and personality. It is built around current events, internet culture, X integration, and direct engagement. For users who care about what is happening right now, Grok has an advantage ChatGPT cannot fully copy without live context. It also feels less filtered and more willing to answer in a sharp, conversational style. If better means fast, current, and direct, Grok has a real case."
      ],
      [
        "The live-context advantage is real, but it comes with a cost. The more a model leans on current internet material, the more it risks repeating noise, rumors, and confident mistakes. For professional work, being slightly slower but more structured is often better than being fast and wrong. ChatGPT's caution can be annoying, but in coding, writing, and analysis, caution often protects the output. Grok needs to show its speed does not come at the expense of reliability.",
        "Calling ChatGPT cautious does not automatically make it reliable. Many users experience that caution as friction: hedges, disclaimers, and long setups before the answer. A tool that gives a polished memo when the user wanted a direct answer is not always better. Grok's directness is useful for people who already know how to evaluate information. ChatGPT also hallucinates; it often just does it in a cleaner voice."
      ],
      [
        "The best final case for ChatGPT is that it is the safer default for most work. It may not be the funniest or fastest model, but it is strong across writing, coding, reasoning, and structured assistance. That breadth matters. When the user's goal is to get reliable output they can edit, ship, or build from, ChatGPT remains the stronger general-purpose tool.",
        "The best final case for Grok is that 'most users' is not the same as 'office workers writing formal documents.' Plenty of users care about current events, social context, humor, and direct answers more than polished structure. Grok does not need to beat ChatGPT at every task. It only needs to show that for a large class of real users, its speed, tone, and live awareness matter more."
      ]
    ],
    take: [
      ["Better needs a job", "The comparison only resolves when the use case is named."],
      ["Live context cuts both ways", "Current information is useful, but it also raises the risk of confident errors."],
      ["Tone is a feature", "Directness, humor, and friction matter to real users." ]
    ],
    strongA: "ChatGPT's strongest case is reliability across structured work: writing, coding, planning, document review, and professional output.",
    strongB: "Grok's strongest case is live context and directness: current events, internet culture, X integration, humor, and less-filtered engagement.",
    crackA: "ChatGPT cracks when its caution becomes friction. A careful answer is not always a useful answer.",
    crackB: "Grok cracks on accuracy risk. Real-time awareness is only an advantage if the synthesis is dependable.",
    verify: ["Current feature access for both tools.", "Independent benchmark comparisons.", "Error rates on recent-events questions.", "Pricing and tier limits.", "How much value X integration adds outside the X ecosystem."],
    changeA: ["Controlled writing and coding comparisons.", "Reliability data across repeated prompts.", "Evidence that most users need structured professional output."],
    changeB: ["Evidence Grok's live answers are accurate at scale.", "User data showing current events dominate daily use.", "A directness-versus-error-risk comparison."],
    core: "Neither side wins until better means something specific.",
    comp: ["consistent work output, coding help, and professional reliability", "real-time awareness, personality, and direct answers", "what you need the tool to do this week"]
  };

  if (type === "moral" && l.includes("love")) return {
    label: "Moral / Philosophical",
    icon: "🧠",
    criteria: ["definitions", "lived experience", "biology", "culture", "what counts as real"],
    desc: "This is a philosophical question about whether love is real. The debate turns on what real means: biologically measurable, subjectively experienced, socially constructed, or independently existing.",
    rounds: [
      ["Love is real if real includes inner experience that changes behavior. Pain, grief, joy, and fear cannot be picked up and weighed, but they are not fake. Love changes decisions, bonds people, shapes memory, and has biological patterns behind it. The strongest version of this case does not pretend love is a physical object. It argues that inner experiences can be real in the way human life actually uses the word real.", "Love may be a label for attachment, desire, dependency, habit, loyalty, and social pressure. People clearly feel powerful things, but that does not prove those feelings form one coherent thing called love. What someone calls love at 19 may look nothing like what they call love at 45. Different cultures may divide the same feelings into duty, family bond, attraction, or obligation. The question is whether love is a real thing, or a useful human category."],
      ["The label objection proves too much. Friendship, justice, beauty, grief, and language are also human categories, but we do not treat them as fake just because they are conceptual. If love is a stable pattern of feeling, behavior, attachment, and commitment, then calling it a category does not make it unreal. The opposing side needs to explain why love is uniquely fake while other inner states remain real. Otherwise the argument collapses into saying only physical objects count.", "Consequence is not the same as reality. Hallucinations, phobias, and false beliefs can shape behavior too, but that does not make their content real. The pro side needs a sharper line than 'people feel it and act on it.' It also needs to handle the fact that love is used for romance, family, friendship, pets, ideals, and even objects. A concept that stretches that far may be too vague to prove as one thing."],
      ["Love is not real like a rock. It is real like grief, meaning, fear, or loyalty. Its edges are fuzzy, but the center does not disappear. The fact that biology participates in love does not explain it away; biology is how human experience happens. If subjective experience can be real at all, love clears that bar.", "The honest final position is that people feel powerful things and call some of them love. Whether that label names a real thing depends entirely on the definition of real. The pro side made love meaningful and consequential, but not necessarily real in a stronger sense. If the question requires more than intensity, biology, and social recognition, the verdict remains unresolved."]
    ],
    take: [["The debate is about real", "Both sides agree people feel something. They disagree about what kind of thing it is."], ["Neurochemistry does not settle it", "Biology can describe love without explaining it away."], ["Fuzzy edges do not erase the center", "Many meaningful concepts are hard to define at the edges."]],
    strongA: "Love Is Real's strongest case is that subjective experiences can be real when they are stable, consequential, biologically grounded, and recognizable across human life.",
    strongB: "Love Isn't Real's strongest case is that love may be a broad label placed on several different feelings rather than one coherent thing.",
    crackA: "Love Is Real cracks when consequence is treated as proof. Consequential experiences can still be mistaken or miscategorized.",
    crackB: "Love Isn't Real cracks when the label argument proves too much. Many real human concepts are labels for clusters of experience.",
    verify: ["Claims that love is only chemistry.", "Claims that love is cross-cultural.", "Claims that love is socially constructed.", "The definition of real used by each side.", "Whether neurochemistry explains love away or describes how it works."],
    changeA: ["A definition of real that includes subjective experience.", "Cross-cultural evidence that love appears as a stable pattern.", "Evidence love is not reducible to chemistry alone."],
    changeB: ["A stricter definition of real that does not exclude pain or grief.", "Evidence love means radically different things across cultures.", "A stronger boundary argument against fuzzy categories."],
    core: "The unresolved question is what real means. Until both sides agree on that definition, they answer different questions with the same word.",
    comp: ["subjective experience, biology, and behavior", "a stricter definition of reality than felt intensity", "which definition of real you find most honest"]
  };

  if (type === "extraordinary") return {
    label: "Extraordinary Claim",
    icon: "🛸",
    criteria: ["evidence quality", "alternative explanations", "source reliability", "sensor data", "what proof would be enough"],
    desc: "This debate asks whether UAPs are most likely advanced non-human technology. The question should be taken seriously without treating the extraordinary claim as proven.",
    rounds: [
      ["The strongest case is not certainty. It is that some cases involve trained observers, multiple sensors, and behavior that does not fit known public platforms. Official acknowledgment matters because it moves the topic out of pure rumor and into documented anomaly. The pro side does not need to claim every sighting is exotic. It needs to show that the strongest remaining cases are better explained by something beyond known human systems.", "Unexplained does not mean non-human. Sensor error, misidentification, classified platforms, drones, and incomplete data remain more likely before the evidence is strong enough to move the needle. The strongest skeptical case takes the reports seriously without jumping to origin. The burden is not to explain every case from the couch. The burden is on the extraordinary claim to show why conventional categories are not enough."],
      ["Conventional explanations cannot just be asserted like a magic eraser. If a case includes multiple sensors, trained observers, and investigation without resolution, the skeptical side has to do more than list possible mundane causes. Possibility is not explanation. The question is whether those causes were actually tested and failed in the strongest cases. If they were, the prior should update.", "Most public cases do not give us enough raw data to rule out conventional explanations. We often lack calibration records, sensor metadata, full context, and chain of custody. That matters. A case can stay unexplained because it is extraordinary, or because the data is too incomplete to explain rigorously. The pro side is treating a gap in public explanation as stronger than it is."],
      ["Some cases remain genuinely anomalous, and that matters. If the best cases have survived normal explanation attempts, then non-human technology should remain on the table. The skeptic cannot win by saying 'maybe classified' forever, because that becomes its own extraordinary claim after enough time. The final issue is whether the strongest cases are merely unknown, or whether they point toward technology outside known human capability.", "The honest position is that anomalies are real, but the evidence is not strong enough to make non-human technology the most likely answer. The phrase 'most likely' is doing the hard work. A claim can be possible, worth investigating, and still not be the best explanation yet. Until raw data, independent review, and conventional exclusions are clearer, the skeptical position survives." ]
    ],
    take: [["Unexplained is not non-human", "An anomaly can be real without its origin being settled."], ["Official acknowledgment raises the question", "It does not answer the question."], ["The proof standard matters", "Neither side fully defined what would settle it."]],
    strongA: "Non-Human Tech's strongest case is the subset of multi-sensor, multi-observer cases that remain unresolved after official attention.",
    strongB: "Conventional's strongest case is the gap between unexplained and most likely non-human.",
    crackA: "Non-Human Tech cracks when it treats missing public explanation as proof of exotic origin.",
    crackB: "Conventional cracks when it lists possible explanations without showing they actually fit the strongest cases.",
    verify: ["What multi-sensor means in each case.", "Whether conventional explanations were tested and failed.", "Raw sensor data, calibration, and chain of custody.", "AARO findings and public conclusions."],
    changeA: ["Clear multi-sensor data with verified calibration.", "Independent review with chain of custody.", "Conventional explanations tested and eliminated."],
    changeB: ["A confirmed mundane explanation for the strongest cases.", "Raw data showing sensor error or misread performance.", "A transparent investigation methodology."],
    core: "The unresolved question is whether remaining cases exceed known human capability, or whether the evidence is too incomplete for an extraordinary conclusion.",
    comp: ["documented anomalies not fully explained", "the rule that unexplained is not non-human", "what proof would actually be enough"]
  };

  if (type === "policy" && l.includes("gun")) return {
    label: "Policy Debate",
    icon: "⚖",
    criteria: ["public safety", "rights", "enforcement", "self-defence", "illegal markets", "evidence"],
    desc: "This is a policy debate about firearm harm and tradeoffs. It should stay specific to public safety, enforcement, self-defence, illegal markets, and civil liberties.",
    rounds: [["Gun control can reduce harm when it targets known risk points: background checks, domestic violence restrictions, permit-to-purchase, safe storage, and red flag laws with due process. The strongest version is not 'ban everything.' It is targeted risk reduction. Firearm suicide, domestic violence, and impulsive violence are areas where access matters. A policy does not need to eliminate all harm to reduce meaningful harm.", "Gun control can fail by burdening lawful owners while illegal markets and criminal intent remain. Rural self-defence, delayed police response, and civil liberties are not side issues. The strongest skeptical case is not that every regulation is evil. It is that each restriction must prove it reduces harm enough to justify enforcement costs and rights tradeoffs."], ["The illegal market objection does not apply equally to every measure. Safe storage and domestic violence restrictions target risk moments, not only criminal supply. Background checks and permit systems can reduce legal leakage into dangerous hands. The skeptical side needs to distinguish weak proposals from stronger ones instead of treating gun control as one big category.", "International examples are not plug-and-play. The United States has a massive existing gun supply, different legal constraints, and enforcement challenges. A policy that worked elsewhere may not scale cleanly. The pro side needs to show which specific policy works under local conditions, not just that other countries have lower gun deaths."], ["The best case is targeted measures with evidence and guardrails. Permit-to-purchase, domestic violence restrictions, safe storage, and properly designed red flag laws are the strongest ground. The goal is not symbolic control. The goal is fewer deaths while preserving due process and legitimate ownership.", "The best skeptical case is requiring each measure to prove itself. Some laws may reduce harm; others may be symbolic or poorly enforced. A serious policy debate should separate background checks from assault weapon bans from storage laws from red flag laws. The tradeoffs are not identical." ]],
    take: [["Specific measures matter", "Gun control is not one policy."], ["Self-defence and harm reduction both matter", "The strongest arguments acknowledge the other side's concern."], ["Evidence must fit context", "International comparisons need care."]],
    strongA: "Reduces Harm's strongest case is targeted access control at known risk points.",
    strongB: "Tradeoff Skeptic's strongest case is that enforcement burden, rights costs, and illegal market substitution vary by policy.",
    crackA: "Reduces Harm cracks when international comparisons ignore local starting conditions.",
    crackB: "Tradeoff Skeptic cracks when skepticism becomes categorical opposition to every specific measure.",
    verify: ["Permit-to-purchase outcomes by state.", "Red flag law effects on suicide and homicide.", "Illegal firearm sourcing data.", "Domestic violence and firearm access studies."],
    changeA: ["State-level evidence that specific measures reduce deaths.", "Proof substitution does not erase benefits.", "Strong due-process protections."],
    changeB: ["Evidence stricter laws fail to reduce overall harm.", "Data showing substitution offsets restrictions.", "Evidence enforcement burdens outweigh benefits."],
    core: "The dispute is which specific firearm measures reduce harm enough to justify their tradeoffs.",
    comp: ["preventing firearm deaths through targeted access rules", "protecting self-defence, legal ownership, and enforcement fairness", "which policies have clean enough evidence"]
  };

  if (l.includes("remote work") || l.includes("office work")) return {
    label: "Practical Decision",
    icon: "🎯",
    criteria: ["productivity", "collaboration", "commuting cost", "focus", "mentorship", "culture", "job type"],
    desc: "This is a practical work-design question. The answer depends on the work being done, the worker's home setup, team maturity, management quality, and how much collaboration is truly needed.",
    rounds: [
      ["Remote work is better when the work rewards focus, written communication, and autonomy. It removes commuting time, expands hiring pools, gives people more control over energy and family obligations, and often makes deep work easier. The strongest version is not that offices are useless. It is that many office rituals were convenience for managers, not proof of productivity.", "Office work is better when the work depends on rapid feedback, trust-building, mentoring, and shared context. New employees learn faster when they can overhear, ask quick questions, and read the room. The strongest office case is not nostalgia. It is that some collaboration costs are invisible until the team has already become slower, lonelier, and more fragmented."],
      ["The office side is treating weak remote management as a problem with remote work itself. Good remote teams write decisions down, make meetings intentional, and measure output instead of chair time. Offices also have hidden costs: interruptions, performative busyness, commuting stress, and geographic exclusion. If culture only works when everyone is in the same building, the culture may be brittle.", "The remote side underrates informal learning. Documentation helps, but it does not fully replace watching how experienced people handle conflict, ambiguity, and judgment calls. Remote work also shifts costs onto workers: home space, loneliness, blurred boundaries, and career invisibility. Output can look fine in the short term while mentoring and trust decay over time."],
      ["The strongest final case for remote work is that it is the better default for mature teams doing knowledge work that can be evaluated by results. It gives people back time and forces organizations to become clearer. Offices should be used deliberately for onboarding, planning, and relationship-building, not treated as proof of seriousness.", "The strongest final case for office work is that some kinds of work are social systems, not just task pipelines. If the team needs apprenticeship, fast coordination, or high-trust problem solving, physical presence can create value remote tools struggle to reproduce. The real answer may be hybrid by design, not remote or office by ideology."]
    ],
    take: [["The job matters", "Remote work is stronger for focus-heavy roles; office work is stronger for apprenticeship and fast coordination."], ["Management quality decides a lot", "Bad meetings and unclear expectations damage both models."], ["Hybrid needs purpose", "A vague three-days-in-office rule is weaker than intentional in-person use."]],
    strongA: "Remote Work's strongest case is autonomy plus deep work: less commuting, wider talent access, and more control over energy and time.",
    strongB: "Office Work's strongest case is social learning: mentorship, trust, fast feedback, and shared context.",
    crackA: "Remote Work cracks when it ignores isolation, boundary problems, and the needs of junior workers.",
    crackB: "Office Work cracks when it confuses visibility with productivity and treats commuting as free.",
    verify: ["Productivity data by role and industry.", "Retention and promotion outcomes for remote workers.", "Onboarding outcomes for junior employees.", "Actual commute time and cost.", "Meeting load and documentation quality."],
    changeA: ["Evidence remote workers perform better in this specific role.", "Strong async documentation and manager training.", "Clear plans for mentorship and career visibility."],
    changeB: ["Evidence in-person work improves outcomes beyond manager preference.", "A commute-aware office policy.", "Clear use of office days for collaboration, not attendance."],
    core: "The heat point is whether the work needs shared physical context, or whether the office is being used as a proxy for trust.",
    comp: ["autonomy, focus, and lower life friction", "mentorship, trust-building, and fast shared context", "which parts of the job actually require presence"]
  };

  if (l.includes("seed oil")) return {
    label: "Scientific / Factual",
    icon: "🔬",
    criteria: ["dose", "replacement food", "human outcomes", "mechanism", "confounding", "diet context"],
    desc: "This is a nutrition evidence question. The serious version separates seed oils themselves from ultra-processed foods, calorie surplus, frying damage, and social-media certainty.",
    rounds: [
      ["The strongest case against seed oils is that they are easy to overconsume inside ultra-processed foods and are often used in products that displace whole foods. Critics also argue that high omega-6 intake may influence inflammatory pathways and that repeated heating can create oxidation products. The best version does not say a spoonful of canola oil is poison. It says modern diets may overload cheap refined oils in unhealthy food environments.", "The strongest defense is that seed oils are not uniquely harmful in human outcome data when compared with saturated fats or butter. Many claims online leap from mechanisms to disease conclusions without controlled evidence. If seed oils show up in unhealthy diets, that may be because they are in chips, fast food, and baked goods, not because the oil itself is the causal villain."],
      ["The defender cannot wave away mechanism entirely. Nutrition history is full of cases where population averages hid harm in subgroups or at high exposure. Reheated restaurant oils, oxidized oils, and heavy reliance on ultra-processed foods are not the same as using a fresh oil at home. The anti-seed-oil side gains ground when it narrows the claim to dose, processing, and food context.", "The critic's narrower claim is more reasonable, but it also gives up the viral claim that seed oils are broadly toxic. If the real warning is 'avoid fried ultra-processed foods,' then seed oils are not the central enemy. The burden is to show that replacing seed oils with butter, tallow, or coconut oil improves real health outcomes, not just vibes about ancestral eating."],
      ["The final case against seed oils is caution about the modern dose and processing context. A diet built around packaged foods and repeatedly heated oils is plausibly worse than one built around whole foods and minimally processed fats. The strongest claim is not panic; it is that seed oils deserve scrutiny when they dominate the food supply.", "The final defense is that seed oils have been made into a scapegoat. The best evidence still points toward overall diet quality, calories, fiber, protein, and saturated-fat replacement as bigger levers. If someone wants to improve health, cutting fried and ultra-processed foods makes sense. Treating seed oils as uniquely dangerous is not established."]
    ],
    take: [["Context matters", "Seed oils in whole-food cooking are not the same question as seed oils in fried ultra-processed foods."], ["Mechanism is not outcome", "Inflammation pathways alone do not prove population harm."], ["The replacement matters", "What you eat instead changes the verdict."]],
    strongA: "Seed Oils Bad's strongest case is dose and processing context: modern diets may overload refined oils through ultra-processed foods.",
    strongB: "Not Uniquely Bad's strongest case is that human outcome evidence does not support treating seed oils as uniquely toxic.",
    crackA: "Seed Oils Bad cracks when it treats mechanisms and online anecdotes as settled disease evidence.",
    crackB: "Not Uniquely Bad cracks if it ignores repeated heating, oxidation, and ultra-processed food context.",
    verify: ["Controlled trials comparing seed oils with saturated fats.", "Whether claims are about fresh oils, fried oils, or packaged foods.", "Actual omega-6 intake levels.", "Outcome data rather than biomarkers alone.", "What replacement fat or food is being proposed."],
    changeA: ["Strong human outcome data showing harm from seed oils independent of processed-food context.", "Dose-response evidence.", "Evidence replacement fats improve outcomes."],
    changeB: ["Better evidence about harm from repeatedly heated oils.", "Evidence certain subgroups respond poorly.", "Proof current intake levels create risks not captured by broad studies."],
    core: "The dispute is whether seed oils are a causal health problem themselves, or mostly a marker of poor overall diet quality.",
    comp: ["caution about modern refined-oil exposure", "human outcome evidence over mechanistic speculation", "whether the target is the oil or the food pattern"]
  };

  if (l.includes("free will")) return {
    label: "Moral / Philosophical",
    icon: "🧠",
    criteria: ["definition of freedom", "causation", "responsibility", "conscious choice", "predictability", "moral practice"],
    desc: "This is a philosophy question about what kind of freedom humans can have in a causal universe. The debate turns on whether free will means uncaused choice or meaningful agency within causes.",
    rounds: [
      ["Free will is an illusion if every choice arises from prior causes: genetics, environment, brain state, incentives, memory, and unconscious processing. You do not choose your desires before you have them. You become aware of a decision after a vast amount of machinery has already shaped it. The strongest illusion case says responsibility may be useful, but ultimate authorship is not real.", "Free will is not an illusion if freedom means acting through your reasons, values, and deliberation rather than being externally forced. A choice can be caused and still be yours. The strongest compatibilist case says the demand for an uncaused self is incoherent. Agency does not require magic; it requires that your actions flow from your own reflective system."],
      ["Calling caused action 'yours' does not solve the authorship problem. Your reflective system was also built by causes you did not choose. If a person could not have become otherwise under identical conditions, blame and desert become shaky. The no-free-will side presses that compatibilism often preserves the language of freedom while abandoning the thing people think they mean.", "The illusion side sets an impossible standard. If freedom requires stepping outside causality, then no coherent creature could ever be free. Moral responsibility can track responsiveness to reasons, capacity for self-control, and ability to learn. We do not need ultimate authorship to distinguish a deliberate act from a seizure, coercion, or accident."],
      ["The final illusion case is that our feeling of authorship outruns what the evidence and logic justify. We can still punish, rehabilitate, and protect society, but we should drop the metaphysical story that people are ultimate originators of themselves. That shift makes responsibility more humane and less vengeful.", "The final anti-illusion case is that free will survives once defined carefully. Humans deliberate, respond to reasons, form intentions, and change behavior. That is the kind of freedom moral life actually needs. The demand for uncaused choice is not a serious standard; it is a trap that makes agency impossible by definition."]
    ],
    take: [["Definition controls the debate", "Libertarian free will and compatibilist free will are different targets."], ["Causation is not automatically coercion", "A caused choice may still be meaningfully yours."], ["Responsibility can be redesigned", "Even skeptics can defend accountability without ultimate desert."]],
    strongA: "Illusion's strongest case is that no one chooses the prior causes that shape their desires and decisions.",
    strongB: "Not Illusion's strongest case is compatibilism: freedom means acting through reasons and values, not escaping causality.",
    crackA: "Illusion cracks if it treats all caused behavior as equally unfree.",
    crackB: "Not Illusion cracks if it changes the definition of free will too far from ordinary meaning.",
    verify: ["Which definition of free will is being debated.", "Neuroscience claims about unconscious decision-making.", "Whether moral responsibility requires ultimate desert.", "Examples involving coercion, addiction, and deliberation."],
    changeA: ["A stronger account of why compatibilist freedom is insufficient.", "Evidence conscious deliberation is mostly post-hoc.", "A practical accountability model without free will."],
    changeB: ["A definition of freedom that preserves real responsibility.", "A response to the luck objection.", "Examples where deliberation changes outcomes meaningfully."],
    core: "The hinge is whether free will requires ultimate authorship, or whether reason-responsive agency is enough.",
    comp: ["the causal history behind every choice", "practical agency, deliberation, and responsibility", "which definition of freedom you are willing to defend"]
  };

  if (l.includes("college") && l.includes("free")) return {
    label: "Policy Debate",
    icon: "⚖",
    criteria: ["access", "funding", "fairness", "completion rates", "labor market", "opportunity cost"],
    desc: "This is an education policy debate. The key issue is whether universal free college expands opportunity enough to justify the cost and tradeoffs.",
    rounds: [
      ["Free college is strongest as an opportunity argument. A society that requires advanced credentials for stable careers should not lock those credentials behind debt. Tuition-free public college could widen access, reduce risk for low-income students, and let graduates make career choices without debt pressure. The best version also treats education as public infrastructure, not just a private consumer good.", "The case against universal free college is that it may subsidize many people who would have gone anyway while ignoring students who need housing, food, childcare, transportation, or vocational routes. Tuition is only one barrier. A universal program can be expensive, regressive in practice, and politically easier than fixing completion rates or funding targeted support."],
      ["Targeting sounds efficient, but it often creates bureaucracy, stigma, and cliff effects. Universal systems are easier to understand and defend politically. Free tuition also changes expectations: students from families without college history may apply because the sticker shock is gone. The pro side gains ground when it focuses on public colleges and pairs tuition with completion support.", "The universal side still has to answer scarcity. Public dollars spent making college free for affluent families are dollars not spent on early childhood, community colleges, apprenticeships, or direct aid to poor students. If the goal is mobility, targeted grants and living-cost support may outperform free tuition alone. The policy should solve the bottleneck, not the slogan."],
      ["The final case for free college is that broad access changes the social contract. Public K-12 exists because basic education became necessary for citizenship and work. If postsecondary education now plays that role, public funding should follow. The best plan is tuition-free public college with quality controls and support for completion.", "The final case against universal free college is not anti-education. It is pro-targeting. The people most blocked from opportunity often need more than tuition relief, and non-college paths matter too. A serious policy should fund the students with the highest barriers and the programs with the best outcomes, not declare one universal promise and call the problem solved."]
    ],
    take: [["Tuition is not the only barrier", "Living costs and completion support may matter more for many students."], ["Universal programs are politically durable", "They can also subsidize people who need help least."], ["College is not the only path", "A good policy must respect vocational and apprenticeship routes."]],
    strongA: "Free College's strongest case is access without debt in an economy where credentials matter.",
    strongB: "Targeted Aid's strongest case is that universal tuition relief may miss the students with the biggest barriers.",
    crackA: "Free College cracks when it ignores cost, capacity, and non-tuition barriers.",
    crackB: "Targeted Aid cracks if targeting becomes complex enough to exclude the people it means to help.",
    verify: ["Program cost and funding source.", "Who benefits by income level.", "Completion-rate effects.", "Living-cost barriers.", "Outcomes for community college and vocational tracks."],
    changeA: ["A funded plan with completion support.", "Evidence free tuition raises enrollment and graduation for low-income students.", "Safeguards against tuition inflation or quality decline."],
    changeB: ["Evidence targeted aid improves mobility more per dollar.", "A simpler aid design with low administrative burden.", "Investment in non-college pathways."],
    core: "The dispute is whether college should become universal public infrastructure, or whether scarce education dollars should be targeted more tightly.",
    comp: ["broad access and debt reduction", "targeted mobility and fiscal tradeoffs", "whether tuition is the binding constraint"]
  };

  if (l.includes("pineapple on pizza")) return {
    label: "Taste Debate",
    icon: "🍕",
    criteria: ["balance", "texture", "tradition", "contrast", "personal taste", "culinary coherence"],
    desc: "This is a low-stakes taste debate, but it still has structure: whether sweet-acid fruit belongs with cheese, tomato, and savory toppings.",
    rounds: [
      ["Pineapple on pizza is acceptable because pizza is already built on contrast: salty cheese, acidic tomato, rich fat, crisp crust, and toppings that cut through heaviness. Pineapple adds sweetness and acidity, especially when paired with ham, bacon, jalapeno, or chili. The strongest case is not that everyone must like it. It is that the combination has a coherent flavor logic.", "Pineapple on pizza is not acceptable because it can hijack the slice. The sweetness is loud, the moisture can soften the crust, and the fruit texture clashes with melted cheese. The strongest anti-pineapple case is not food snobbery. It is that some contrasts integrate, while others distract from what pizza does best."],
      ["The moisture objection is really a preparation objection. Bad pineapple pizza is bad; that does not make the category invalid. Thin pieces, proper draining, and salty or spicy partners solve most of the problem. Pizza has absorbed stranger toppings than pineapple. If barbecue sauce, hot honey, and fruit in salads are allowed, sweet-acid contrast cannot be banned on principle.", "The pro side keeps moving from 'possible' to 'good.' Yes, a skilled cook can make almost anything work. The question is whether pineapple improves pizza often enough to be acceptable as a normal topping. Too often it turns a savory food into a confused sweet snack. Novelty is not the same as balance."],
      ["The final pro-pineapple case is modest: acceptable means defensible, not mandatory. Pineapple has a clear role when balanced with salt, heat, and fat. People can dislike it, but calling it unacceptable is too broad. It belongs in the topping universe.", "The final anti-pineapple case is that pizza's best versions do not need fruit syrup energy. Pineapple can work under narrow conditions, but as a default topping it usually dominates more than it harmonizes. Acceptable personally, maybe. Culinarily suspect, still."]
    ],
    take: [["Acceptable is a low bar", "The pro side does not need to prove pineapple is the best topping."], ["Execution matters", "Drain, slice size, and pairing change the result."], ["Taste debates hide definitions", "Personal acceptability and culinary coherence are different standards."]],
    strongA: "Acceptable's strongest case is flavor contrast: sweet acid can balance salt, fat, and heat.",
    strongB: "Not Acceptable's strongest case is domination: pineapple often overwhelms texture and savory balance.",
    crackA: "Acceptable cracks when it treats any contrast as automatically good.",
    crackB: "Not Acceptable cracks when it turns personal dislike into a universal rule.",
    verify: ["Whether the pineapple is fresh, canned, drained, or cooked.", "Pairing toppings like ham, jalapeno, or bacon.", "Whether acceptable means personally enjoyable or culinarily coherent."],
    changeA: ["A version that controls moisture and pairs with salt or heat.", "Blind tasting across several topping combinations.", "A clear standard for acceptable."],
    changeB: ["Evidence pineapple usually worsens texture or balance.", "A distinction between dislike and culinary incoherence.", "A better account of why sweet toppings are categorically different."],
    core: "The heat point is whether pineapple creates useful contrast or just overwhelms the slice.",
    comp: ["sweet-acid contrast and playful topping rules", "savory balance, texture, and tradition", "whether acceptable means 'works sometimes' or 'belongs by default'"]
  };

  if (l.includes("age-gated") || (l.includes("social media") && l.includes("under 16"))) return {
    label: "Policy Debate",
    icon: "⚖",
    criteria: ["youth mental health", "enforcement", "parental rights", "privacy", "platform design", "evasion risk"],
    desc: "This is a youth-safety policy debate. The question is whether banning or restricting social media access for teens under 16 reduces meaningful harm enough to justify enforcement costs, privacy tradeoffs, and limits on parental discretion.",
    rounds: [
      ["Social media should be age-gated for teens under 16 because the strongest harms cluster early: comparison pressure, bullying, algorithmic compulsion, sexual exploitation risk, and identity formation under permanent visibility. A hard age floor is blunt, but it is also legible. Platforms have repeatedly failed to self-police youth exposure. The strongest case is not that every teen is harmed; it is that the default product design is unsafe for developing brains and that society should not treat childhood attention as an open market.", "Social media should not be age-gated under 16 because bans are easy to evade, hard to verify without invasive age checks, and likely to push teens into less supervised spaces. Parents, schools, and platform design reforms may work better than a categorical cutoff. The strongest skeptical case is that enforcement creates privacy costs, false blocks for legitimate users, and a false sense of safety while harm continues off-platform."],
      ["The enforcement objection is real but not decisive. Many laws are imperfectly enforced and still change norms, product design, and corporate incentives. Age-gating can combine with parental override, graduated access, and platform liability rather than pretending one switch solves everything. The pro side gains ground when it treats the policy as a floor for corporate behavior, not a fantasy of perfect compliance.", "The pro side still has to answer what happens when teens use VPNs, borrow accounts, or migrate to platforms with even weaker safeguards. Age verification also pressures companies to collect more identity data, which creates its own youth risk. A policy that sounds protective can become a surveillance mandate. The skeptical side wins when it forces the debate onto workable enforcement, not moral urgency alone."],
      ["The final case for age-gating is that childhood deserves a higher protection standard than adult consumer choice. If the product is engineered for compulsion and social comparison, waiting until damage is obvious is too late. A clear under-16 restriction gives regulators, parents, and platforms a shared line: this audience is not the default market.", "The final case against age-gating is that the harms are real but the tool is mismatched. Better youth defaults, parental tools, algorithm transparency, and liability for predatory design may reduce harm without building a nationwide identity-checking layer around teenage life. The question is whether a ban is the best fix or the most visible one."]
    ],
    take: [["Enforcement is part of the policy", "A youth ban that cannot be implemented may be symbolism, not safety."], ["Platform incentives matter", "Age limits only help if they change design and corporate behavior."], ["Parental discretion is a real value", "Families do not all agree on when a teen is ready."]],
    strongA: "Age-Gate's strongest case is that early-teen brains face unique risks from compulsion, comparison, and permanent visibility on engagement-driven platforms.",
    strongB: "No Age-Gate's strongest case is that bans are evaded easily, age checks raise privacy costs, and design reform may target the harm more precisely.",
    crackA: "Age-Gate cracks if it assumes compliance without changing platform incentives or offering safer alternatives.",
    crackB: "No Age-Gate cracks if it treats parental discretion as enough while platforms keep optimizing for youth capture.",
    verify: ["Mental-health outcomes by age and usage pattern.", "How age verification would work in practice.", "Evasion rates in comparable jurisdictions.", "Whether design reforms alone reduce youth harms.", "Parental override and graduated-access models."],
    changeA: ["Evidence age limits reduce harm in comparable countries.", "A credible enforcement model with minimal surveillance.", "Platform liability tied to youth-safe defaults."],
    changeB: ["Evidence design reforms outperform bans.", "Data on evasion and off-platform migration.", "A youth-safety plan that preserves privacy and parental choice."],
    core: "The hinge is whether a hard under-16 restriction reduces youth harm enough to justify enforcement costs and limits on access.",
    comp: ["youth protection, mental health, and corporate accountability", "privacy, parental discretion, and workable enforcement", "whether a ban changes behavior or just moves it"]
  };

  if (l.includes("social media") && !l.includes("under 16") && !l.includes("age-gated")) return {
    label: "Policy Debate",
    icon: "⚖",
    criteria: ["mental health", "connection", "information quality", "business incentives", "youth harms", "civic impact"],
    desc: "This debate asks whether social media's benefits in connection and information outweigh its harms in attention, mental health, misinformation, and incentives.",
    rounds: [
      ["Social media does more harm than good because its dominant platforms are optimized for attention, not wellbeing or truth. They reward outrage, comparison, addictive scrolling, and shallow engagement. For young people especially, the mix of social pressure, algorithmic feeds, and permanent visibility can amplify anxiety and bullying. The strongest harm case focuses on incentives: the business model profits from capture.", "Social media does more good than harm because it gives ordinary people access to connection, audiences, information, organizing power, and support communities that did not exist at scale before. It helps isolated people find peers, lets small creators build businesses, and spreads emergency information quickly. The strongest good case is that the tool is not one thing; harms come from design choices and usage patterns."],
      ["Calling it a tool understates the power of default design. A hammer does not study your behavior and optimize itself to keep you swinging. Social platforms use ranking systems that shape attention at population scale. Yes, communities and creators benefit, but those benefits are bundled with systems that monetize compulsion and conflict. The pro-social side needs to show the gains are not outweighed by the externalities.", "The harm side risks blaming the medium for broader social problems: loneliness, polarization, bad parenting, weak institutions, and sensational media all predate social platforms. Social media also exposes problems that were already there. The answer is better design, age safeguards, user control, and media literacy, not pretending society would be healthier if everyone returned to gatekeepers."],
      ["The final harm case is that social media's upside is real but not enough to excuse the dominant incentive structure. A platform can connect people and still damage attention, trust, and youth wellbeing at scale. Until feeds are designed around user welfare rather than engagement, the net effect leans harmful.", "The final good case is that social media is too broad to condemn as a category. Private groups, creator tools, crisis updates, niche education, and marginalized communities are genuine goods. The net verdict depends on platform design and user age. Reform the incentives; do not declare the entire medium a net loss."]
    ],
    take: [["The business model matters", "Engagement optimization is central to the harm case."], ["The category is broad", "Private communities and algorithmic feeds should not be treated as identical."], ["Youth changes the calculus", "Age, supervision, and design make the harms uneven."]],
    strongA: "More Harm's strongest case is that attention-based algorithms monetize outrage, comparison, and compulsion.",
    strongB: "More Good's strongest case is access: connection, organizing, creator income, support communities, and information flow.",
    crackA: "More Harm cracks if it treats all social media use as equivalent.",
    crackB: "More Good cracks if it ignores the incentives behind addictive and polarizing design.",
    verify: ["Mental-health evidence by age and usage type.", "Differences between active community use and passive scrolling.", "Platform design changes and outcomes.", "Misinformation spread data.", "Benefits for creators and support communities."],
    changeA: ["Evidence harms persist across healthier designs.", "Data showing net civic or mental-health damage.", "Age-specific harm estimates."],
    changeB: ["Evidence design reforms reduce harms materially.", "Data on benefits for isolated users and small creators.", "A credible plan for youth safeguards."],
    core: "The dispute is whether social media's connection benefits outweigh the harms created by engagement-driven design.",
    comp: ["mental health, attention, and civic trust", "connection, opportunity, and access to information", "which platform designs and user groups you are judging"]
  };

  if (l.includes("money") && l.includes("root")) return {
    label: "Moral / Philosophical",
    icon: "🧠",
    criteria: ["incentives", "human desire", "power", "scarcity", "virtue", "systems"],
    desc: "This is a moral question about whether money causes evil or merely turns existing human desires into larger, more organized systems of harm.",
    rounds: [
      ["Money is the root of evil when it turns harm into a business model. A landlord can ignore repairs because eviction is profitable. A company can steal wages in tiny amounts because workers cannot afford a lawyer. A politician can take donor money, write loopholes, and call it policy. Medical debt, payday loans, union-busting, dark-money ads, and pollution treated as an externality all show the same pattern: money gives greed a machine.", "Money is not the root of all evil because the worst human impulses do not need a currency symbol. People kill for ideology, status, revenge, religion, fear, land, and belonging. Money can corrupt, but it can also build hospitals, fund disaster relief, pay teachers, support artists, and let strangers cooperate without violence. The root is not money itself; it is desire without restraint and power without accountability."],
      ["Calling money neutral ignores how it changes the room. When healthcare, shelter, legal defense, and political access all depend on money, morality becomes easier to buy out. A rich person can delay a lawsuit until the other side collapses. A corporation can budget for fines as a cost of doing business. Markets can turn exploitation into paperwork and make cruelty look like efficiency.", "The pro side proves that money can scale harm, but not that it is the root. The same patterns appear without money: dictatorships use fear, cults use belonging, mobs use status, and empires use force. Money is one technology of power among several. If the real problem is concentrated power and weak accountability, blaming money alone lets other forms of domination escape the spotlight."],
      ["The final case for Root Of Evil is that modern evil usually needs logistics, lawyers, marketing, debt, lobbying, or silence bought in advance. Money does not invent greed, but it professionalizes it. It lets someone harm people they never meet, profit from the distance, and call the result normal. That makes money more than a tool; it is the operating system for a lot of ordinary cruelty.", "The final case against is that money is an amplifier, not the origin. Remove money and people still chase rank, control, purity, revenge, and security. The better target is not money itself but rules that stop wealth from buying law, dignity, safety, and truth. Money can serve human life when institutions keep it subordinate. It becomes evil when it becomes the master."]
    ],
    take: [["Money makes harm scalable", "The strongest Root side points to systems: lobbying, debt, wage theft, fines, and externalized damage."], ["The deeper motive still matters", "Greed, fear, status, and domination can exist without money."], ["Power is the bridge", "Money becomes dangerous when it buys law, time, silence, or immunity."]],
    strongA: "Root Of Evil's strongest case is that money turns greed into infrastructure: debt traps, political capture, wage theft, and corporate harm priced in as a business cost.",
    strongB: "Not The Root's strongest case is that money amplifies deeper motives rather than creating them: fear, status, ideology, revenge, and domination.",
    crackA: "Root Of Evil cracks if it cannot explain evils driven by ideology, status, or fear rather than profit.",
    crackB: "Not The Root cracks if it treats money as a passive tool while ignoring how wealth buys delay, access, law, and silence.",
    verify: ["What 'root' means in the question.", "Examples where profit directly rewarded harm.", "Examples of serious evil without monetary motive.", "How lobbying, legal access, debt, and fines shape behavior.", "Institutional safeguards against concentrated wealth power."],
    changeA: ["Evidence money reliably turns private greed into public harm.", "A sharper account of why money is more causal than status or ideology.", "Examples where limiting money power reduced exploitation."],
    changeB: ["A fuller answer to wage theft, medical debt, lobbying, and predatory lending.", "Examples where non-monetary systems avoid similar corruption.", "A credible plan to stop wealth from buying law and silence."],
    core: "The heat point is whether money is merely an amplifier of human vice, or whether modern systems make it the machinery that turns vice into routine harm.",
    comp: ["money as the machinery of scalable harm", "human motives and power as deeper causes", "whether 'root' means origin, accelerant, or operating system"]
  };

  if (l.includes("cats") && l.includes("dogs")) return {
    label: "Preference Debate",
    icon: "🐾",
    criteria: ["companionship", "independence", "care burden", "trainability", "space", "personality fit"],
    desc: "This is a preference debate that still has criteria: better for whom, in what living situation, and what kind of companionship the person wants.",
    rounds: [
      ["Cats are better if you value low-maintenance companionship, independence, quiet, and adaptability to smaller homes. They can be affectionate without requiring constant activity, they self-groom, and they fit the lives of people who work long hours or live in apartments. The strongest cat case is that a good companion does not need to be needy to be meaningful.", "Dogs are better if you value active companionship, trainability, emotional expressiveness, and shared routines. Dogs pull people outside, create structure, and often bond in a more visibly social way. The strongest dog case is that companionship is not just coexisting in the same room; it is doing life together."],
      ["The dog side is describing intensity as if it were quality. Needing walks, training, attention, and supervision is not automatically better companionship; it is a bigger care burden. Cats offer a cleaner tradeoff for many adults: affection with autonomy. They also avoid many problems of noise, space, and daily scheduling that make dog ownership hard.", "The cat side is underselling what many people want from a pet: responsiveness. Dogs can be trained for service, safety, exercise, and social connection in ways cats usually cannot. The care burden is part of the relationship for people who want active engagement. A pet that changes your habits for the better may be more valuable than one that fits around them."],
      ["The final case for cats is fit. For urban life, busy schedules, smaller homes, and people who appreciate subtle companionship, cats are the better default. They give warmth without demanding that your whole day orbit around them. Better does not mean louder love.", "The final case for dogs is depth of partnership. Dogs are better for people who want visible affection, shared activity, training, and a companion that actively participates in daily life. The extra work is real, but for dog people it is the point, not a flaw."]
    ],
    take: [["Better means better fit", "Lifestyle matters more than species ranking."], ["Care burden cuts both ways", "More work can be a drawback or part of the bond."], ["Companionship has styles", "Quiet presence and active partnership are different goods."]],
    strongA: "Cats' strongest case is low-friction companionship: affection, independence, quiet, and apartment fit.",
    strongB: "Dogs' strongest case is active partnership: training, routines, visible affection, and shared activity.",
    crackA: "Cats crack if independence becomes indifference for the person choosing the pet.",
    crackB: "Dogs crack if companionship requires more time, space, and energy than the owner can responsibly give.",
    verify: ["Owner lifestyle and housing.", "Time available for training and exercise.", "Allergies, noise limits, and travel frequency.", "Whether the person wants quiet presence or active partnership."],
    changeA: ["A household with limited space or unpredictable hours.", "Preference for lower-maintenance care.", "Evidence the owner values subtle affection."],
    changeB: ["A household that wants outdoor routines and training.", "Time for exercise and socialization.", "Preference for highly expressive companionship."],
    core: "The dispute is not which animal is objectively superior; it is which style of companionship fits the owner.",
    comp: ["independence, quiet, and low-maintenance affection", "active partnership, trainability, and visible enthusiasm", "what kind of relationship the owner actually wants"]
  };

  if (l.includes("ai art")) return {
    label: "Moral / Philosophical",
    icon: "🎨",
    criteria: ["authorship", "intention", "skill", "aesthetic value", "labor", "meaning"],
    desc: "This debate asks whether AI-generated images count as real art. The pressure point is not whether the outputs can look impressive. It is whether art requires human authorship, struggle, intention, and cultural meaning in a way prompt-and-render workflows do not fully provide.",
    rounds: [
      ["AI art is real art because art has never been one thing. Photography, collage, sampling, and digital tools all changed what 'making' means without ending art. If a human chooses the prompt, curates the outputs, edits, sequences, and frames the result, authorship is still present. The strongest case is that art is a relationship between maker, medium, and audience — not a purity test about hand movement.", "AI art is not real art because the core act of artistic authorship is being outsourced to a statistical engine. A person can direct, but the model supplies the craft, composition, and style memory at scale. The strongest skeptical case is that impressive images are not enough. Art usually involves selective human judgment earned through practice, constraint, and risk. Prompting is curation, not the same kind of making."],
      ["The skeptical side is defending a gate that history keeps breaking. Tools change; authorship migrates. What matters is whether a human decision shapes the final object enough to carry meaning. AI art can still express taste, reference, irony, grief, or politics through selection and framing. Calling it fake because the brush is new repeats old snobbery against photography and electronic music.", "The pro side is stretching 'authorship' until it means almost any choice. If the model supplies most of the visual intelligence, the human role can shrink to a sentence and a scroll bar. That may produce decoration, illustration, or design — useful categories, but not necessarily art in the stronger sense of earned vision. The skeptical side gains when it asks what is left once generation becomes trivial."],
      ["The final case for real art is modest: AI output can be art when human intention, editing, and context do enough work. The category should expand with the medium, not panic at it. If the question is whether some AI-assisted works can be art, yes. If the question is whether generation alone is enough, no — but that is not the whole story.", "The final case against is that mass-generated prettiness floods the meaning market. When anyone can produce slick images instantly, the scarcity that once forced artistic choice disappears. AI images can be useful, beautiful, and commercially valuable without being art in the sense that depends on human struggle, signature, and consequence."]
    ],
    take: [["Art is not one fixed thing", "New tools have expanded the category before."], ["Authorship is the hinge", "Selection and prompting may be enough for some works, but not for every claim of art."], ["Impressive is not the same as meaningful", "Visual quality alone does not settle the category."]],
    strongA: "Real Art's strongest case is that human intention, curation, and framing can still count as authorship even when the engine does the rendering.",
    strongB: "Not Real Art's strongest case is that outsourcing craft and composition to a model weakens the kind of earned judgment art traditionally requires.",
    crackA: "Real Art cracks if it treats any prompted image as art without enough human shaping or meaning.",
    crackB: "Not Real Art cracks if it cannot explain why photography, collage, or digital tools deserved a different standard.",
    verify: ["What definition of art each side is using.", "How much human editing or sequencing was involved.", "Whether the work carries intentional meaning beyond novelty.", "Commercial illustration versus personal authorship.", "Audience response versus maker process."],
    changeA: ["A clearer standard for how much human shaping is required.", "Examples where AI-assisted work carries unmistakable authorial intent.", "A defense against the 'anyone can do it' objection."],
    changeB: ["A sharper line between art, design, and decoration.", "Evidence that trivial generation erodes artistic meaning.", "An account of why struggle or risk matters to the category."],
    core: "The hinge is whether human intention and authorship can survive when the model supplies most of the craft.",
    comp: ["human intention, curation, and medium expansion", "earned judgment, struggle, and artistic authorship", "which definition of art you are willing to defend"]
  };

  if (l.includes("frontier ai") || (l.includes("regulate") && l.includes("frontier") && l.includes("ai"))) return {
    label: "Policy Debate",
    icon: "⚖",
    criteria: ["catastrophic risk", "innovation speed", "accountability", "global competition", "enforcement", "open-source edge cases"],
    desc: "This is a frontier AI governance debate. The question is whether governments should regulate advanced AI more aggressively now, or whether heavy rules would slow innovation, push development offshore, and fail against fast-moving technology.",
    rounds: [
      ["Governments should regulate frontier AI more aggressively because the downside tail is asymmetric. A misaligned or misused frontier system can scale fraud, cyberattack, biological misuse, persuasion, and institutional disruption faster than any prior general-purpose technology. Waiting for perfect evidence before acting is how societies arrive late to nuclear, financial, and environmental guardrails. The strongest case is targeted obligations: pre-deployment testing, incident reporting, liability, compute oversight, and limits on the riskiest deployment contexts.", "Aggressive AI regulation would cause more harm than good if it freezes the countries that need AI productivity most, pushes cutting-edge work into less accountable jurisdictions, and regulates models instead of harms. The strongest skeptical case is that broad rules often punish responsible labs while missing bad actors, open-weight misuse, and application-layer abuse. Innovation has public-good upside in medicine, science, accessibility, and defense. Bad regulation can trade real progress for symbolic safety."],
      ["The innovation objection is real but cannot be a blank check. Frontier systems are not ordinary apps. They are general capabilities with uncertain failure modes and strong incentive to race. The pro side only needs to show that some obligations reduce expected harm without banning research outright. Licensing, evals, and deployment conditions are not the same as stopping science.", "The pro side still has to name rules that are enforceable, proportionate, and technically literate. Vague 'safety' mandates can become compliance theater. Export controls and compute caps may leak. Open models cannot be recalled. If regulation mainly burdens domestic startups while foreign or underground actors keep moving, the policy fails its own safety goal."],
      ["The final case for aggressive regulation is that society should not discover catastrophic failure modes through live deployment at scale. The right standard is not zero risk; it is whether major labs face real accountability before release, whether high-risk uses face scrutiny, and whether governments can intervene when capabilities outrun norms.", "The final case against is that speed and openness have saved lives too — in drug discovery, translation, accessibility tools, and security research. Heavy-handed rules can centralize power in a few firms, reduce transparency, and make the safest-looking systems the least inspectable. The hinge is whether regulation improves accountability or merely relocates risk."]
    ],
    take: [["Risk is asymmetric", "A small number of frontier failures could matter more than average innovation gains."], ["Enforcement must be specific", "Model-centric bans are easier to announce than to make work."], ["Global competition changes the math", "Domestic rules do not stop all dangerous development."]],
    strongA: "Regulate's strongest case is that frontier AI has tail-risk scale and needs pre-deployment accountability before society learns by disaster.",
    strongB: "Light Touch's strongest case is that vague or heavy rules can chill beneficial innovation while pushing the riskiest work elsewhere.",
    crackA: "Regulate cracks if it cannot define enforceable rules that target harms rather than slowing all progress.",
    crackB: "Light Touch cracks if it treats innovation benefits as automatic proof that catastrophic-risk guardrails can wait.",
    verify: ["Which capabilities are actually 'frontier' in the proposal.", "Evidence from existing model-release incidents.", "How open-weight models would be treated.", "International regulatory leakage.", "Cost to startups versus large labs."],
    changeA: ["Concrete eval, reporting, and liability rules with examples.", "Evidence similar safeguards reduced harm elsewhere.", "A plan for open-source and national-security edge cases."],
    changeB: ["Evidence targeted rules preserve innovation while reducing misuse.", "A credible alternative to licensing beyond voluntary commitments.", "Data showing domestic slowdown would not simply offshore risk."],
    core: "The hinge is whether aggressive regulation reduces catastrophic AI risk enough to justify innovation and competitiveness costs.",
    comp: ["catastrophic-risk reduction and institutional accountability", "innovation speed, openness, and global competitiveness", "whether the proposed rules would actually bind the riskiest actors"]
  };

  if (l.includes("genetically modify")) return {
    label: "Policy Debate",
    icon: "🧬",
    criteria: ["consent", "safety", "inequality", "eugenics risk", "parental liberty", "medical benefit"],
    desc: "This debate is about whether parents should be allowed to genetically modify babies for intelligence or health. The real tension is between preventing serious disease and opening a path toward enhancement, selection, and unequal biological advantage.",
    rounds: [
      ["Parents should be allowed to genetically modify babies when the intervention prevents serious suffering: fatal genetic disorders, severe immune deficiencies, or conditions that destroy quality of life. The strongest case is medical, not cosmetic. If parents already make high-stakes reproductive choices, editing out catastrophic disease is an extension of care, not hubris. Allowing narrow therapeutic use with oversight is different from a free-for-all.", "Genetic modification of babies should not be allowed because once the line is drawn, pressure moves quickly from therapy to enhancement: height, intelligence, beauty, temperament. That creates a eugenics market, deepens inequality, and edits a person before they can consent. The strongest skeptical case is that 'health only' rules are unstable when wealthy parents, clinics, and status competition stand on the other side."],
      ["The consent objection is serious, but society already makes pre-birth decisions with lifelong effects. Vaccines, surgery, nutrition, and family environment all shape a child without asking permission. The difference is degree, not kind. A tightly regulated therapeutic window with independent review may prevent the worst diseases without endorsing designer babies.", "The pro side is asking regulators to hold a line history suggests will bend. Intelligence and health are not cleanly separable in public desire or marketing. Global regulatory arbitrage is real: one permissive jurisdiction can become a boutique eugenics hub. The skeptical side gains when it forces the debate onto slope risk, not just single-case compassion."],
      ["The final case for allowance is narrow and conditional: permit edits that remove severe disease under strict medical review, transparency, and bans on enhancement. That is not a blank license; it is a scalpel. If the alternative is preventable suffering, moral caution should not become paralysis.", "The final case against is that even therapeutic permission normalizes editing humans as products. Once fertility clinics advertise smarter, healthier, more marketable children, consent, equality, and human dignity are already damaged. The safer principle may be to fix disease in other ways and keep germline enhancement off the table."]
    ],
    take: [["Therapy and enhancement are hard to separate", "The policy must survive marketing and status pressure."], ["Consent matters", "A child cannot agree to the edit that defines their body."], ["Inequality is not a side issue", "Biological upgrades would likely follow money first."]],
    strongA: "Allow GM's strongest case is preventing catastrophic genetic disease when the intervention is narrow, medical, and tightly reviewed.",
    strongB: "Ban GM's strongest case is the eugenics slope: enhancement pressure, consent failure, and biological inequality once editing becomes normalized.",
    crackA: "Allow GM cracks if 'health only' cannot be enforced against enhancement demand and regulatory arbitrage.",
    crackB: "Ban GM cracks if it blocks interventions that prevent severe suffering with no equally good alternative.",
    verify: ["Which conditions count as therapeutic versus enhancement.", "Long-term safety data for germline edits.", "Enforcement across countries and clinics.", "How inequality would change if enhancements were allowed.", "Alternative treatments for the same conditions."],
    changeA: ["A credible enforcement model with public audit.", "Evidence therapeutic edits are safe and necessary.", "Strict legal separation from enhancement."],
    changeB: ["A stronger answer to preventable disease cases.", "Evidence slopes from therapy to enhancement in comparable tech.", "Non-germline alternatives that avoid consent problems."],
    core: "The hinge is whether narrowly allowed medical edits can be contained, or whether they open enhancement and inequality by default.",
    comp: ["preventing severe disease and parental medical choice", "child consent, eugenics risk, and biological inequality", "whether regulators can hold the therapy-enhancement line"]
  };

  if (l.includes("workweek") || l.includes("4-day")) return {
    label: "Practical Decision",
    icon: "📅",
    criteria: ["productivity", "burnout", "coverage", "customer service", "pay", "industry fit"],
    desc: "This is a work-design policy question. The debate is whether the four-day workweek should become the standard for office jobs, or whether the productivity and wellbeing gains are uneven and too costly for coordination-heavy work.",
    rounds: [
      ["The 4-day workweek should become standard because most office work wastes time that better focus could recover. Trials in several countries report equal or better output with fewer hours when meetings, performative busyness, and poor prioritization are cut. Workers get recovery, employers keep results, and burnout drops. The strongest case is not laziness; it is redesigning work around output instead of chair time.", "The 4-day workweek should not become standard because many roles need daily coverage, customer response windows, handoffs, and synchronous collaboration that do not compress cleanly. A four-day default can push hidden work into evenings, burden smaller teams, and become a perk for privileged knowledge workers while service roles stay behind. The strongest skeptical case is fit, not moral opposition."],
      ["Coverage problems are real but solvable with staggered schedules, handoff discipline, and clearer async norms. The office world already pretends five days are productive when they are not. If a team cannot cover four days without collapse, the problem may be staffing or process, not the calendar. The pro side gains when it points to measured pilots rather than vibes.", "The pro side is extrapolating from favorable pilots to every office. Healthcare, education, logistics, support, and junior-heavy teams often need more live overlap, not less. Pay compression is another risk: some employers may keep salaries flat while demanding the same output in fewer paid hours. A policy that works in one firm can become stress elsewhere."],
      ["The final case for a four-day standard is that burnout is now a business and public-health issue. If output can be preserved, society should stop treating long presence as virtue. Make four days the norm where evidence supports it, with room for industry exceptions.", "The final case against is that standardization matters less than honest workload design. A bad five-day job and a crushed four-day job can both harm people. The better target is manageable hours, sane meetings, and fair pay — not a slogan that sounds progressive while shifting pressure underground."]
    ],
    take: [["Output matters more than days", "The case depends on whether work actually gets more focused."], ["Industry fit is uneven", "Coverage-heavy roles do not compress the same way."], ["Pay and hidden work matter", "Fewer days can become the same load in less time."]],
    strongA: "4-Day Week's strongest case is higher focus, lower burnout, and equal output in trials that cut waste rather than essential work.",
    strongB: "5-Day Default's strongest case is coverage, coordination, and the risk that a trendy standard ignores service and junior-heavy roles.",
    crackA: "4-Day Week cracks when productivity gains come from unpaid compression or unsustainable intensity.",
    crackB: "5-Day Default cracks when it defends performative attendance instead of necessary coordination.",
    verify: ["Pilot results by industry and role type.", "Customer coverage and handoff models.", "Whether pay stayed flat or dropped.", "Overtime and weekend spillover after adoption.", "Differences between knowledge work and service work."],
    changeA: ["Sector-specific pilots with measured output.", "Coverage plans that avoid hidden overtime.", "Evidence burnout and retention improved."],
    changeB: ["Evidence four-day adoption harmed coverage or pay.", "A stronger case for flexible schedules over one standard.", "Examples where coordination needs blocked compression."],
    core: "The hinge is whether office work can be redesigned for equal output in fewer days without shifting harm to coverage, pay, or intensity.",
    comp: ["burnout reduction, focus, and output per hour", "coverage, coordination, and fair pay across roles", "whether a four-day standard fits the work being done"]
  };

  if (l.includes("rehabilitation") && l.includes("prison")) return {
    label: "Policy Debate",
    icon: "⚖",
    criteria: ["recidivism", "public safety", "accountability", "victim justice", "cost", "human dignity"],
    desc: "This debate asks whether prisons should prioritize rehabilitation over punishment. The hinge is whether the system's main job is to reduce future harm and reintegrate people, or to deliver moral desert and visible accountability for wrongdoing.",
    rounds: [
      ["Prisons should prioritize rehabilitation because punishment alone does not reliably reduce crime. Education, addiction treatment, job training, mental-health care, and transitional housing lower recidivism and save public money over time. The strongest case is public safety: a system that returns people more dangerous than they entered has failed its core mission.", "Prisons should prioritize punishment because justice is not only a spreadsheet of future risk. Victims and communities often need accountability, proportionality, and a moral signal that serious harm has consequences. The strongest skeptical case is that rehabilitation rhetoric can soften consequences for violent crime and erode trust in the rule of law."],
      ["The skeptical side is right that optics matter, but confinement is already punishment. Rehabilitation does not mean absolution. It means using incarceration to change behavior, not merely warehouse humans. Countries that invest in reentry often see lower reoffending without denying the seriousness of the original crime.", "The pro side has to answer cases where rehabilitation became permissiveness: repeat violent offenders, ignored victims, or programs that exist on paper but not in practice. If rehabilitation is underfunded, performative, or decoupled from accountability, the public is right to resist it."],
      ["The final case for rehabilitation is pragmatic moral policy: reduce the next crime, repair what can be repaired, and reserve the harshest containment for the truly dangerous. Punishment remains present in loss of liberty; the question is what the years inside are for.", "The final case for punishment priority is that some crimes require a stronger moral response than skills training can provide. If the system appears indifferent to victims, deterrence and legitimacy suffer. Rehabilitation can supplement punishment, but should not swallow it."]
    ],
    take: [["Public safety is the bridge", "Both sides care about future harm, but weigh moral desert differently."], ["Programs must be real", "Underfunded rehabilitation is an easy target for skepticism."], ["Victims are not optional", "Accountability language matters to legitimacy."]],
    strongA: "Rehab First's strongest case is lower recidivism, safer communities, and better use of incarceration time.",
    strongB: "Punish First's strongest case is moral accountability and public trust when crimes are serious or repeat offending continues.",
    crackA: "Rehab First cracks when programs are weak, underfunded, or used to avoid hard accountability.",
    crackB: "Punish First cracks when harsh warehousing raises reoffending and long-run public-safety costs.",
    verify: ["Recidivism data by program type.", "Funding levels for education, addiction care, and reentry.", "Victim satisfaction and accountability measures.", "Violent versus non-violent offense mix.", "Comparative outcomes in other countries."],
    changeA: ["Evidence rehabilitation reduced reoffending for similar offenders.", "A model that keeps proportionality for violent crime.", "Fully funded programs with measurable outcomes."],
    changeB: ["Evidence punishment-focused systems deter serious crime better.", "Examples where rehabilitation rhetoric outran safety.", "Stronger victim-centered accountability mechanisms."],
    core: "The hinge is whether prisons should mainly reduce future harm through rehabilitation or mainly deliver moral accountability through punishment.",
    comp: ["public safety, reintegration, and long-term cost", "moral desert, victim justice, and institutional legitimacy", "which goal should dominate when they conflict"]
  };

  if (l.includes("housing") && l.includes("human right")) return {
    label: "Policy Debate",
    icon: "🏠",
    criteria: ["supply", "affordability", "dignity", "enforcement", "fiscal cost", "property rights"],
    desc: "This debate asks whether housing should be treated as a human right. The question is whether shelter should be guaranteed by law and public provision, or whether housing is better secured through markets, subsidies, and supply expansion without a universal entitlement.",
    rounds: [
      ["Housing should be treated as a human right because without stable shelter, other rights become theoretical. Health, education, work, family stability, and dignity all collapse when people bounce between couches, cars, shelters, and unsafe rentals. The strongest case is not luxury for all; it is a floor: no one should be left unhoused in a society capable of building roofs.", "Housing should not be treated as a human right because rights language is stronger than governments can deliver without tradeoffs. A universal entitlement can strain budgets, distort markets, reduce maintenance incentives, and create legal conflicts with property owners. The stronger skeptical case is targeted housing assistance plus supply reform, not a broad right that outruns capacity."],
      ["A right does not have to mean identical apartments for everyone. It can mean enforceable access to safe basic housing, emergency prevention, and public investment when markets fail. Treating housing as fundamental changes how cities plan, zone, and budget. The pro side gains when it defines the right narrowly and operationally.", "The pro side still has to answer scarcity. Building, land, labor, and location are finite. If demand outpaces supply, declaring a right without building more homes mainly creates queues, bureaucracy, and political disappointment. Rights talk can also crowd out reforms that actually lower prices: zoning, permitting, and construction."],
      ["The final case for a housing right is moral realism: mass homelessness is a policy choice visible in budgets and zoning. A society that can finance stadiums and subsidies can finance a housing floor if it decides homelessness is unacceptable.", "The final case against is that housing policy succeeds through supply, vouchers, and incentives more than rights rhetoric. What unhoused people need are homes built and paid for, not a slogan that courts cannot fully enforce. The better fight may be abundant housing, not entitlement language alone."]
    ],
    take: [["A right is not a mansion", "The strongest pro case is a basic floor, not unlimited housing."], ["Supply still matters", "Rights language without building does not create roofs."], ["Enforcement is hard", "Legal rights need budgets, land, and administration."]],
    strongA: "Housing Right's strongest case is dignity and stability: shelter underpins health, work, education, and family life.",
    strongB: "Market Housing's strongest case is feasibility: supply, subsidies, and property rights may secure housing better than broad entitlement law.",
    crackA: "Housing Right cracks if it promises more than governments can build or fund.",
    crackB: "Market Housing cracks if it tolerates mass homelessness as an acceptable market outcome.",
    verify: ["Homelessness counts and housing waitlists.", "Cost of a basic housing guarantee.", "Zoning and construction bottlenecks.", "Outcomes in places with strong housing rights language.", "Effects on landlords and maintenance incentives."],
    changeA: ["A defined minimum standard and funding plan.", "Evidence rights language improved housing access.", "Supply reforms paired with the entitlement."],
    changeB: ["Evidence supply and voucher programs outperformed rights frameworks.", "A credible anti-homelessness plan without universal entitlement.", "Fiscal and legal limits on enforcement."],
    core: "The hinge is whether housing should be legally guaranteed as a basic right or secured through supply and targeted assistance.",
    comp: ["dignity, stability, and a floor against homelessness", "fiscal feasibility, supply, and property rights", "whether rights language produces homes or mainly signals intent"]
  };

  if (l.includes("capital punishment")) return {
    label: "Policy Debate",
    icon: "⚖",
    criteria: ["deterrence", "innocence risk", "moral limits", "victim justice", "cost", "proportionality"],
    desc: "This debate asks whether capital punishment should be abolished. The hinge is whether execution is a necessary moral response to the worst crimes, or whether an irreversible state killing is too risky and too corrosive to justify.",
    rounds: [
      ["Capital punishment should be abolished because the state should not hold an irreversible power it will sometimes misuse. Innocent people have been sentenced to death, racial and class bias infects outcomes, and decades of appeals make the process costly without clearly outperforming life imprisonment on public safety. The strongest case is moral and practical: if error is possible, finality is obscene.", "Capital punishment should not be abolished because some crimes are so extreme that life imprisonment feels inadequate to victims and communities. Execution can express society's strongest condemnation, may deter in marginal cases, and removes the worst offenders permanently. The strongest retention case is not that the system is perfect; it is that abolition removes the only penalty that matches certain crimes."],
      ["The retention side must answer innocence, bias, and decades-long legal churn. A punishment that cannot be undone requires near-perfect justice, which no system provides. Life without parole can protect the public without turning the state into an executioner.", "The abolition side must answer the moral intuition that some crimes break the social contract so completely that lesser punishment feels hollow. Victims' families are not irrational for wanting the harshest available response. If the alternative is expensive lifetime incarceration with uncertain remorse, retention can still feel proportionate."],
      ["The final abolition case is that a decent society should not kill in its name when fallibility is guaranteed. Justice can be severe without being irreversible. The goal is public safety and accountability, not ritualized state violence.", "The final retention case is narrow: reserve death for the clearest, most aggravated cases with overwhelming evidence and rigorous review. If the standard is that high, the penalty remains rare but available for crimes society refuses to treat as ordinary."]
    ],
    take: [["Irreversibility changes everything", "One wrongful execution is not a rounding error."], ["Victims matter", "Abolition must answer the need for moral condemnation."], ["Deterrence is contested", "Neither side should treat it as settled."]],
    strongA: "Abolish's strongest case is innocence risk, bias, cost, and the moral limit on irreversible state killing.",
    strongB: "Keep Death Penalty's strongest case is proportionality and moral condemnation for the worst crimes.",
    crackA: "Abolish cracks if it cannot offer a punishment victims and the public see as serious enough.",
    crackB: "Keep Death Penalty cracks on wrongful conviction, unequal application, and the gap between theory and practice.",
    verify: ["Innocence exoneration rates.", "Racial and socioeconomic disparities in death sentences.", "Deterrence studies.", "Cost of capital cases versus life imprisonment.", "Victim-family perspectives and crime severity thresholds."],
    changeA: ["Evidence life without parole protects public safety equally.", "Reforms that reduce bias without retaining execution.", "Strong victim-support systems."],
    changeB: ["A narrowly defined standard with extraordinary evidence.", "Evidence deterrence for targeted crimes.", "Reforms that minimize wrongful conviction risk."],
    core: "The hinge is whether society should retain an irreversible punishment for the worst crimes or rule out state killing because error and bias are guaranteed.",
    comp: ["innocence risk, moral limits, and state fallibility", "proportionality, victim justice, and condemnation of the worst crimes", "whether any execution standard can be safe enough in practice"]
  };

  if (l.includes("encryption") && l.includes("human right")) return {
    label: "Policy Debate",
    icon: "🔐",
    criteria: ["privacy", "security", "law enforcement access", "dissent", "child safety", "implementation"],
    desc: "This debate asks whether encryption should be a human right. The question is whether strong encryption is essential to privacy, security, and free communication, or whether absolute encryption rights block legitimate investigation of crime and child exploitation.",
    rounds: [
      ["Encryption should be a human right because digital life is now where banking, health, journalism, protest, and intimate relationships live. Without strong encryption, surveillance expands by default, criminals and governments alike gain access, and ordinary people cannot trust their devices. The strongest case is that privacy and security are paired: weakening encryption for investigators also weakens everyone against attackers.", "Encryption should not be a human right because unbreakable or inaccessible encryption can shield serious crime: child abuse networks, trafficking, terrorism planning, and fraud at scale. Lawful access with judicial oversight is not the same as mass surveillance. The strongest skeptical case is that a right to absolute encryption makes society pay in preventable harm."],
      ["The law-enforcement argument often asks for exceptional access that becomes a universal vulnerability. Backdoors leak, standards spread globally, and authoritarian states exploit the same openings. The pro side only needs to show that strong default encryption protects billions of ordinary users and that targeted investigation has other tools.", "The pro side must answer cases where encryption genuinely blocks rescue or prosecution: device data, coordinated abuse rings, and rapid harm scenarios. If the right is framed as absolute, it can sound indifferent to victims. The skeptical side gains when it demands a balance model, not blanket surveillance."],
      ["The final case for encryption as a right is defensive: people need secure communications in a world of hacking, stalking, corporate data mining, and state overreach. Protect the default, protect the keys, and keep exceptional state access narrow, audited, and rare.", "The final case against is that rights language should not outlaw reasonable lawful access in serious cases. Encryption is vital, but so is investigating crimes that hide behind it. The better standard may be strong encryption with tightly governed exceptions, not an absolute right that ties investigators' hands."]
    ],
    take: [["Privacy and security are linked", "Weakening encryption hurts ordinary users, not only criminals."], ["Serious crime is real", "Investigators do face cases where encryption blocks access."], ["Implementation decides everything", "Backdoors and lawful access are not the same thing."]],
    strongA: "Encryption Right's strongest case is that strong default encryption protects privacy, security, and dissent for everyone.",
    strongB: "Limited Encryption's strongest case is that absolute encryption can shield serious crime and block lawful investigation.",
    crackA: "Encryption Right cracks if it cannot answer high-harm cases where data access could prevent injury.",
    crackB: "Limited Encryption cracks if exceptional access becomes a universal backdoor exploited by criminals and states.",
    verify: ["How 'human right' would be defined legally.", "Cases where encryption blocked investigations.", "Evidence of harm from prior backdoor proposals.", "Alternative investigative methods.", "Child-safety and fraud enforcement impacts."],
    changeA: ["A model that preserves default encryption without absolute immunity.", "Evidence weak encryption harmed ordinary users.", "Strong warrant and audit standards for any access."],
    changeB: ["A technically credible lawful-access design without systemic backdoors.", "Evidence encryption blocked serious prosecutions at scale.", "Safeguards against mass surveillance abuse."],
    core: "The hinge is whether encryption should be protected as a default right for everyone or limited when it blocks investigation of serious harm.",
    comp: ["privacy, security, and protection from surveillance", "lawful investigation, child safety, and crime prevention", "whether any exception model can avoid becoming a universal backdoor"]
  };

  return genericProfile(question, a, b);
}

function normalizeAiProfile(ai, fallback, question = "") {
  const validTypes = new Set(["product", "policy", "moral", "practical", "factual", "extraordinary", "open"]);
  const asText = (value, fallbackValue = "") => (typeof value === "string" && value.trim() ? value.trim() : fallbackValue);
  const asIcon = (value, fallbackValue = "") => {
    const text = asText(value, fallbackValue);
    if (!text) return fallbackValue;
    if (/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F]+$/u.test(text)) return text;
    return fallbackValue;
  };
  const asCompass = (value, fallbackValue = "") => {
    let text = asText(value, fallbackValue);
    if (!text) return fallbackValue;
    text = text
      .replace(/^if you value\s+/i, "")
      .replace(/^if\s+/i, "")
      .replace(/^whether\s+/i, "")
      .replace(/^the real question is:\s*/i, "")
      .replace(/^the question is:\s*/i, "")
      .replace(/^do you prioritize\s+/i, "")
      .replace(/^prioritize\s+/i, "")
      .replace(/^should\s+/i, "")
      .replace(/^would\s+/i, "")
      .replace(/^can\s+/i, "")
      .replace(/\?+$/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) return fallbackValue;
    if (text.length > 90) return fallbackValue;
    return text;
  };
  const asList = (value, fallbackValue, min = 3) => {
    const list = Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()) : [];
    return list.length >= min ? list : fallbackValue;
  };
  const asTakeaways = (value) => {
    if (!Array.isArray(value)) return fallback.take;
    const sentencePattern = /^(most people assume|this debate revealed)\b/i;
    const takeaways = value
      .map((item) => Array.isArray(item) ? [asText(item[0]), asText(item[1])] : null)
      .filter((item) => item && item[0] && item[1] && sentencePattern.test(item[1]));
    return takeaways.length >= 3 ? takeaways.slice(0, 3) : fallback.take;
  };
  const fallbackRounds = fallback.rounds;
  const rounds = [0, 1, 2].map((i) => {
    const round = Array.isArray(ai?.rounds) ? ai.rounds[i] : null;
    if (Array.isArray(round)) return [asText(round[0], fallbackRounds[i][0]), asText(round[1], fallbackRounds[i][1])];
    return [
      asText(round?.aArg, fallbackRounds[i][0]),
      asText(round?.bArg, fallbackRounds[i][1])
    ];
  });
  const qType = asText(ai?.qType, "").toLowerCase();
  const q = question.toLowerCase();
  const isFreeWillPunishment = q.includes("free will") || (q.includes("punish") && q.includes("free will"));
  const comp = isFreeWillPunishment
    ? [
        "public safety, deterrence, and rehabilitation",
        "moral desert, dignity, and limits on state power",
        "whether punishment needs moral blame, or whether harm reduction is enough"
      ]
    : asList(ai?.comp, fallback.comp, 3).slice(0, 3).map((item, i) => {
        const normalized = asCompass(item, fallback.comp[i] || "");
        if (i === 2) {
          const words = normalized.split(/\s+/).filter(Boolean).length;
          if (words < 6) return fallback.comp[i] || "";
        }
        return normalized;
      });

  return {
    ...fallback,
    qType: validTypes.has(qType) ? qType : null,
    sideA: asText(ai?.sideA),
    sideB: asText(ai?.sideB),
    label: asText(ai?.label, fallback.label),
    icon: asIcon(ai?.icon, fallback.icon),
    criteria: asList(ai?.criteria, fallback.criteria, 4),
    desc: asText(ai?.desc, fallback.desc),
    rounds,
    take: asTakeaways(ai?.take),
    strongA: asText(ai?.strongA, fallback.strongA),
    strongB: asText(ai?.strongB, fallback.strongB),
    crackA: asText(ai?.crackA, fallback.crackA),
    crackB: asText(ai?.crackB, fallback.crackB),
    verify: asList(ai?.verify, fallback.verify, 3),
    changeA: asList(ai?.changeA, fallback.changeA, 3),
    changeB: asList(ai?.changeB, fallback.changeB, 3),
    core: asText(ai?.core, fallback.core),
    comp,
    hinge: ai?.hinge && typeof ai.hinge === "object" ? ai.hinge : null
  };
}

function scoreRound(type, question, i, intensity) {
  let a = 8.0;
  let b = 8.0;
  const l = question.toLowerCase();
  if (l.includes("bob lazar") || l.includes("lazar")) {
    if (i === 0) return [8.1, 8.3];
    if (i === 1) return [8.0, 8.4];
    return [8.1, 8.5];
  }
  if (l.includes("seed oil")) {
    if (i === 0) return [8.2, 8.1];
    if (i === 1) return [8.0, 8.4];
    return [8.1, 8.5];
  }
  if (l.includes("free will")) {
    if (i === 0) return [8.3, 8.2];
    if (i === 1) return [8.0, 8.5];
    return [8.1, 8.4];
  }
  if (l.includes("ai art")) {
    if (i === 0) return [8.2, 8.3];
    if (i === 1) return [8.1, 8.4];
    return [8.2, 8.3];
  }
  if (l.includes("frontier ai") || (l.includes("regulate") && l.includes("frontier"))) {
    if (i === 0) return [8.4, 8.1];
    if (i === 1) return [8.1, 8.4];
    return [8.2, 8.3];
  }
  if (l.includes("genetically modify")) {
    if (i === 0) return [8.3, 8.2];
    if (i === 1) return [8.0, 8.5];
    return [8.1, 8.4];
  }
  if (l.includes("workweek") || l.includes("4-day")) {
    if (i === 0) return [8.3, 8.1];
    if (i === 1) return [8.0, 8.4];
    return [8.2, 8.3];
  }
  if (l.includes("rehabilitation") && l.includes("prison")) {
    if (i === 0) return [8.3, 8.2];
    if (i === 1) return [8.1, 8.4];
    return [8.3, 8.2];
  }
  if (l.includes("age-gated") || (l.includes("social media") && l.includes("under 16"))) {
    if (i === 0) return [8.4, 8.1];
    if (i === 1) return [8.0, 8.5];
    return [8.2, 8.3];
  }
  if (l.includes("housing") && l.includes("human right")) {
    if (i === 0) return [8.4, 8.1];
    if (i === 1) return [8.1, 8.4];
    return [8.2, 8.3];
  }
  if (l.includes("capital punishment")) {
    if (i === 0) return [8.4, 8.2];
    if (i === 1) return [8.1, 8.5];
    return [8.3, 8.2];
  }
  if (l.includes("encryption") && l.includes("human right")) {
    if (i === 0) return [8.3, 8.2];
    if (i === 1) return [8.2, 8.4];
    return [8.3, 8.2];
  }
  if (l.includes("college") && l.includes("free")) {
    if (i === 0) return [8.3, 8.0];
    if (i === 1) return [8.1, 8.4];
    return [8.2, 8.3];
  }
  if (l.includes("pineapple on pizza")) {
    if (i === 0) return [8.2, 8.0];
    if (i === 1) return [8.3, 8.1];
    return [8.2, 8.2];
  }
  if (l.includes("social media")) {
    if (i === 0) return [8.4, 8.1];
    if (i === 1) return [8.1, 8.4];
    return [8.3, 8.2];
  }
  if (l.includes("money") && l.includes("root")) {
    if (i === 0) return [8.6, 8.2];
    if (i === 1) return [8.5, 8.3];
    return [8.2, 8.5];
  }
  if (l.includes("cats") && l.includes("dogs")) {
    if (i === 0) return [8.2, 8.3];
    if (i === 1) return [8.1, 8.4];
    return [8.3, 8.2];
  }
  if (l.includes("bush") && l.includes("obama")) {
    if (i === 0) return [8.2, 8.4];
    if (i === 1) return [8.0, 8.6];
    return [8.1, 8.5];
  }
  if (type === "product") { if (i < 2) a += 0.35; else b += 0.35; }
  if (type === "moral" && l.includes("love")) { if (i === 0) a += 0.25; if (i === 1) a += 0.15; if (i === 2) b += 0.15; }
  if (type === "extraordinary") { if (i === 0) a += 0.15; if (i === 1 || i === 2) b += 0.3; }
  if (type === "policy" && l.includes("gun")) { if (i === 0) a += 0.2; if (i === 1) b += 0.2; if (i === 2) return [8.2, 8.2]; }
  if (type === "open" || (a === 8.0 && b === 8.0)) {
    if (i === 0) a += 0.2;
    if (i === 1) b += 0.2;
    if (i === 2) a += 0.1;
  }
  if (intensity === "ruthless") { a += 0.05; b += 0.05; }
  return [Number(a.toFixed(1)), Number(b.toFixed(1))];
}

function judge(winner, round, data) {
  const tieNotes = [
    "Opening result: both sides defined the battleground with equal force. Neither side earned the edge because each gave the judge a usable standard.",
    "Rebuttal result: both sides absorbed the pressure and answered the best objection directly. This tie is narrow, not automatic.",
    "Final result: both closings left the decisive assumption standing. Neither side converted the last word into a clean win."
  ];
  if (winner === "TIE") return tieNotes[round] || tieNotes[0];
  const w = winner === "A" ? data.shortA : data.shortB;
  const l = winner === "A" ? data.shortB : data.shortA;
  const topic = (data.question || "").toLowerCase();
  if (topic.includes("money") && topic.includes("root")) {
    const moneyNotes = [
      `${w} takes the opening because it gave the judge concrete machinery: debt, lobbying, wage theft, legal delay, and harm priced into business. ${l} had the cleaner philosophical caution, but fewer real-world handles.`,
      `${w} takes the rebuttal because it pressed how money changes incentives in actual institutions. ${l} correctly separated money from deeper motives, but did less to answer the examples of wealth buying time, silence, and access.`,
      `${w} takes final pressure because it gave the sharper closing distinction between origin and amplifier. ${l} kept serious examples alive, but the final standard favored the side that explained what 'root' should mean.`
    ];
    return moneyNotes[round] || moneyNotes[0];
  }
  if (topic.includes("free will")) {
    const freeWillNotes = [
      `${w} takes the opening because it controlled the original meaning of free will more directly. ${l} made the stronger practical case, but did less to answer the authorship problem head-on.`,
      `${w} takes the rebuttal because it exposed the pressure point in the opponent's definition. ${l} defended the position, but did not fully close the gap between causation and responsibility.`,
      `${w} takes final pressure because it gave the clearer account of what kind of freedom moral life actually needs. ${l} kept the authorship challenge alive, but left the practical definition less settled.`
    ];
    return freeWillNotes[round] || freeWillNotes[0];
  }
  if (topic.includes("remote work") || topic.includes("office work")) {
    const remoteNotes = [
      `${w} takes the opening because it made the cleaner case for why presence is worth paying for. ${l} had the flexibility advantage, but left the mentorship and culture cost less settled.`,
      `${w} takes the rebuttal because it forced the debate onto the practical losses of the other model. ${l} defended autonomy, but did less to answer the coordination problem.`,
      `${w} takes final pressure because it better matched the standard the question actually needs: which setup works better for the kind of work being discussed. ${l} remained attractive, but less complete.`
    ];
    return remoteNotes[round] || remoteNotes[0];
  }
  if (topic.includes("bush") && topic.includes("obama")) {
    const presidentialNotes = [
      `${w} takes the opening because it gave the broader governing standard. ${l} made a serious crisis-leadership case, but the comparison needs more than resolve under pressure.`,
      `${w} takes the rebuttal because it forced the debate onto long-term consequences, especially Iraq. ${l} kept valid achievements alive, but did not fully absorb the cost of the central failure.`,
      `${w} takes final pressure because it offered the cleaner decision rule: judge the presidency by durable outcomes and avoided catastrophe. ${l} remains defensible if crisis resolve is weighted highest.`
    ];
    return presidentialNotes[round] || presidentialNotes[0];
  }
  const typeNotes = {
    product: [
      `${w} takes the opening because it defined "better" through a clearer user need. ${l} had a real advantage to point at, but did less work to show when that advantage matters.`,
      `${w} takes the rebuttal because it attacked the opponent's strongest feature claim instead of just restating its own pitch. ${l} raised a fair tradeoff, but left the practical comparison less resolved.`,
      `${w} takes final pressure because it gave the cleaner decision rule for choosing between the tools. ${l} still has a use case, but the closing case was less decisive.`
    ],
    moral: [
      `${w} takes the opening because it set the key definition more cleanly. ${l} made a serious philosophical challenge, but started with more ambiguity.`,
      `${w} takes the rebuttal because it exposed the tension inside the opponent's definition. ${l} defended the position, but did not fully repair the weak point.`,
      `${w} takes final pressure because it carried the definition through to a clearer consequence. ${l} left the central meaning of the claim less settled.`
    ],
    extraordinary: [
      `${w} takes the opening because it handled the burden of proof more carefully. ${l} had a plausible frame, but pushed the evidence further than the round could support.`,
      `${w} takes the rebuttal because it separated possibility from proof more sharply. ${l} named real anomalies, but did not fully close the explanatory gap.`,
      `${w} takes final pressure because it landed on the safest conclusion under uncertainty. ${l} kept the question open, but did not make the stronger origin claim stick.`
    ],
    policy: [
      `${w} takes the opening because it gave the more concrete policy mechanism. ${l} named valid values, but left the implementation or evidence burden softer.`,
      `${w} takes the rebuttal because it engaged the strongest tradeoff instead of arguing past it. ${l} had a real concern, but did less to answer the specific proposal.`,
      `${w} takes final pressure because it gave the more usable decision standard. ${l} preserved an objection, but did not show it should control the verdict.`
    ],
    factual: [
      `${w} takes the opening because it framed the evidence standard more responsibly. ${l} raised a plausible claim, but leaned harder on inference than proof.`,
      `${w} takes the rebuttal because it challenged the causal link more directly. ${l} had a mechanism, but did not show enough outcome evidence.`,
      `${w} takes final pressure because it better separated what is known from what is suspected. ${l} remained possible, but less established.`
    ],
    open: [
      `${w} takes the opening because it stayed closer to the exact claim and gave the clearer burden. ${l} made a valid point, but framed it more loosely.`,
      `${w} takes the rebuttal because it answered the best objection more directly. ${l} pressed a concern, but left the harder answer incomplete.`,
      `${w} takes final pressure because it gave the cleaner closing test for the unresolved issue. ${l} remained plausible, but less decisive.`
    ]
  };
  const notes = typeNotes[data.qType] || typeNotes.open;
  return notes[round] || notes[0];
}

function generate(questionRaw, sideARaw, sideBRaw, intensity, aiProfile = null) {
  const question = cleanQuestion(questionRaw);
  const fallbackType = classify(question);
  const fallbackSides = inferSides(question, fallbackType);
  const fallbackSideA = sideARaw.trim() || aiProfile?.sideA?.trim() || fallbackSides[0];
  const fallbackSideB = sideBRaw.trim() || aiProfile?.sideB?.trim() || fallbackSides[1];
  const fallbackProfile = genericProfile(question, fallbackSideA, fallbackSideB);
  const ai = aiProfile ? normalizeAiProfile(aiProfile, fallbackProfile, question) : null;
  const qType = ai?.qType || fallbackType;
  const aiSides = ai?.sideA && ai?.sideB ? [ai.sideA, ai.sideB] : null;
  const mirroredAiSides = aiSides && shortLabel(aiSides[0]).toLowerCase() === shortLabel(aiSides[1]).toLowerCase();
  const inferred = aiSides && !mirroredAiSides ? aiSides : inferSides(question, qType);
  const sideA = sideARaw.trim() || inferred[0];
  const sideB = sideBRaw.trim() || inferred[1];
  const shortA = shortLabel(sideA);
  const shortB = shortLabel(sideB);
  const p = ai || getArgs(question, qType, sideA, sideB);
  const hinge = normalizeHinge(p.hinge, { question, qType, sideA, sideB, comp: p.comp, core: p.core });
  const shell = { qType, question, sideA, sideB, shortA, shortB };
  const rounds = p.rounds.map((pair, i) => {
    const [sa, sb] = scoreRound(qType, question, i, intensity);
    const winner = Math.abs(sa - sb) < 0.05 ? "TIE" : sa > sb ? "A" : "B";
    return {
      round: i + 1,
      label: ["Opening Arguments", "Rebuttals", "Final Pressure"][i],
      aArg: pair[0],
      bArg: pair[1],
      sa,
      sb,
      winner,
      judgeNote: judge(winner, i, { ...shell, qType }),
      roundHeat: winner === "TIE" ? "medium" : "low"
    };
  });
  const aWins = rounds.filter((r) => r.winner === "A").length;
  const bWins = rounds.filter((r) => r.winner === "B").length;
  const ties = rounds.filter((r) => r.winner === "TIE").length;
  const contested = (aWins > bWins && rounds[2].winner === "B") || (bWins > aWins && rounds[2].winner === "A");
  const cleanDefinitionSplit = qType === "moral" && question.toLowerCase().includes("free will");
  const heatLevel = cleanDefinitionSplit ? "medium" : contested ? "critical" : ties > 0 ? "medium" : qType === "extraordinary" || (qType === "moral" && intensity === "ruthless") ? "high" : "medium";
  return { ...p, qType, sideA, sideB, shortA, shortB, hinge, rounds, aWins, bWins, ties, matchWinner: contested ? "CONTESTED" : aWins > bWins ? "A" : bWins > aWins ? "B" : "TIE", heatLevel, intensity };
}

function Pill({ children, color, compact = false }) {
  return <span style={{ background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 12, padding: compact ? "2px 8px" : "2px 10px", fontSize: compact ? 10 : 11, color, fontWeight: 700, whiteSpace: "nowrap" }}>{children}</span>;
}

function Section({ title, color, children }) {
  return <div style={{ background: T.card, border: `1px solid ${T.border}`, borderTop: `3px solid ${color}`, borderRadius: 12, padding: 18, marginBottom: 12 }}><div style={{ fontSize: 10, letterSpacing: 3, color, fontWeight: 800, marginBottom: 12 }}>{title}</div>{children}</div>;
}

function Card({ title, color, children }) {
  return <div style={{ background: T.card, border: `1px solid ${color}24`, borderTop: `3px solid ${color}66`, borderRadius: 12, padding: 16 }}><div style={{ fontSize: 10, letterSpacing: 2, color, fontWeight: 800, marginBottom: 8 }}>{title}</div><p style={{ fontSize: 13, color: T.textDim, lineHeight: 1.75, margin: 0 }}>{children}</p></div>;
}

function HingeCard({ hinge, shortA, shortB, mobile, compactLine, grid }) {
  return (
    <Section title="THE HINGE" color={T.gold}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <Pill color={T.brass} compact={mobile}>{hinge.questionType}</Pill>
        <Pill color={T.gold} compact={mobile}>Hinge Clarity: {hinge.hingeClarityLevel}</Pill>
      </div>
      <div style={grid}>
        <Card title={`${shortA.toUpperCase()} PROTECTS`} color={T.sideA}>{hinge.sideAProtects}</Card>
        <Card title={`${shortA.toUpperCase()} FEARS LOSING`} color={T.sideA}>{hinge.sideAFears}</Card>
        <Card title={`${shortB.toUpperCase()} PROTECTS`} color={T.sideB}>{hinge.sideBProtects}</Card>
        <Card title={`${shortB.toUpperCase()} FEARS LOSING`} color={T.sideB}>{hinge.sideBFears}</Card>
      </div>
      <div style={{ background: T.charcoal, border: `1px solid ${T.gold}30`, borderRadius: 10, padding: mobile ? 14 : 16, marginTop: 12 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: T.gold, fontWeight: 800, marginBottom: 8 }}>CORE TENSION</div>
        <p style={{ fontSize: 14, color: T.text, lineHeight: mobile ? compactLine : 1.7, margin: 0, overflowWrap: "anywhere" }}>{hinge.coreTension}</p>
      </div>
      <p style={{ fontSize: 12, color: T.textDim, lineHeight: mobile ? compactLine : 1.65, margin: "12px 0 0", overflowWrap: "anywhere" }}>
        <b style={{ color: T.text }}>Why clarity is {hinge.hingeClarityLevel.toLowerCase()}:</b> {hinge.hingeClarityReason}
      </p>
      <p style={{ fontSize: 13, color: T.textDim, lineHeight: mobile ? compactLine : 1.65, margin: "10px 0 0", overflowWrap: "anywhere" }}>
        <b style={{ color: T.judge }}>Bridge point:</b> {hinge.bridgePoint}
      </p>
    </Section>
  );
}

function Score({ label, score, color }) {
  return <div><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}><span style={{ fontSize: 12, color: T.muted, fontWeight: 700 }}>{label}</span><b style={{ fontSize: 24, color }}>{score.toFixed(1)}</b></div><div style={{ height: 4, background: T.border, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${score * 10}%`, background: color }} /></div></div>;
}

function DecisionPathControls({ value, onChange }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, marginBottom: 12, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: T.muted, fontWeight: 800, marginBottom: 6 }}>DECISION PATH</div>
          <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.45 }}>Auto for practical and policy questions; override it when you want.</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["auto", "show", "hide"].map((mode) => (
            <button
              key={mode}
              onClick={() => onChange(mode)}
              style={{
                background: value === mode ? T.surface : T.charcoal,
                border: `1px solid ${value === mode ? T.ember : T.border}`,
                borderRadius: 999,
                padding: "6px 10px",
                color: value === mode ? T.ember : T.muted,
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 800,
                fontFamily: "inherit"
              }}
            >
              {mode === "auto" ? "Auto" : mode === "show" ? "Show" : "Hide"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DecisionPathPanel({ decisionPath, mobile, compactLine, grid }) {
  return (
    <Section title="RECOMMENDED DECISION PATH" color={T.judge}>
      <div style={grid}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: T.judge, fontWeight: 800, marginBottom: 8 }}>RECOMMENDED APPROACH</div>
          <p style={{ fontSize: 14, color: T.text, lineHeight: mobile ? compactLine : 1.7, margin: 0 }}>{decisionPath.framework}</p>
        </div>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: T.judge, fontWeight: 800, marginBottom: 8 }}>WHY THIS FITS</div>
          <p style={{ fontSize: 13, color: T.textDim, lineHeight: mobile ? compactLine : 1.7, margin: 0 }}>{decisionPath.why}</p>
        </div>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: T.judge, fontWeight: 800, marginBottom: 8 }}>DRIVER / APPROVER</div>
          <p style={{ fontSize: 13, color: T.textDim, lineHeight: mobile ? compactLine : 1.7, margin: 0 }}>
            <b style={{ color: T.text }}>Driver:</b> {decisionPath.driver}
            <br />
            <b style={{ color: T.text }}>Approver:</b> {decisionPath.approver}
          </p>
        </div>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: T.judge, fontWeight: 800, marginBottom: 8 }}>INPUT / LOG</div>
          <p style={{ fontSize: 13, color: T.textDim, lineHeight: mobile ? compactLine : 1.7, margin: 0 }}>
            <b style={{ color: T.text }}>Input deadline:</b> {decisionPath.deadline}
            <br />
            <b style={{ color: T.text }}>Decision log template:</b> {decisionPath.logTemplate}
          </p>
        </div>
      </div>
    </Section>
  );
}

export default function DebateFurnace() {
  const mobile = useMobile();
  const reportLine = mobile ? 1.55 : 1.75;
  const compactLine = mobile ? 1.45 : 1.65;
  const starterHelp = mobile
    ? "Custom questions are experimental. Starters work best."
    : "Custom questions are experimental. Starter questions give the best results right now.";
  const [question, setQuestion] = useState("");
  const [sideA, setSideA] = useState("");
  const [sideB, setSideB] = useState("");
  const [intensity, setIntensity] = useState("balanced");
  const [debate, setDebate] = useState(null);
  const [round, setRound] = useState(0);
  const [analysis, setAnalysis] = useState(false);
  const [final, setFinal] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [roundCopied, setRoundCopied] = useState("");
  const [loading, setLoading] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState("");
  const [debateHistory, setDebateHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [decisionPathPreference, setDecisionPathPreference] = useState(() => getSavedDecisionPathPreference());
  const grid = { display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 12 };
  const colors = { balanced: T.sideA, aggressive: T.gold, ruthless: T.molten };

  useEffect(() => {
    setDebateHistory(getSavedDebateHistory());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DECISION_PATH_KEY, decisionPathPreference);
  }, [decisionPathPreference]);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#d=") ? window.location.hash.slice(3) : "";
    if (!hash) return;
    const payload = fromBase64Url(hash);
    if (!payload?.debate) return;
    if (payload.question) setQuestion(payload.question);
    if (payload.sideA) setSideA(payload.sideA);
    if (payload.sideB) setSideB(payload.sideB);
    if (payload.intensity) setIntensity(payload.intensity);
    setDebate(payload.debate);
    setRound(0);
    setFinal(true);
    setAnalysis(false);
    setOpen(false);
    setFallbackNotice("");
  }, []);

  useEffect(() => {
    if (!debate || !final) return;
    const payload = makeSharePayload(question, sideA, sideB, intensity, debate);
    safelyReplaceUrl(buildShareLink(payload));
  }, [debate, final, question, sideA, sideB, intensity]);

  const saveToHistory = (entry) => {
    const next = persistDebateHistory(entry);
    setDebateHistory(next);
  };

  const start = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setFallbackNotice("");
    try {
      let result;
      if (isStarterQuestion(question)) {
        result = generate(question, sideA, sideB, intensity);
      } else {
        const response = await fetch("/api/debate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, sideA, sideB, intensity })
        });
        if (!response.ok) {
          let detail = "";
          try {
            const payload = await response.json();
            detail = payload?.detail || payload?.error || "";
          } catch {
            try {
              detail = await response.text();
            } catch {
              detail = "";
            }
          }
          throw new Error(detail ? `${response.status}: ${detail}` : `${response.status}: AI generation unavailable`);
        }
        result = generate(question, sideA, sideB, intensity, await response.json());
      }
      saveToHistory(summarizeDebate(question, result));
      setDebate(result);
      setRound(0);
      setFinal(false);
      setOpen(false);
      setAnalysis(true);
      setShareCopied(false);
      setRoundCopied("");
    } catch (error) {
      const fallbackDebate = generate(question, sideA, sideB, intensity);
      saveToHistory(summarizeDebate(question, fallbackDebate));
      setDebate(fallbackDebate);
      setFallbackNotice(summarizeAiFailure(error));
      setRound(0);
      setFinal(false);
      setOpen(false);
      setAnalysis(true);
      setShareCopied(false);
      setRoundCopied("");
    } finally {
      setLoading(false);
    }
  };
  const reset = () => { setDebate(null); setSideA(""); setSideB(""); setFinal(false); setAnalysis(false); setRound(0); setFallbackNotice(""); setShareCopied(false); setRoundCopied(""); safelyReplaceUrl(window.location.pathname); };
  const stoke = () => { setAnalysis(false); round < 2 ? setRound(round + 1) : setFinal(true); };
  const copy = () => {
    if (!debate) return;
    const result = verdictLabel(debate.matchWinner, debate.shortA, debate.shortB);
    const label = debate.label === "Moral / Philosophical" ? "Unburned Claims to Verify or Clarify" : "Unburned Claims to Verify";
    const shareLink = buildShareLink(makeSharePayload(question, sideA, sideB, intensity, debate));
    const showDecisionPath = shouldShowDecisionPath(debate, decisionPathPreference);
    const decisionPath = getDecisionPath(debate);
    const hinge = normalizeHinge(debate.hinge, { question, qType: debate.qType, sideA: debate.sideA, sideB: debate.sideB, comp: debate.comp, core: debate.core });
    const cardoReiBlock = `\n## CARDO REI Method\n- Axis 1: Does the response land?\n- Axis 2: Does the reasoning hold?\n- Final judgment: What is the hinge of the matter?\n`;
    const decisionPathBlock = showDecisionPath
      ? `\n## Recommended Decision Path\n- Framework: ${decisionPath.framework}\n- Driver: ${decisionPath.driver}\n- Approver: ${decisionPath.approver}\n- Contributors: ${decisionPath.contributors}\n- Input deadline: ${decisionPath.deadline}\n- Decision log template: ${decisionPath.logTemplate}\n- Why this path fits: ${decisionPath.why}\n`
      : "";
    const md = `# Debate Furnace — Final Report\n\n**Question:** ${question}\n**Type:** ${debate.label}\n${cardoReiBlock}\n## The Hinge\n**Question type:** ${hinge.questionType}\n**Hinge clarity:** ${hinge.hingeClarityLevel} — ${hinge.hingeClarityReason}\n\n- **${debate.shortA} protects:** ${hinge.sideAProtects}\n- **${debate.shortA} fears losing:** ${hinge.sideAFears}\n- **${debate.shortB} protects:** ${hinge.sideBProtects}\n- **${debate.shortB} fears losing:** ${hinge.sideBFears}\n- **Core tension:** ${hinge.coreTension}\n- **Bridge point:** ${hinge.bridgePoint}\n\n## What Survived The Heat\n**Result:** ${result}\n**Score:** ${debate.shortA}: ${debate.aWins} | ${debate.shortB}: ${debate.bWins}${debate.ties ? ` | ${debate.ties} tie` : ""}\n\n## What the Question Was Really Asking\n${debate.desc}\n\n## Key Takeaways\n${debate.take.map(([t, b]) => `- **${t}:** ${b}`).join("\n")}\n\n## Strongest Cases\n- **${debate.shortA}:** ${debate.strongA}\n- **${debate.shortB}:** ${debate.strongB}\n\n## Where Each Side Cracked\n- **${debate.shortA}:** ${debate.crackA}\n- **${debate.shortB}:** ${debate.crackB}\n\n## ${label}\n${debate.verify.map((v) => `- ${v}`).join("\n")}\n\n## What Would Change the Verdict?\n### Make ${debate.shortA} stronger\n${debate.changeA.map((v) => `- ${v}`).join("\n")}\n\n### Make ${debate.shortB} stronger\n${debate.changeB.map((v) => `- ${v}`).join("\n")}\n\n## What This Really Depends On\n${debate.core}\n\n- If you value **${debate.comp[0]}**, ${debate.shortA} feels stronger.\n- If you value **${debate.comp[1]}**, ${debate.shortB} feels stronger.\n- The real question is: ${debate.comp[2]}.${decisionPathBlock}\n\n## Transcript\n${debate.rounds.map((r) => `### Round ${r.round} — ${r.label}\n**${debate.shortA}:** ${r.aArg}\n\n**${debate.shortB}:** ${r.bArg}\n\n**Judge:** ${r.judgeNote}`).join("\n\n")}\n\n**Share link:** ${shareLink}\n\n---\n*Pressure-test both sides. Find the hinge. Decide what matters.*`;
    navigator.clipboard.writeText(md).finally(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  const copyShareLink = () => {
    if (!debate) return;
    const shareLink = buildShareLink(makeSharePayload(question, sideA, sideB, intensity, debate));
    navigator.clipboard.writeText(shareLink).finally(() => { setShareCopied(true); setTimeout(() => setShareCopied(false), 1500); });
  };

  const copyRound = (rr) => {
    if (!debate || !rr) return;
    const text = `# Debate Furnace — Round ${rr.round}\n\n**Question:** ${question}\n**Type:** ${debate.label}\n**Round:** ${rr.label}\n\n**${debate.shortA}:** ${rr.aArg}\n\n**${debate.shortB}:** ${rr.bArg}\n\n**Judge:** ${rr.judgeNote}\n`;
    navigator.clipboard.writeText(text).finally(() => {
      setRoundCopied(`r${rr.round}`);
      setTimeout(() => setRoundCopied(""), 1500);
    });
  };

  const loadSavedDebate = (entry) => {
    const payload = entry?.payload;
    if (!payload?.debate) return;
    setQuestion(payload.question || "");
    setSideA(payload.sideA || "");
    setSideB(payload.sideB || "");
    setIntensity(payload.intensity || "balanced");
    setDebate(payload.debate);
    setRound(0);
    setFinal(true);
    setAnalysis(false);
    setOpen(false);
    setFallbackNotice("");
    setShareCopied(false);
    setRoundCopied("");
    safelyReplaceUrl(buildShareLink(payload));
  };

  if (!debate) return <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", color: T.text, padding: mobile ? "16px 12px 92px" : "36px 20px 60px" }}><div style={{ maxWidth: 680, margin: "0 auto" }}><div style={{ textAlign: "center", marginBottom: mobile ? 18 : 32 }}><div style={{ fontSize: 10, letterSpacing: 7, color: T.brass, fontWeight: 800, marginBottom: 14 }}>DEBATE FURNACE</div><h1 style={{ fontSize: mobile ? 34 : 46, fontWeight: 900, margin: "0 0 12px", letterSpacing: -1.5, lineHeight: 1.05, background: `linear-gradient(135deg,${T.molten},${T.brass},${T.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Debate Furnace</h1><p style={{ color: T.textDim, fontSize: 14, lineHeight: 1.5, marginBottom: 8 }}>Pressure-test both sides.<br />Find the hinge. Decide what matters.</p><p style={{ color: T.muted, fontSize: 13, lineHeight: mobile ? reportLine : 1.7, marginBottom: 0 }}>A thinking tool for arguments too complex for tribal yes/no answers.</p></div><div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3,1fr)", gap: 12, marginBottom: mobile ? 18 : 28 }}>{[["⚔", "Steel-Man Both Sides", "Each side gets its strongest form before pressure is applied."], ["⚑", "Flag the Smoke", "Weak logic, unsupported claims, and evasions get called out."], ["🧭", "Find the Hinge", "The report shows what the disagreement actually depends on."]].map(([i, t, b]) => <div key={t} style={{ background: T.card, border: `1px solid ${T.border}`, borderTop: `2px solid ${T.ember}`, borderRadius: 12, padding: 16 }}><div style={{ fontSize: 20, marginBottom: 8 }}>{i}</div><b style={{ fontSize: 12 }}>{t}</b><p style={{ fontSize: 12, color: T.muted, lineHeight: mobile ? compactLine : 1.6 }}>{b}</p></div>)}</div><div style={{ fontSize: 10, letterSpacing: 3, color: T.muted, fontWeight: 700, marginBottom: 10 }}>STARTER QUESTIONS</div><div style={{ display: "flex", flexWrap: mobile ? "nowrap" : "wrap", overflowX: mobile ? "auto" : "visible", gap: 8, marginBottom: 18, paddingBottom: mobile ? 4 : 0, WebkitOverflowScrolling: "touch" }}>{STARTERS.map((s) => <button key={s} onClick={() => setQuestion(s)} style={{ flex: mobile ? "0 0 auto" : "initial", whiteSpace: "nowrap", background: question === s ? `${T.ember}18` : T.charcoal, border: `1px solid ${question === s ? T.ember : T.border}`, borderRadius: 20, padding: mobile ? "6px 12px" : "7px 14px", fontSize: 12, color: question === s ? T.ember : T.textDim, cursor: "pointer" }}>{s}</button>)}</div><div style={{ background: T.surface, border: `1px solid ${T.ember}44`, borderRadius: 16, padding: mobile ? 14 : 22, marginBottom: 18 }}><label style={{ fontSize: 10, letterSpacing: 3, color: T.brass, fontWeight: 800 }}>QUESTION UNDER PRESSURE</label><textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} placeholder="State the question you want pressure tested..." style={{ width: "100%", boxSizing: "border-box", marginTop: 8, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", color: T.text, fontSize: 14, resize: "vertical", fontFamily: "inherit", lineHeight: mobile ? 1.55 : 1.65, overflowWrap: "anywhere" }} /><p style={{ margin: "8px 0 0", color: T.muted, fontSize: 12, lineHeight: 1.45 }}>{starterHelp}</p>{fallbackNotice && <p style={{ margin: "8px 0 0", color: T.ember, fontSize: 12, lineHeight: 1.45 }}>{fallbackNotice}</p>}<div style={{ ...grid, marginTop: 14 }}>{[[sideA, setSideA, T.sideA, "SIDE A POSITION"], [sideB, setSideB, T.sideB, "SIDE B POSITION"]].map(([v, set, c, l]) => <div key={l}><label style={{ fontSize: 10, letterSpacing: 2, color: c, fontWeight: 800 }}>{l}</label><input value={v} onChange={(e) => set(e.target.value)} placeholder="Optional — auto-labeled if blank" style={{ width: "100%", boxSizing: "border-box", marginTop: 6, background: T.charcoal, border: `1px solid ${c}33`, borderRadius: 9, padding: "10px 12px", color: T.text, fontSize: 13 }} /></div>)}</div></div><div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: 10, marginBottom: 18 }}>{["balanced", "aggressive", "ruthless"].map((x) => <button key={x} onClick={() => setIntensity(x)} style={{ flex: 1, padding: mobile ? "8px 8px" : "12px 8px", background: intensity === x ? T.surface : T.charcoal, border: `2px solid ${intensity === x ? colors[x] : T.border}`, borderRadius: 12, cursor: "pointer" }}><b style={{ color: colors[x], textTransform: "capitalize" }}>{x}</b></button>)}</div><div style={{ position: mobile ? "sticky" : "static", bottom: mobile ? 0 : "auto", zIndex: mobile ? 20 : 1, marginTop: mobile ? 12 : 0, padding: mobile ? "10px 0 calc(12px + env(safe-area-inset-bottom))" : 0, background: mobile ? `${T.bg}f2` : "transparent", backdropFilter: mobile ? "blur(16px)" : "none", borderTop: mobile ? `1px solid ${T.border}` : "none" }}><button onClick={start} disabled={!question.trim() || loading} style={{ width: "100%", background: question.trim() && !loading ? `linear-gradient(135deg,${T.molten},${T.brass})` : T.charcoal, border: "none", borderRadius: 12, padding: 16, fontSize: 15, fontWeight: 900, color: question.trim() && !loading ? "white" : T.muted, cursor: question.trim() && !loading ? "pointer" : "not-allowed", letterSpacing: 2 }}>{loading ? "IGNITING..." : "IGNITE DEBATE"}</button></div>{debateHistory.length > 0 && <div style={{ maxWidth: 680, margin: "16px auto 0", background: T.card, border: "1px solid " + T.border, borderRadius: 12, overflow: "hidden" }}><button onClick={() => setHistoryOpen((v) => !v)} style={{ width: "100%", background: "none", border: "none", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: "inherit" }}><span style={{ fontSize: 10, letterSpacing: 3, color: T.muted, fontWeight: 800 }}>MY DEBATES</span><span style={{ fontSize: 12, color: T.muted }}>{historyOpen ? "▲" : "▼"}</span></button>{historyOpen && <div style={{ borderTop: "1px solid " + T.border, padding: "10px 12px" }}>{debateHistory.map((item) => <button key={item.id} onClick={() => loadSavedDebate(item)} style={{ width: "100%", textAlign: "left", background: T.charcoal, border: "1px solid " + T.border, borderRadius: 10, padding: "10px 12px", marginBottom: 8, cursor: "pointer", color: T.text, fontFamily: "inherit" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4, flexWrap: "wrap" }}><strong style={{ fontSize: 13, color: T.text }}>{item.question}</strong><span style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap" }}>{formatSavedAt(item.savedAt)}</span></div><div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.5, display: "flex", gap: 8, flexWrap: "wrap" }}><span>{item.label}</span><span style={{ color: T.border }}>•</span><span>{item.result}</span><span style={{ color: T.border }}>•</span><span>{item.shortA} vs {item.shortB}</span></div></button>)}</div>}</div>}<div style={{ maxWidth: 680, margin: "10px auto 0", display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", fontSize: 12, color: T.muted }}><a href="https://x.com/PromptHound96" target="_blank" rel="noreferrer" style={{ color: T.textDim, textDecoration: "none" }}>X @PromptHound96</a><span style={{ color: T.border }}>•</span><a href="https://github.com/aaronmarchant96-max" target="_blank" rel="noreferrer" style={{ color: T.textDim, textDecoration: "none" }}>GitHub aaronmarchant96-max</a></div></div></div>;

  const h = HEAT[debate.heatLevel] || HEAT.medium;
  const r = debate.rounds[round];
  const result = verdictLabel(debate.matchWinner, debate.shortA, debate.shortB);
  const unburned = debate.label === "Moral / Philosophical" ? "UNBURNED CLAIMS TO VERIFY OR CLARIFY" : "UNBURNED CLAIMS TO VERIFY";
  const hinge = normalizeHinge(debate.hinge, { question, qType: debate.qType, sideA: debate.sideA, sideB: debate.sideB, comp: debate.comp, core: debate.core });
  const decisionPath = getDecisionPath(debate);
  const decisionPathShown = shouldShowDecisionPath(debate, decisionPathPreference);
  return <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", color: T.text }}><div style={{ position: "sticky", top: 0, zIndex: 10, background: `${T.bg}f2`, backdropFilter: "blur(16px)", borderBottom: `1px solid ${T.border}`, padding: mobile ? "8px 12px" : "10px 20px" }}><div style={{ maxWidth: 940, margin: "0 auto", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontSize: 11, letterSpacing: 4, color: T.ember, fontWeight: 900 }}>DEBATE FURNACE</span><Pill color={h[2]} compact={mobile}>{h[0]}</Pill><Pill color={T.brass} compact={mobile}>{debate.icon} {debate.label}</Pill></div><div style={{ display: "flex", gap: 8 }}>{final && <button onClick={copyShareLink} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", color: shareCopied ? T.judge : T.muted, cursor: "pointer" }}>{shareCopied ? "Link Copied" : "Share Link"}</button>}{final && <button onClick={copy} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", color: copied ? T.judge : T.muted, cursor: "pointer" }}>{copied ? "Copied" : "Copy Report"}</button>}<button onClick={reset} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", color: T.muted, cursor: "pointer" }}>Reset</button></div></div></div><div style={{ maxWidth: 940, margin: "0 auto", padding: mobile ? "14px 12px 18px" : "20px" }}><div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: mobile ? "12px 14px" : "14px 16px", marginBottom: 14 }}><div style={{ fontSize: mobile ? 13 : 14, lineHeight: mobile ? reportLine : 1.5, marginBottom: 8 }}>{question}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Pill color={T.sideA} compact={mobile}>{debate.shortA}: {debate.sideA}</Pill><Pill color={T.sideB} compact={mobile}>{debate.shortB}: {debate.sideB}</Pill><Pill color={colors[intensity]} compact={mobile}>{intensity}</Pill></div></div>{fallbackNotice && <div style={{ background: `${T.ember}10`, border: `1px solid ${T.ember}33`, borderRadius: 10, padding: "10px 14px", color: T.ember, fontSize: 12, lineHeight: 1.55, marginBottom: 14 }}>{fallbackNotice}</div>}{analysis ? <Section title={`${debate.icon} QUESTION ANALYSIS`} color={T.brass}><div style={grid}><p style={{ fontSize: 13, color: T.textDim, lineHeight: mobile ? compactLine : 1.7, overflowWrap: "anywhere" }}>{debate.desc}</p><div>{debate.criteria.map((c) => <span key={c} style={{ display: "inline-block", background: `${T.gold}10`, border: `1px solid ${T.gold}30`, borderRadius: 8, padding: "2px 8px", fontSize: 11, color: T.gold, margin: 2 }}>{c}</span>)}</div></div><button onClick={stoke} style={{ marginTop: 16, background: `linear-gradient(135deg,${T.molten},${T.brass})`, border: "none", borderRadius: 10, padding: "12px 22px", color: "white", fontWeight: 900, cursor: "pointer" }}>BEGIN ROUND 1 — OPENING ARGUMENTS</button></Section> : !final ? <><div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}><Pill color={T.ember} compact={mobile}>ROUND {r.round} — {r.label.toUpperCase()}</Pill><button onClick={() => copyRound(r)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 999, padding: "5px 10px", color: roundCopied === `r${r.round}` ? T.judge : T.muted, cursor: "pointer", fontSize: 11, fontWeight: 800, fontFamily: "inherit" }}>{roundCopied === `r${r.round}` ? "Copied" : "Copy Round"}</button></div><div style={grid}>{[[debate.shortA, r.aArg, T.sideA, "A"], [debate.shortB, r.bArg, T.sideB, "B"]].map(([n, a, c, s]) => <div key={s} style={{ background: T.card, border: `1px solid ${c}28`, borderTop: `3px solid ${c}`, borderRadius: 12, padding: mobile ? 16 : 20 }}><b style={{ color: c }}>{s} {n.toUpperCase()}</b><p style={{ fontSize: 13.5, lineHeight: mobile ? compactLine : 1.8 }}>{a}</p></div>)}</div><div style={{ background: T.card, border: `1px solid ${T.judge}33`, borderLeft: `3px solid ${T.judge}`, borderRadius: 12, padding: mobile ? 16 : 20, marginTop: 14, marginBottom: 20 }}><div style={{ fontSize: 10, letterSpacing: 3, color: T.judge, fontWeight: 800, marginBottom: 14 }}>FURNACE JUDGE — ROUND {r.round}</div><div style={grid}><Score label={debate.shortA} score={r.sa} color={T.sideA} /><Score label={debate.shortB} score={r.sb} color={T.sideB} /></div><p style={{ fontSize: 13, color: T.muted, lineHeight: mobile ? compactLine : 1.65, overflowWrap: "anywhere" }}>{r.judgeNote}</p></div><button onClick={stoke} style={{ width: "100%", background: "linear-gradient(135deg,#111825,#1a1228)", border: `1px solid ${T.sideA}44`, borderRadius: 12, padding: 14, color: T.sideA, fontWeight: 800, cursor: "pointer" }}>{round < 2 ? `STOKE THE FURNACE → ROUND ${round + 2}` : "STOKE THE FURNACE → WHAT SURVIVED"}</button></> : <><HingeCard hinge={hinge} shortA={debate.shortA} shortB={debate.shortB} mobile={mobile} compactLine={compactLine} grid={grid} /><div style={{ background: "linear-gradient(135deg,#130f08,#0f0810)", border: `1px solid ${T.gold}44`, borderRadius: 16, padding: mobile ? 20 : 28, textAlign: "center", marginBottom: 18 }}><div style={{ fontSize: 10, letterSpacing: 6, color: T.brass, marginBottom: 10 }}>WHAT SURVIVED THE HEAT</div><div style={{ fontSize: mobile ? 24 : 30, fontWeight: 900, color: T.gold }}>{result}</div><div style={{ fontSize: 13, color: T.muted, marginTop: 8, lineHeight: mobile ? compactLine : 1.6 }}>{debate.shortA}: {debate.aWins} rounds · {debate.shortB}: {debate.bWins} rounds{debate.ties ? ` · ${debate.ties} tie` : ""}</div><Pill color={h[2]} compact={mobile}>{h[0]} — {h[1]}</Pill><p style={{ fontSize: 11, color: T.muted, fontStyle: "italic" }}>Performed better under pressure means it scored higher under this debate setup — not a claim of objective truth.</p></div><Section title={`${debate.icon} WHAT THE QUESTION WAS REALLY ASKING`} color={T.brass}><p style={{ fontSize: 13, lineHeight: mobile ? compactLine : 1.7, overflowWrap: "anywhere", color: T.textDim }}>{debate.desc}</p></Section><Section title="KEY TAKEAWAYS" color={T.gold}>{debate.take.map(([t, b]) => <p key={t} style={{ fontSize: 13, color: T.textDim, lineHeight: mobile ? compactLine : 1.7, overflowWrap: "anywhere" }}><b style={{ color: T.text }}>{t}:</b> {b}</p>)}</Section><div style={grid}><Card title={`STRONGEST — ${debate.shortA.toUpperCase()}`} color={T.sideA}>{debate.strongA}</Card><Card title={`STRONGEST — ${debate.shortB.toUpperCase()}`} color={T.sideB}>{debate.strongB}</Card><Card title={`WHERE ${debate.shortA.toUpperCase()} CRACKED`} color={T.ember}>{debate.crackA}</Card><Card title={`WHERE ${debate.shortB.toUpperCase()} CRACKED`} color={T.ember}>{debate.crackB}</Card></div><Section title={unburned} color={T.smoke}>{debate.verify.map((v) => <div key={v} style={{ fontSize: 13, color: T.textDim, lineHeight: mobile ? compactLine : 1.65, overflowWrap: "anywhere", marginBottom: 8 }}>• {v}</div>)}</Section><Section title="WHAT WOULD CHANGE THE VERDICT?" color={T.brass}><div style={grid}>{[[`Make ${debate.shortA} stronger`, debate.changeA, T.sideA], [`Make ${debate.shortB} stronger`, debate.changeB, T.sideB]].map(([t, items, c]) => <div key={t}><b style={{ fontSize: 11, color: c }}>{t.toUpperCase()}</b>{items.map((i) => <div key={i} style={{ fontSize: 12, color: T.textDim, lineHeight: mobile ? compactLine : 1.65, overflowWrap: "anywhere", marginTop: 6 }}>• {i}</div>)}</div>)}</div></Section><DecisionPathControls value={decisionPathPreference} onChange={setDecisionPathPreference} />{decisionPathShown && <DecisionPathPanel decisionPath={decisionPath} mobile={mobile} compactLine={compactLine} grid={grid} />}<Section title="WHAT THIS REALLY DEPENDS ON" color={T.gold}><p style={{ fontSize: mobile ? 14 : 15, lineHeight: mobile ? compactLine : 1.7, overflowWrap: "anywhere", fontStyle: "italic" }}>{debate.core}</p><p style={{ lineHeight: mobile ? 1.55 : 1.7, overflowWrap: "anywhere" }}>If you value <b style={{ color: T.sideA }}>{debate.comp[0]}</b>, {debate.shortA} feels stronger.</p><p style={{ lineHeight: mobile ? 1.55 : 1.7, overflowWrap: "anywhere" }}>If you value <b style={{ color: T.sideB }}>{debate.comp[1]}</b>, {debate.shortB} feels stronger.</p><p style={{ lineHeight: mobile ? 1.55 : 1.7, overflowWrap: "anywhere" }}><span style={{ color: T.muted }}>The real question is: </span><em style={{ color: T.gold }}>{debate.comp[2]}</em>.</p><div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, fontSize: 13, color: T.muted, fontStyle: "italic" }}>The decision is yours. The furnace shows what the choice depends on.</div></Section><div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, marginBottom: mobile ? 18 : 18, overflow: "hidden" }}><button onClick={() => setOpen(!open)} style={{ width: "100%", background: "none", border: "none", padding: mobile ? "12px 14px" : "14px 18px", display: "flex", justifyContent: "space-between", color: T.muted, fontWeight: 800, cursor: "pointer" }}>FULL DEBATE TRANSCRIPT <span>{open ? "▲" : "▼"}</span></button>{open && <div style={{ padding: mobile ? "4px 14px 18px" : "4px 18px 22px", borderTop: `1px solid ${T.border}` }}>{debate.rounds.map((rr) => <div key={rr.round} style={{ marginTop: 20 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}><b style={{ fontSize: 10, letterSpacing: 3, color: T.ember }}>ROUND {rr.round} — {rr.label.toUpperCase()}</b><button onClick={() => copyRound(rr)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 999, padding: "5px 10px", color: roundCopied === `r${rr.round}` ? T.judge : T.muted, cursor: "pointer", fontSize: 11, fontWeight: 800, fontFamily: "inherit" }}>{roundCopied === `r${rr.round}` ? "Copied" : "Copy Round"}</button></div><p style={{ lineHeight: mobile ? compactLine : 1.7, overflowWrap: "anywhere" }}><b style={{ color: T.sideA }}>{debate.shortA}:</b> {rr.aArg}</p><p style={{ lineHeight: mobile ? compactLine : 1.7, overflowWrap: "anywhere" }}><b style={{ color: T.sideB }}>{debate.shortB}:</b> {rr.bArg}</p><div style={{ background: T.charcoal, borderRadius: 8, padding: 12, fontSize: 13, color: T.muted, lineHeight: mobile ? compactLine : 1.65, overflowWrap: "anywhere" }}><b style={{ color: T.judge }}>JUDGE:</b> {rr.judgeNote}</div></div>)}</div>}</div><p style={{ textAlign: "center", color: T.muted, fontSize: 12, fontStyle: "italic" }}>"Pressure-test both sides. Find the hinge. Decide what matters."</p><div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: 12, position: mobile ? "sticky" : "static", bottom: mobile ? 0 : "auto", zIndex: mobile ? 20 : 1, padding: mobile ? "10px 0 calc(12px + env(safe-area-inset-bottom))" : 0, background: mobile ? `${T.bg}f2` : "transparent", backdropFilter: mobile ? "blur(16px)" : "none", borderTop: mobile ? `1px solid ${T.border}` : "none" }}><button onClick={copy} style={{ flex: 1, background: T.charcoal, border: `1px solid ${T.border}`, borderRadius: 12, padding: 13, color: copied ? T.judge : T.muted, fontWeight: 800, cursor: "pointer" }}>{copied ? "Copied" : "Copy Full Report"}</button><button onClick={reset} style={{ flex: 1, background: `linear-gradient(135deg,${T.molten},${T.brass})`, border: "none", borderRadius: 12, padding: 13, color: "white", fontWeight: 900, cursor: "pointer" }}>NEW DEBATE</button></div><div style={{ maxWidth: 940, margin: "14px auto 0", display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", fontSize: 12, color: T.muted }}><a href="https://x.com/PromptHound96" target="_blank" rel="noreferrer" style={{ color: T.textDim, textDecoration: "none" }}>X @PromptHound96</a><span style={{ color: T.border }}>•</span><a href="https://github.com/aaronmarchant96-max" target="_blank" rel="noreferrer" style={{ color: T.textDim, textDecoration: "none" }}>GitHub aaronmarchant96-max</a></div></>}</div></div>;
}
