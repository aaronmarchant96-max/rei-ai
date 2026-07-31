import { titleCase, cleanQuestion } from "./utils.js";

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
  if (l.includes("regulation would cause") || l.includes("would cause more harm"))
    return "Light Touch";
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
  personal: "Identity Dispute",
};

function getQuestionTypeLabel(qType) {
  return QUESTION_TYPE_LABELS[qType] || "Value Collision";
}

function getHingeClarity(qType, question) {
  const q = cleanQuestion(question || "").toLowerCase();
  if (!q || q.length < 12 || ["better", "good", "bad", "right", "wrong"].includes(q)) {
    return {
      level: "Low",
      reason:
        "The question is broad enough that the sides may argue past each other until the terms are tightened.",
    };
  }
  if (["moral", "personal"].includes(qType)) {
    return {
      level: "High",
      reason:
        "The disagreement has a clear value collision, so the hinge is mostly about what each side prioritizes.",
    };
  }
  if (["policy", "factual", "extraordinary", "practical"].includes(qType)) {
    return {
      level: "Medium",
      reason:
        "The debate mixes values with evidence, enforcement, trust, or real-world consequences.",
    };
  }
  return {
    level: "Medium",
    reason:
      "The hinge is visible, but the answer still depends on definitions and what evidence each side accepts.",
  };
}


export { shortLabel, verdictLabel, getQuestionTypeLabel, getHingeClarity, QUESTION_TYPE_LABELS };
