import { useState, useCallback, useRef, useEffect } from "react";

function loadLifetime(key, fallback) {
  try {
    return parseFloat(localStorage.getItem(key) || fallback);
  } catch {
    return fallback;
  }
}

export function useSessionTracker() {
  const [sessionTokens, setSessionTokens] = useState(0);
  const [sessionMessages, setSessionMessages] = useState(0);
  const [sessionCost, setSessionCost] = useState(0);
  const [sessionChunks, setSessionChunks] = useState(0);
  const [modelBreakdown, setModelBreakdown] = useState({});
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [savingsVsPremium, setSavingsVsPremium] = useState(0);
  const [escalationCount, setEscalationCount] = useState(0);

  const [lifetimeCost, setLifetimeCost] = useState(() => loadLifetime("rei_lifetime_cost", "0"));
  const [lifetimeSavings, setLifetimeSavings] = useState(() => loadLifetime("rei_lifetime_savings", "0"));
  const [lifetimePremium, setLifetimePremium] = useState(() => loadLifetime("rei_lifetime_premium", "0"));

  // Refs hold latest session values so the unmount effect always sees current state
  const sessionCostRef = useRef(0);
  sessionCostRef.current = sessionCost;
  const savingsRef = useRef(0);
  savingsRef.current = savingsVsPremium;
  const premiumRef = useRef(0);

  const trackMessage = useCallback((tokensOrObj, maybeModel, maybeCost, maybePremiumCost, maybeEscalated, maybeChunks) => {
    let totalTokens = 0;
    let model = "unknown";
    let cost = 0;
    let premiumCost = 0;
    let wasEscalated = false;
    let chunks = 1;

    if (tokensOrObj && typeof tokensOrObj === "object") {
      totalTokens = Number(tokensOrObj.tokens || tokensOrObj.totalTokens || 0);
      model = tokensOrObj.model || "unknown";
      cost = Number(tokensOrObj.cost || 0);
      premiumCost = Number(tokensOrObj.premiumCost || 0);
      wasEscalated = Boolean(tokensOrObj.escalation || tokensOrObj.wasEscalated);
      chunks = Number(tokensOrObj.chunks || 1);
    } else {
      totalTokens = Number(tokensOrObj || 0);
      model = maybeModel || "unknown";
      cost = Number(maybeCost || 0);
      premiumCost = Number(maybePremiumCost || 0);
      wasEscalated = Boolean(maybeEscalated);
      chunks = Number(maybeChunks || 1);
    }

    if (isNaN(cost)) cost = 0;
    if (isNaN(premiumCost)) premiumCost = 0;
    if (isNaN(totalTokens)) totalTokens = 0;
    if (isNaN(chunks)) chunks = 1;

    setSessionTokens((prev) => (Number(prev) || 0) + totalTokens);
    setSessionMessages((prev) => (Number(prev) || 0) + 1);
    setSessionCost((prev) => (Number(prev) || 0) + cost);
    setSessionChunks((prev) => (Number(prev) || 0) + chunks);
    setModelBreakdown((prev) => ({
      ...prev,
      [model]: ((prev && Number(prev[model])) || 0) + totalTokens,
    }));
    if (premiumCost) {
      setSavingsVsPremium((prev) => (Number(prev) || 0) + (premiumCost - cost));
      premiumRef.current += premiumCost;
    }
    if (wasEscalated) {
      setEscalationCount((prev) => (Number(prev) || 0) + 1);
    }
  }, []);

  // Persist lifetime on unmount (page close / refresh)
  useEffect(() => {
    return () => {
      localStorage.setItem("rei_lifetime_cost", (lifetimeCost + sessionCostRef.current).toString());
      localStorage.setItem("rei_lifetime_savings", (lifetimeSavings + savingsRef.current).toString());
      localStorage.setItem("rei_lifetime_premium", (lifetimePremium + premiumRef.current).toString());
    };
  }, []);

  const resetSession = useCallback(() => {
    const newCost = loadLifetime("rei_lifetime_cost", "0") + sessionCostRef.current;
    const newSavings = loadLifetime("rei_lifetime_savings", "0") + savingsRef.current;
    const newPremium = loadLifetime("rei_lifetime_premium", "0") + premiumRef.current;
    localStorage.setItem("rei_lifetime_cost", newCost.toString());
    localStorage.setItem("rei_lifetime_savings", newSavings.toString());
    localStorage.setItem("rei_lifetime_premium", newPremium.toString());
    setLifetimeCost(newCost);
    setLifetimeSavings(newSavings);
    setLifetimePremium(newPremium);

    setSessionTokens(0);
    setSessionMessages(0);
    setSessionCost(0);
    setSessionChunks(0);
    setModelBreakdown({});
    setShowSessionSummary(false);
    setSavingsVsPremium(0);
    premiumRef.current = 0;
    setEscalationCount(0);
  }, []);

  return {
    sessionTokens,
    sessionMessages,
    sessionCost,
    sessionChunks,
    modelBreakdown,
    showSessionSummary,
    setShowSessionSummary,
    savingsVsPremium,
    escalationCount,
    lifetimeCost,
    lifetimeSavings,
    lifetimePremium,
    trackMessage,
    resetSession,
  };
}
