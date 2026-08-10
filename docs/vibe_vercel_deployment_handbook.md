# Vibe Vercel Deployment Handbook: PromptHound Labs

This handbook is designed specifically for **Vibe CLI** to pick up, evaluate, and directly execute live deployments for the `debate-furnace` repository.

---

## 1. Project Context & Verification Gate

> [!IMPORTANT]
> **Adversarial Review Rule (REI Gate)**
> Before Vibe triggers any deploy steps or commits changes, it must verify if the target files/plans have `VERIFICATION_CONFIRMED: true`. If `false` or missing, Vibe must **STOP** and request human verification.

### Target Deployment Details

- **Vercel Project Name:** `debate-furnace`
- **Vercel Team Scope:** `prompthound-s-projects`
- **Live App URL:** `https://prompthound-labs.vercel.app.vercel.app`
- **Hash Route Targets:** `#rei` (REI.AI Chatbot), `#hinge-meter` (SVG Pivot Visualizer)

---

## 2. Command Set for Vibe

Vibe can run the following sequential pipeline steps to verify, deploy, and synchronize changes:

### Step 1: Pre-Flight Tests

Always run the Jest test suite to ensure no regressions:

```bash
npm test
```

All 42 tests across 9 test suites must pass 100% green before proceeding.

### Step 2: Configure Environment Variables

If the Groq API key or CLI paths need to be updated on Vercel:

```bash
# Add or update Groq API key
vercel env add GROQ_API_KEY production --value "your_api_key_here" --yes --force

# Add or update local CLI path if needed
vercel env add CFAI_PATH production --value "/home/potatoking/.local/bin/cfai" --yes --force
```

### Step 3: Trigger Live Vercel Production Deploy

To build, package, and upload local changes directly to Vercel production:

```bash
vercel --prod --yes
```

### Step 4: GitHub Source Synchronization

Ensure the main branch repository stays aligned:

```bash
git add .
git commit -m "feat: [vibe update] deploy adjustments"
git push origin main
```

---

## 3. Directory File Map

When executing changes, modify only these key files:

- [src/REI.jsx](file:///home/potatoking/debate-furnace/src/REI.jsx) — Chatbot Layout & active domain profile rules.
- [src/HingeMeter.jsx](file:///home/potatoking/debate-furnace/src/HingeMeter.jsx) — Needle angle & weight slider calculations.
- [src/AppShell.jsx](file:///home/potatoking/debate-furnace/src/AppShell.jsx) — Core router & tab list.
- [src/ToolsLanding.jsx](file:///home/potatoking/debate-furnace/src/ToolsLanding.jsx) — Tool description cards catalog.
- [api/cfai/route.js](file:///home/potatoking/debate-furnace/api/cfai/route.js) — Node.js Serverless API endpoints mapping requests to the `cfai` CLI.
