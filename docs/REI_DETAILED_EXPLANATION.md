# REI.ai Platform — Detailed Code Explanation

## 1. What is REI?

**REI** stands for **Record, Evaluate, Iterate** — a reasoning-first web application designed for structured decision support. The name also derives from Latin *"Rei"* meaning "The Matter" or "The Hinge."

### Core Philosophy
- **Reasoning over speed**: REI prioritizes structured thinking over rapid responses
- **Cost-aware**: Routes requests intelligently to match model capability with cost
- **Testable behavior**: Every decision is verifiable, not just observable
- **Domain-specialized**: Supports multiple reasoning modes (generalist, coding, genealogy, storytelling)

**Live Demo**: https://debate-furnace.vercel.app/#rei

---

## 2. Architecture Overview

REI has 5 major architectural components:

```
┌─────────────────────────────────────────────┐
│        React UI (src/REI.jsx)              │
│    - Chat interface                         │
│    - Message state management               │
│    - Domain-specific modes                  │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│   Night Shift Router (nightShiftRouter.js)  │
│    - Classifies prompts before API call     │
│    - Routes to fast or premium model        │
│    - Rule-based, explicit, testable        │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│    Backend API (api/cfai.js)                │
│    - Prompt scaffolding                     │
│    - Hard-stop rule for underspecified      │
│    - Calls Groq or CFai CLI                 │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│   CARDO GUARD (cardoGuard.js)               │
│    - Evaluates if acting is worth the cost  │
│    - Decision gate based on confidence      │
│    - Deterministic recommendations          │
└────────────────┬────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────┐
│   Test Suite (Jest)                         │
│    - 55 tests across all layers             │
│    - Routing tests, UI tests, logic tests   │
└─────────────────────────────────────────────┘
```

---

## 3. Main Code Files and Their Purposes

### 3.1 **src/REI.jsx** — The Core Chat Experience

This is the main React component where users interact with REI.

#### Key Structures:

**Domain Profiles** (Lines 14-47):
```javascript
const DOMAIN_PROFILES = [
  {
    id: "assistant",        // Generalist reasoning
    label: "The Generalist",
    description: "Everyday reasoning, judgment, and decision support.",
    rules: ["Short sentences", "Hinge first", "Facts with sources", "Flag uncertainty"],
  },
  {
    id: "coding",           // Senior coding logic
    label: "The Hinge Finder",
    description: "Senior coding logic executing CARDO REI methodology.",
    rules: ["Verify API shapes", "Name hinges explicitly", "Stop and ask if underspecified"],
  },
  {
    id: "genealogy",        // Evidence-tiered research
    label: "The Archivist",
    description: "Evidence-tiered genealogy and disambiguating same-name profiles.",
  },
  {
    id: "story",            // Narrative architecture
    label: "The Storyteller",
    description: "Narrative architecture generating story blueprints.",
  }
];
```

Each domain has its own system prompt and reasoning rules.

**Key Functions**:

1. **`buildDomainSystemMessage(domainId, currentDomain)`** (Lines 91-100)
   - Generates domain-specific welcome messages
   - Used when initializing chat or switching domains
   - Example output: "System initialized. Welcome to REI.ai The Generalist. Everyday reasoning, judgment, and decision support..."

2. **`readStoredMessages(selectedDomain)`** (Lines 102-129) 
   - **Recently refactored** (this is what we did in the previous session!)
   - Safely reads chat history from localStorage
   - Includes error recovery for corrupted data
   - Validates that parsed data is an array
   - Cleans up corrupted storage entries
   - Returns null if no valid history exists
   
   **Why this matters**: localStorage can get corrupted. This function handles it gracefully instead of crashing.

3. **`isSimpleGreeting(text)`** (Lines 57-59)
   - Detects greetings like "hi", "hello", "hey"
   - Used to route simple greetings to a fast, cheap model path

4. **`buildAssistantStyleReply(userText)`** (Lines 61-89)
   - Creates a template response for assistant mode
   - Shows the REI reasoning framework:
     - Hinge (the turning point)
     - Facts (what's known)
     - Assumptions (what's uncertain)
     - Evaluation (how strong the case is)
     - What would change my mind
     - Move (next step)

**Message State Management** (Lines 938-952):
```javascript
const [messages, setMessages] = useState(() => {
  const storedMessages = readStoredMessages(selectedDomain);
  if (storedMessages) {
    return storedMessages;  // Recover from localStorage
  }
  
  return [{
    sender: "rei",
    text: buildDomainSystemMessage(selectedDomain, currentDomain),
    timestamp: new Date().toLocaleTimeString()
  }];
});
```

This ensures:
- Previous conversations are recovered on page reload
- Each domain has separate chat history
- System messages are domain-specific

---

### 3.2 **src/lib/nightShiftRouter.js** — Cost-Aware Request Routing

The Night Shift router is the intelligence layer that decides which model path to use BEFORE calling an API.

#### Key Concept: Fingerprints

A **fingerprint** is a pattern that identifies the type of request and routes it accordingly.

**Example Fingerprints** (from data/fingerprints.json):
- Simple greeting → Fast cheap model (e.g., GPT 3.5)
- Coding request → Premium model (Claude, GPT-4)
- Genealogy research → Evidence-tier path
- Adversarial prompt → Premium validation path

#### Key Functions:

1. **`buildRouterDecision(userText, selectedDomain)`** (Main function)
   - Classifies the incoming prompt
   - Returns a routing decision with:
     - `modelId`: Which model to use
     - `costProfile`: Expected cost
     - `confidence`: How sure we are about this classification
   
   Example:
   ```javascript
   {
     modelId: "gpt-3.5-turbo",    // Fast, cheap
     costProfile: "fast",
     confidence: 0.95,
     reason: "Simple greeting detected"
   }
   ```

2. **`getCatalogRouteMatch(text)`** (Lines 44-53)
   - Searches the fingerprint catalog for keyword matches
   - Uses regex patterns for word boundaries
   - Prevents false positives (e.g., "code" inside "decode" won't trigger coding route)

3. **`keywordMatches(text, term)`** (Lines 34-42)
   - Uses word-boundary regex: `/(^|[^a-z0-9]){term}([^a-z0-9]|$)/i`
   - Ensures "code" matches "I need code help" but not "decode this"

4. **`getStoredRoutePreference()`** (Lines 87-99)
   - Tracks user's routing history
   - After 3+ requests, uses the most frequent route for ambiguous prompts
   - Learns user patterns without explicit settings

#### Storage Mechanism:

Routes are stored in localStorage as a rolling window (last 10 routes):
```javascript
STORAGE_KEY = "night-shift-user-fingerprint"
// Example: ["coding", "coding", "genealogy", "coding", ...]
```

This allows REI to learn: "This user mostly does coding, so ambiguous prompts → coding mode"

---

### 3.3 **api/cfai.js** — Backend Request Handling

The backend orchestrates the flow: prompt scaffolding → model call → response parsing.

#### Key Features:

1. **System Prompt (REI_SYSTEM_PROMPT)** (Lines 15+)
   - Defines REI's identity and behavior
   - Includes "HARD STOP RULE" for underspecified requests
   - Implements CARDO REI Loop:
     - **COLLECT**: Find the exact problem
     - **ANALYZE**: Assess risk
     - **RECORD**: Write tests
     - **DISTINGUISH**: Facts vs assumptions

2. **HARD STOP RULE** (Lines 37-52)
   - If 2+ of these questions can't be answered, REI asks instead of guessing:
     1. What is the real problem?
     2. Who uses this?
     3. What are failure modes?
     4. What existing code does this touch?
     5. Is there a simpler solution?
     6. What are non-functional constraints?
     7. How will this be verified?

   Example trigger: User says "Fix the bug" without explaining what bug
   → REI returns HARD STOP message instead of random fixes

3. **Request Validation** (Line 14)
   ```javascript
   const MAX_INPUT_CHARS = 14000;  // Enforces reasonable request sizes
   ```

4. **Model Resolution** (api/cfai.js imports from nightShiftRouter)
   - Gets routing decision from Night Shift
   - Calls appropriate model API (Groq, CFai, etc.)
   - Applies prompt scaffolding based on domain

---

### 3.4 **src/lib/cardoGuard.js** — Decision Gate

CARDO GUARD evaluates whether it's worth taking an action based on cost and confidence.

#### Core Formula:

```
Expected Loss of Missing = Confidence × CostToMiss
Expected Waste of Acting = (1 - Confidence) × CostToAct

If Expected Loss > Expected Waste → RECOMMEND ACTION
If Expected Waste > Expected Loss → RECOMMEND CAUTION
```

#### Example Scenario:

**Road Closure Reroute**
```javascript
{
  defaultConfidence: 89,        // 89% sure this is a real closure
  defaultCostToAct: 17000,      // Rerouting costs $17k
  defaultCostToMiss: 1465000    // Missing it costs $1.465M
}
```

Analysis:
- Expected Loss of Missing = 0.89 × $1.465M = $1.303M
- Expected Waste of Acting = 0.11 × $17k = $1.87k
- **Verdict**: ACTION (miss cost >> act cost, even with 89% confidence)

#### Confidence Bands:

```javascript
getConfidenceBand(confidence):
- ≥95%: "very high"
- ≥90%: "high"
- ≥85%: "moderate"
- ≥75%: "low"
- <75%: "very low"
```

Each band has an associated false-alarm rate:
- Very high (95%+) → 9% false alarm rate
- High (90-95%) → 15% false alarm rate
- Moderate (85-90%) → 31% false alarm rate
- Low (75-85%) → 44% false alarm rate
- Very low (<75%) → 57% false alarm rate

#### Why This Matters:

CARDO GUARD makes AI decisions testable and auditable. Instead of "I think you should do X", it says:
- "I'm 89% confident this is a road closure"
- "Acting costs $17k, missing it costs $1.465M"
- "Even accounting for 11% false alarm rate, the math favors action"
- "Here's the breakeven point: if the closure is less severe than X, DON'T act"

---

## 4. Data Flow — A Complete Request Journey

Let's trace a request through the system:

### Step 1: User Types Message
```
User: "I need help refactoring this React component for performance"
```

### Step 2: Frontend Detects Domain & Route
- **REI.jsx** extracts the message
- Sends to **Night Shift Router**
- Router recognizes keywords: "refactoring", "React", "performance" (coding signals)
- Returns: `{ modelId: "claude-3.5-sonnet", costProfile: "premium", domain: "coding" }`

### Step 3: Backend Receives Request
- **api/cfai.js** receives:
  ```
  {
    userMessage: "I need help refactoring this React component for performance",
    domain: "coding",
    routingDecision: { modelId: "claude-3.5-sonnet", ... }
  }
  ```

### Step 4: Prompt Scaffolding
- **api/cfai.js** applies the system prompt:
  ```
  System: "You are REI.AI, a coding companion... [CARDO REI Loop] [HARD STOP RULE]"
  
  User: "I need help refactoring this React component for performance"
  ```

### Step 5: Hard-Stop Gate Check
- Before calling Claude, REI silently asks itself:
  1. Real problem? "Component performance regression" ✓
  2. Who uses it? "Not specified" ✗
  3. Failure modes? "Not specified" ✗
  4. ...
- Result: 2+ unanswered → Triggers HARD STOP
- Instead of guessing, REI returns:
  ```
  **STOP: Request underspecified**
  I cannot proceed without:
  1. Your component code or a minimal reproduction
  2. Current performance metrics and target metrics
  3. Is this a bundle size issue or runtime performance?
  ```

### Step 6: User Provides Details
```
"Here's the component: [code]... It re-renders every keystroke 
even though only one field changed. PageSpeed shows 2.3s initial paint."
```

### Step 7: Second Routing Decision
- Night Shift recognizes: "re-renders", "keystroke", "useMemo/useCallback" patterns
- Stays on **premium model path**
- Returns code solution with test cases

### Step 8: Response Includes Verification
- REI proposes React performance metrics
- Suggests performance tests to verify the fix
- Includes rollback plan: "Remove this optimization if profiling shows no improvement"

### Step 9: Message Stored
- Chat message saved to localStorage under key `rei_chat_history_coding`
- User can reload browser → chat history recovered
- **readStoredMessages()** validates the stored data is a valid array

---

## 5. Recent Refactoring: Chat History Robustness

### What Changed

We extracted two helper functions to improve reliability:

**Before (Lines 911-921 old code)**:
```javascript
const [messages, setMessages] = useState(() => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(`rei_chat_history_${selectedDomain}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved chat history:", e);
        // Bug: No cleanup of corrupted data!
      }
    }
  }
  return [{
    sender: "rei",
    text: `System initialized. ${getAssistantWelcomeCopy()}`,
    timestamp: new Date().toLocaleTimeString()
  }];
});
```

**After (Lines 91-129 new code)**:
```javascript
function buildDomainSystemMessage(domainId, currentDomain) {
  const domainLabel = currentDomain?.label || "REI.ai";
  const domainDescription = currentDomain?.description || "reasoning assistant";

  if (domainId === "assistant") {
    return `System initialized. ${getAssistantWelcomeCopy()}`;
  }

  return `System initialized. Welcome to REI.ai ${domainLabel}...`;
}

function readStoredMessages(selectedDomain) {
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
    if (!Array.isArray(parsed)) {
      throw new Error("Stored chat history is not an array");
    }
    return parsed;
  } catch (error) {
    console.error("Failed to parse saved chat history:", error);
    try {
      window.localStorage.removeItem(storageKey);  // Clean up! 
    } catch (cleanupError) {
      console.warn("Unable to clear corrupted chat history storage:", cleanupError);
    }
    return null;
  }
}
```

### Why This Matters

1. **Separation of Concerns**: Domain messages and storage are separate functions
2. **Error Recovery**: Corrupted localStorage is cleaned up, not left broken
3. **Type Validation**: Validates that stored data is an array
4. **Testability**: Each function can be tested independently (see src/REI.test.jsx)

### Test Coverage (src/REI.test.jsx)

```javascript
it("recovers gracefully when stored chat history is corrupted", () => {
  window.localStorage.setItem("rei_chat_history_assistant", "{bad json");
  
  render(<REI />);
  
  expect(screen.getByText(/REI is live/i)).toBeInTheDocument();
  expect(JSON.parse(window.localStorage.getItem("rei_chat_history_assistant") || "[]"))
    .toEqual(expect.any(Array));
});
```

This test verifies:
- Corrupted data doesn't crash the app
- The corrupted entry is cleaned up
- The app recovers to a valid state

---

## 6. Testing Approach — Evidence Gates

REI treats tests as **evidence gates**, not optional verification.

### Test Categories:

1. **Routing Tests** (src/lib/nightShiftRouter.test.js)
   - 9 tests covering all routing paths
   - Tests keyword matching, catalog lookup, stored preferences
   - Ensures routing decisions are predictable

2. **CARDO GUARD Tests** (src/lib/cardoGuard.test.js)
   - 15 tests covering confidence bands, cost calculations, breakeven analysis
   - Ensures decision logic is mathematically correct

3. **UI Tests** (src/CardoGuard.test.jsx, src/REI.test.jsx, etc.)
   - 7 tests covering component rendering and state management
   - Ensures UI correctly reflects underlying logic

4. **Integration Tests** (App-level)
   - Tests that routing decision flows into prompt scaffolding
   - Tests that CARDO GUARD recommendations appear in UI

### Running Tests

```bash
# All tests (55 total)
npm test

# Specific test file
npm test -- --testPathPatterns="cardoGuard"

# Watch mode for development
npm test -- --watch
```

---

## 7. Dependency Map

```
REI.jsx
  ├─ nightShiftRouter.js (routing decisions)
  ├─ useMobile.js (responsive UI)
  ├─ localStorage (chat history via readStoredMessages)
  └─ API calls to /api/cfai

api/cfai.js
  ├─ nightShiftRouter.js (gets routing decision)
  ├─ .env (Groq API key, model config)
  └─ Groq SDK (makes LLM calls)

nightShiftRouter.js
  ├─ data/fingerprints.json (routing catalog)
  └─ localStorage (stores route history)

cardoGuard.js
  └─ (pure functions, no dependencies)

Tests
  ├─ jest.config.cjs (test config)
  ├─ jest.setup.js (test environment)
  └─ @testing-library/react (UI testing)
```

---

## 8. Key Architectural Principles

### 1. **Explicit Over Implicit**
- Routes are rule-based, not ML-based (testable)
- Decisions include reasoning (why this route?)
- Hard-stop rule prevents silent assumptions

### 2. **Cost-Aware**
- Each routing decision includes cost profile
- CARDO GUARD evaluates ROI of acting
- Logs allow cost analysis and optimization

### 3. **Deterministic**
- Same input → same routing/decision
- No randomness or magic
- Easy to debug and test

### 4. **Defensive**
- readStoredMessages() handles corruption
- Hard-stop rule prevents underspecified requests
- Type validation throughout

### 5. **Domain-Specialized**
- Each domain has custom system prompt
- Rules and patterns tailored to domain
- Chat history separate per domain

---

## 9. How to Extend REI

### Adding a New Domain

1. **Add to DOMAIN_PROFILES** (src/REI.jsx)
   ```javascript
   {
     id: "marketing",
     label: "The Copywriter",
     description: "Marketing strategy and campaign design.",
     rules: ["Audience first", "Data-driven", "Test variants"]
   }
   ```

2. **Add fingerprints** (data/fingerprints.json)
   ```json
   {
     "id": "marketing",
     "matchTerms": ["campaign", "audience", "conversion", "funnel", "A/B test"]
   }
   ```

3. **Write routing tests** (src/lib/nightShiftRouter.test.js)
   ```javascript
   it("routes marketing prompts to the marketing domain", () => {
     const decision = buildRouterDecision("Design an A/B test for our landing page", "marketing");
     expect(decision.domain).toBe("marketing");
   });
   ```

4. **Add integration tests** (src/REI.test.jsx)
   ```javascript
   it("shows marketing domain welcome message", () => {
     render(<REI selectedDomain="marketing" />);
     expect(screen.getByText(/The Copywriter/i)).toBeInTheDocument();
   });
   ```

### Modifying a Routing Rule

1. Update fingerprints.json
2. Run tests: `npm test -- --testPathPatterns="nightShift"`
3. If tests break, you've found where that rule is verified
4. Update the test to match new behavior
5. Verify all 55 tests still pass

---

## 10. Deployment & Monitoring

### Where It Runs
- Frontend: Vercel (https://debate-furnace.vercel.app)
- Backend: Vercel serverless functions
- Storage: Browser localStorage + Groq/CFai API

### Environment Variables (.env)
```
GROQ_API_KEY=xxx          # Groq API key for LLM calls
MODEL=gpt-4               # Optional: override default model
CFAI_PATH=/path/to/cfai   # Optional: use CFai CLI instead of Groq
```

### Build & Deploy
```bash
npm run build              # Vite build → dist/
npm test                   # Run all tests before deploy
git push                   # Triggers Vercel deployment
```

---

## 11. Summary

REI.ai is a **reasoning-first decision support platform** that combines:

| Component | Purpose | Example |
|-----------|---------|---------|
| **Night Shift Router** | Cost-aware routing | Simple greeting → fast model |
| **Hard-Stop Rule** | Prevents underspecified requests | "Fix the bug" → asks clarifying questions |
| **CARDO GUARD** | Cost-benefit analysis | Confidence 89%, act cost $17k, miss cost $1.465M → ACTION |
| **Domain Profiles** | Specialized reasoning modes | Coding mode uses verification, genealogy uses evidence tiers |
| **Chat History** | Persistent conversations | Recovers from corrupted localStorage |
| **Test Suite** | Evidence gates | 55 tests, 100% passing |

All components work together to make AI decisions **testable, auditable, and cost-conscious**.

