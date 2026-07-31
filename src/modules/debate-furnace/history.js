// Debate Furnace — history persistence
import { verdictLabel } from "./classifier.js";

const HISTORY_KEY = "rei_furnace_history_v1";
const HISTORY_LIMIT = 12;
const DECISION_PATH_KEY = "rei_furnace_decision_path_v1";

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
      debate,
    },
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
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}
export { HISTORY_KEY, HISTORY_LIMIT, safeParseHistory, getSavedDebateHistory, summarizeDebate, persistDebateHistory, formatSavedAt };
