// Debate Furnace — decision path logic
import { cleanQuestion } from "./utils.js";

const DECISION_PATH_KEY = "rei_furnace_decision_path_v1";

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
    "genetically modify",
  ];
  if (starterTopics.some((kw) => q.includes(kw))) return true;

  const decisionKeywords = [
    "should",
    "must",
    "allow",
    "ban",
    "require",
    "permit",
    "decide",
    "choose",
    "policy",
    "strategy",
    "plan",
  ];
  return decisionKeywords.some((kw) => q.includes(kw));
}

function getDecisionPath(debate) {
  const q = cleanQuestion(debate?.question || "").toLowerCase();
  const type = String(debate?.qType || "").toLowerCase();
  const isTech = [
    "encryption",
    "frontier ai",
    "ai",
    "architecture",
    "software",
    "system",
    "technical",
    "product",
  ].some((x) => q.includes(x));
  const isHighStakes = [
    "capital punishment",
    "genetically modify",
    "prison",
    "housing",
    "gun control",
    "college",
  ].some((x) => q.includes(x));
  const isTeamOps = [
    "remote work",
    "office work",
    "workweek",
    "meeting",
    "team",
    "async",
    "decision",
  ].some((x) => q.includes(x));

  if (isTeamOps || type === "practical") {
    return {
      framework: "Written Proposal + Timeboxed Input",
      driver: "The person closest to the problem",
      approver: "The decision owner",
      contributors: "Directly affected teammates",
      deadline: "3 business days",
      logTemplate: "Context | options | recommendation | tradeoffs | risks | decision | follow-up",
      why: "Best when the question is about team workflow, operating rhythm, or a practical work setup.",
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
      why: "Best when the choice is technical, implementation-heavy, or likely to be revisited later.",
    };
  }

  if (type === "policy" || isHighStakes) {
    return {
      framework: "DACI",
      driver: "The person driving the proposal",
      approver: "The accountable decision maker",
      contributors: "Subject-matter reviewers and impacted stakeholders",
      deadline: "5 business days",
      logTemplate:
        "Context | decision needed | options | impact by group | risks | recommendation | final call",
      why: "Best when the decision affects multiple groups and needs explicit ownership.",
    };
  }

  return {
    framework: "Disagree and Commit",
    driver: "The person making the recommendation",
    approver: "The final decision maker",
    contributors: "People with relevant context",
    deadline: "2 business days",
    logTemplate: "Question | proposal | objections | resolution | decision | review date",
    why: "Best when the choice is reversible or the team needs speed more than process.",
  };
}
export { DECISION_PATH_KEY, getSavedDecisionPathPreference, shouldShowDecisionPath, getDecisionPath };
