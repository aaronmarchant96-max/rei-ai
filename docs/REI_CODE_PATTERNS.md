# REI Code Patterns — Quick Reference

## Pattern 1: Domain-Specific Initialization

**Location**: src/REI.jsx, lines 91-100 & 938-952

```javascript
// New helper function (extraction pattern)
function buildDomainSystemMessage(domainId, currentDomain) {
  if (domainId === "assistant") {
    return `System initialized. ${getAssistantWelcomeCopy()}`;
  }
  return `System initialized. Welcome to REI.ai ${currentDomain.label}...`;
}

// Usage in useState initializer
const [messages, setMessages] = useState(() => {
  const storedMessages = readStoredMessages(selectedDomain);
  if (storedMessages) {
    return storedMessages;
  }
  
  return [{
    sender: "rei",
    text: buildDomainSystemMessage(selectedDomain, currentDomain),
    timestamp: new Date().toLocaleTimeString()
  }];
});
```

**Why This Pattern**: 
- Separates concern (message building from state management)
- Makes testing easier
- Reusable in multiple places (useEffect, handleClearHistory, etc.)
- Domain logic is centralized

---

## Pattern 2: Error-Resilient Storage

**Location**: src/REI.jsx, lines 102-129

```javascript
function readStoredMessages(selectedDomain) {
  // Guard: Check runtime environment
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey = `rei_chat_history_${selectedDomain}`;
  const saved = window.localStorage.getItem(storageKey);

  if (!saved) {
    return null;
  }

  try {
    const parsed = JSON.parse(saved);
    
    // Guard: Validate type
    if (!Array.isArray(parsed)) {
      throw new Error("Stored chat history is not an array");
    }
    
    return parsed;
  } catch (error) {
    // Defensive: Log the error
    console.error("Failed to parse saved chat history:", error);
    
    // Defensive: Clean up corrupted data
    try {
      window.localStorage.removeItem(storageKey);
    } catch (cleanupError) {
      console.warn("Unable to clear corrupted chat history storage:", cleanupError);
    }
    
    return null;  // Fallback to fresh state
  }
}
```

**Why This Pattern**:
- Multiple guard checks (runtime, existence, type)
- Error recovery (cleanup corrupted data)
- Nested try/catch (storage can fail too)
- Testable with corrupted data injection

---

## Pattern 3: Rule-Based Routing with Keyword Matching

**Location**: src/lib/nightShiftRouter.js, lines 34-53

```javascript
function escapeKeyword(term = "") {
  return String(term ?? "")
    .trim()
    .replace(/\s+/g, "\\s+")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");  // Escape regex chars
}

function keywordMatches(text, term = "") {
  const escaped = escapeKeyword(term);
  if (!escaped) return false;

  // Word boundary check: match whole words only
  // Prevents "code" in "decode" from matching
  const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  return pattern.test(text);
}

function getCatalogRouteMatch(text) {
  for (const entry of ROUTER_CATALOG) {
    const terms = Array.isArray(entry?.matchTerms) ? entry.matchTerms : [];
    
    // First match wins (catalog order matters)
    if (terms.some((term) => keywordMatches(text, term))) {
      return entry;
    }
  }
  
  return null;  // No match → use fallback route
}
```

**Why This Pattern**:
- Word boundaries prevent false positives
- Defensive type checking (Array.isArray)
- Safe defaults (empty array, null return)
- Testable with known inputs

**Example**:
- "I need code help" → MATCHES "code"
- "decode this" → DOES NOT MATCH "code" (not a word boundary)

---

## Pattern 4: Cost-Aware Decision Logic

**Location**: src/lib/cardoGuard.js, lines 35-79

```javascript
export function getSyntheticFalseAlarmRate(confidence) {
  // Confidence band → false alarm rate mapping
  if (confidence >= 95) return 0.09;    // Very high confidence → 9% false alarms
  if (confidence >= 90) return 0.15;    // High confidence → 15% false alarms
  if (confidence >= 85) return 0.31;    // Moderate → 31%
  if (confidence >= 75) return 0.44;    // Low → 44%
  return 0.57;                          // Very low → 57% false alarms
}

export function calculateBreakevenMissCost(costToAct, falseAlarmRate) {
  // Formula: (costToAct × falseAlarmRate) / (1 - falseAlarmRate)
  // This is the hinge point where decision flips
  
  const numericCost = toMoneyNumber(costToAct);
  const rate = Number(falseAlarmRate);
  
  if (rate >= 1) return 0;  // Edge case: certainty is impossible
  
  return (numericCost * rate) / (1 - rate);
}

// Usage example:
// costToAct = $17,000 (rerouting expense)
// confidence = 89% → falseAlarmRate = 0.15
// breakeven = ($17k × 0.15) / (1 - 0.15) = $3k
//
// If costToMiss > $3k (it's $1.465M) → ACTION
```

**Why This Pattern**:
- Explicitly maps confidence → false alarm rate
- Mathematical decision logic (not heuristic)
- Defensive edge case handling
- Testable with known scenarios

---

## Pattern 5: Hard-Stop Rule (Prompt Scaffolding)

**Location**: api/cfai.js, lines 37-52

```javascript
const REI_SYSTEM_PROMPT = `
...

## Phase 0 — The Questioning Stance (runs before any code is written)
Before producing code for any non-trivial request, silently answer these. 
If you cannot answer in 1–2 sentences each, STOP and ask the user:

1. What is the real problem (not the symptom)?
2. Who uses this, and in what context?
3. What are the failure modes?
4. What existing code does this touch?
5. Is there a simpler existing solution?
6. What are the non-functional constraints?
7. How will this be verified?

### HARD STOP RULE (Non-Negotiable)
If you cannot answer 2+ Phase 0 questions, your response MUST follow this format:

~~~
**STOP: Request underspecified**

I cannot proceed without:

1. [Unanswerable question 1]
2. [Unanswerable question 2]
[etc]

Please provide these details before I can generate any code.
~~~

**FORBIDDEN:** No code snippets, no partial solutions, no hedging.
**ALLOWED:** Only the questions, only the STOP declaration.
`;
```

**Why This Pattern**:
- Prevents silent assumptions
- Forces clarification before wasted work
- Reproducible (same question triggers same pause)
- Testable (check for STOP keyword in response)

---

## Pattern 6: Defensive Type Checking in Storage

**Location**: src/lib/nightShiftRouter.js, lines 55-71

```javascript
function getStoredRouteHistory() {
  // Guard 1: Runtime environment
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }

  try {
    // Guard 2: Retrieve existing data
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    // Guard 3: Parse safely
    const parsed = JSON.parse(raw);
    
    // Guard 4: Type validation
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    // Silent failure: storage is not critical to routing
    return [];
  }
}
```

**Why This Pattern**:
- Multiple defensive checks
- Graceful degradation (returns empty array on failure)
- Silent catch for non-critical storage
- No crash on corrupted data

---

## Pattern 7: Stateful User Preference Learning

**Location**: src/lib/nightShiftRouter.js, lines 87-99

```javascript
function getStoredRoutePreference() {
  const history = getStoredRouteHistory();
  
  // Need minimum history before inferring preference
  if (history.length < 3) {
    return null;  // Not enough data yet
  }

  // Count occurrences of each route
  const routeCounts = history.reduce((accumulator, routeId) => {
    accumulator[routeId] = (accumulator[routeId] || 0) + 1;
    return accumulator;
  }, {});

  // Return most frequent route (user's pattern)
  return Object.entries(routeCounts)
    .sort((left, right) => right[1] - left[1])[0]?.[0] || null;
}
```

**Why This Pattern**:
- Learns from history without explicit settings
- Minimum threshold prevents overfitting (< 3 requests)
- Frequency-based preference (not just last)
- Handles tie cases (returns null)

**Example**:
```
History: ["coding", "coding", "genealogy", "coding", "coding"]
Counts: { coding: 4, genealogy: 1 }
Preference: "coding" (user mostly does coding)
→ Next ambiguous request routes to coding mode
```

---

## Pattern 8: Reactive Message Initialization

**Location**: src/REI.jsx, lines 960-977 (useEffect)

```javascript
useEffect(() => {
  // Triggered when domain changes
  const domainSpecificMessage = {
    sender: "rei",
    text: buildDomainSystemMessage(selectedDomain, currentDomain),
    timestamp: new Date().toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit" 
    })
  };
  
  // Only add if not already there (prevent duplicates)
  setMessages((prevMessages) => {
    const lastMessage = prevMessages[prevMessages.length - 1];
    if (lastMessage?.sender === "rei" && lastMessage?.text === domainSpecificMessage.text) {
      return prevMessages;  // Already have this message
    }
    return [...prevMessages, domainSpecificMessage];
  });
}, [selectedDomain, currentDomain]);
```

**Why This Pattern**:
- Reacts to domain changes (not just initialization)
- Prevents duplicate messages
- Uses functional setState to avoid stale state
- Immutable message array

---

## Summary: Design Principles Applied

| Pattern | Principle | Benefit |
|---------|-----------|---------|
| Helper extraction (Pattern 1) | Separation of Concerns | Testable, reusable, maintainable |
| Error-resilient storage (Pattern 2) | Defensive Programming | Graceful degradation, recoverable |
| Rule-based routing (Pattern 3) | Explicit Over Implicit | Testable, debuggable, auditable |
| Decision logic (Pattern 4) | Mathematically Sound | Reproducible, verifiable |
| Hard-stop rule (Pattern 5) | Fail-Safe Defaults | Prevents silent failures |
| Type checking (Pattern 6) | Defensive Guards | Crash-resistant |
| Stateful learning (Pattern 7) | Minimal ML | No explicit settings needed |
| Reactive updates (Pattern 8) | Immutable State | Predictable, debuggable |

