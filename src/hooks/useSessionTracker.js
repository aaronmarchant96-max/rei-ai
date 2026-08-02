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
  const [modelBreakdown, setModelBreakdown] = useState({});
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [savingsVsPremium, setSavingsVsPremium] = useState(0);
  const [escalationCount, setEscalationCount] = useState(0);

  const [lifetimeCost, setLifetimeCost] = useState(() => loadLifetime("rei_lifetime_cost", "0"));
  const [lifetimeSavings, setLifetimeSavings] = useState(() => loadLifetime("rei_lifetime_savings", "0"));

  // Refs hold latest session values so the unmount effect always sees current state
  const sessionCostRef = useRef(0);
  sessionCostRef.current = sessionCost;
  const savingsRef = useRef(0);
  savingsRef.current = savingsVsPremium;

  const trackMessage = useCallback((totalTokens, model, cost, premiumCost, wasEscalated) => {
    setSessionTokens((prev) => prev + totalTokens);
    setSessionMessages((prev) => prev + 1);
    setSessionCost((prev) => prev + cost);
    setModelBreakdown((prev) => ({
      ...prev,
      [model]: (prev[model] || 0) + totalTokens,
    }));
    if (premiumCost) {
      setSavingsVsPremium((prev) => prev + (premiumCost - cost));
    }
    if (wasEscalated) {
      setEscalationCount((prev) => prev + 1);
    }
  }, []);

  // Persist lifetime on unmount (page close / refresh)
  useEffect(() => {
    return () => {
      localStorage.setItem("rei_lifetime_cost", (lifetimeCost + sessionCostRef.current).toString());
      localStorage.setItem("rei_lifetime_savings", (lifetimeSavings + savingsRef.current).toString());
    };
  }, []);

  const resetSession = useCallback(() => {
    const newCost = loadLifetime("rei_lifetime_cost", "0") + sessionCostRef.current;
    const newSavings = loadLifetime("rei_lifetime_savings", "0") + savingsRef.current;
    localStorage.setItem("rei_lifetime_cost", newCost.toString());
    localStorage.setItem("rei_lifetime_savings", newSavings.toString());
    setLifetimeCost(newCost);
    setLifetimeSavings(newSavings);

    setSessionTokens(0);
    setSessionMessages(0);
    setSessionCost(0);
    setModelBreakdown({});
    setShowSessionSummary(false);
    setSavingsVsPremium(0);
    setEscalationCount(0);
  }, []);

  return {
    sessionTokens,
    sessionMessages,
    sessionCost,
    modelBreakdown,
    showSessionSummary,
    setShowSessionSummary,
    savingsVsPremium,
    escalationCount,
    lifetimeCost,
    lifetimeSavings,
    trackMessage,
    resetSession,
  };
}
