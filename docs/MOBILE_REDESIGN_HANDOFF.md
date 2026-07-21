# 📱 Mobile-First Redesign Handoff
**Project:** debate-furnace / REI.ai  
**Date:** June 29, 2026  
**Status:** Phase 0-1 Complete, Phase 2 Pending  
**Last Commit:** `76adb12`

---

## 🎯 EXECUTIVE SUMMARY

**Goal:** Transform REI.ai from desktop-first to mobile-first experience with native feel on phones (Android + iOS).

**Progress:**
- ✅ Phase 0: Foundation (hooks, CSS, meta tags)
- ✅ Phase 1: Critical fixes (responsive containers, touch targets)
- ⏳ Phase 2: Polish (full restructure, testing)

**Estimated Completion:** 1-2 more sessions

---

## 📋 WORK COMPLETED

### Phase 0: Foundation
| File | Change | Commit | Status |
|------|--------|--------|--------|
| `index.html` | Viewport + theme-color + manifest | `b4ad804` | ✅ |
| `src/useMobile.js` | useMobile(), useKeyboardVisible(), useSwipe() | `b4ad804` | ✅ |
| `src/style.css` | em-based breakpoints, touch targets, safe areas | `b4ad804` | ✅ |
| `public/manifest.json` | PWA manifest | `b4ad804` | ✅ |

### Phase 1: Critical Fixes
| File | Change | Commit | Status |
|------|--------|--------|--------|
| `src/REI.jsx` | useMobile hooks, responsive container, touch targets | `c8b7113` | ✅ |
| `src/AppShell.jsx` | useMobile hooks, hamburger menu, mobile drawer | `c8b7113` | ✅ |
| `src/REI.jsx` | Fixed import paths (.js extension) | `d4b3adb` | ✅ |
| `src/REI.jsx` | Responsive dashboard-wrapper padding | `e23bb94` | ✅ |
| `src/style.css` | Safe area classes, mobile-container | `3443d11` | ✅ |
| `docs/REI_VIBE_MASTER_INDEX_TEMPLATE.md` | Mobile-First Redesign section | `76adb12` | ✅ |

---

## 🎨 MOBILE-FIRST REDESIGN SPEC

### Core Philosophy
- **Design for 360-428px width** (most phones)
- **Mobile-first:** Design mobile, then scale up
- **Vertical flow:** Stack elements, avoid side-by-side
- **Breathing room:** Generous padding on mobile

### Target Structure
```
┌─────────────────────────────────┐
│  Mobile Container (max: 428px)   │
│  ┌─────────────────────────────┐ │
│  │ Sticky Header (safe-top)     │ │
│  │ ☰  REI.ai           (?)       │ │
│  └─────────────────────────────┘ │
│                                     │
│  ┌─────────────────────────────┐ │
│  │ Scrollable Main              │ │
│  │ - Persona Selection (grid-1)│ │
│  │ - Active Voice Card          │ │
│  │ - Process Buttons (grid-3)  │ │
│  │ - Chat Messages              │ │
│  │ - pb-32 (keyboard space)    │ │
│  └─────────────────────────────┘ │
│                                     │
│  ┌─────────────────────────────┐ │
│  │ Fixed Input (safe-bottom)    │ │
│  │ [Input ___________] [Send]    │ │
│  └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### CSS Classes Available
```css
.mobile-container { max-width: 428px; margin: 0 auto; min-height: 100dvh; flex-column; }
.h-dvh { height: 100dvh; }
.safe-area { padding: env(safe-area-inset-*) }  
.safe-top { padding-top: env(safe-area-inset-top) }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom) }
```

### Breakpoints
```css
--breakpoint-sm: 30em;    /* 480px */
--breakpoint-md: 45em;    /* 720px */
--breakpoint-lg: 56.25em; /* 900px */
```

---

## ⚠️ CURRENT ISSUES TO FIX

### 1. REI.jsx Structure
**Problem:** Current structure doesn't match mobile-first design.

**Current:**
```jsx
<section className="rei-dashboard-wrapper">
  <div className="rei-custom-container">
    <header>...</header>
    <div>Active Voice</div>
    <div>Process Buttons</div>
    <div>Chat</div>
    <div>Input</div>
  </div>
</section>
```

**Target:**
```jsx
<div className="mobile-container safe-area h-dvh">
  <header className="safe-top sticky...">...</header>
  <main className="flex-1 overflow-y-auto pb-32">...
    <div className="grid-cols-1">Persona Selection</div>
    <div className="bg-[#2c1f14] rounded-3xl p-5">Active Voice</div>
    <div className="grid-cols-3 gap-2.5">Process Buttons</div>
    <div className="space-y-4">Chat</div>
  </main>
  <div className="fixed bottom-0 safe-bottom">Input</div>
</div>
```

### 2. Domain Selection
**Problem:** Currently horizontal flex, should be vertical on mobile.

**Fix:**
```jsx
// Current
<div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>

// Target
<div className="grid grid-cols-1 gap-3">
```

### 3. Active Voice Section
**Problem:** Needs styling update.

**Fix:**
```jsx
<div className="bg-[#2c1f14] rounded-3xl p-5 border border-amber-900">
```

### 4. Process Loop Buttons
**Problem:** Need grid layout and proper sizing.

**Fix:**
```jsx
<div className="grid grid-cols-3 gap-2.5">
  {buttons.map(b => (
    <button key={b} className="bg-[#3a2a1f] py-4 rounded-2xl text-xs tracking-wider">
      {b}
    </button>
  ))}
</div>
```

---

## 🚀 PHASE 2: IMPLEMENTATION PLAN

### Task 1: Restructure REI.jsx Layout (High Priority)
**File:** `src/REI.jsx`

**Actions:**
1. Replace `<section className="rei-dashboard-wrapper">` with `<div className="mobile-container safe-area h-dvh">`
2. Add sticky header with safe-top
3. Move all content into scrollable main with pb-32
4. Move input area to fixed bottom with safe-bottom
5. Update domain selection to grid-cols-1 on mobile
6. Style active voice section with rounded-3xl
7. Restructure process buttons to grid-cols-3

**Estimated Tokens:** 2000-3000

### Task 2: Update AppShell.jsx for Mobile (Medium Priority)
**File:** `src/AppShell.jsx`

**Actions:**
1. Verify hamburger menu works
2. Verify drawer overlay works
3. Test swipe gestures
4. Ensure all nav items have touch targets

**Estimated Tokens:** 1000-1500

### Task 3: Test on Real Devices (Critical)
**Devices to Test:**
- iPhone SE (375x667)
- iPhone 12/13/14/15 (390x844)
- Pixel 5/6/7 (393x851)
- iPad Mini (768x1024)

**Browsers:**
- Safari iOS 15+
- Chrome Android 100+
- Firefox Mobile

**Checklist:**
- [ ] All touch targets ≥ 48x48px
- [ ] No horizontal scrolling
- [ ] Input focus doesn't hide behind keyboard
- [ ] Navigation works touch-only
- [ ] Scroll is smooth and contained
- [ ] Safe areas respected (notch, home indicator)

### Task 4: Polish & Optimize (Low Priority)
- Performance audit (Lighthouse mobile)
- Add loading states
- Smooth transitions
- Accessibility audit

---

## 📁 FILES TO REFERENCE

### Created/Modified Files
| File | Purpose | Location |
|------|---------|----------|
| `docs/REI_VIBE_MASTER_INDEX_TEMPLATE.md` | Master spec | Repo |
| `src/useMobile.js` | Mobile hooks | Repo |
| `src/style.css` | Mobile styles | Repo |
| `index.html` | Meta tags | Repo |
| `public/manifest.json` | PWA | Repo |
| `src/REI.jsx` | Partial mobile | Repo |
| `src/AppShell.jsx` | Partial mobile | Repo |

### External References
| Resource | Location |
|----------|----------|
| Mobile screenshots | `/home/potatoking/Downloads/mobilerei.jpeg` |
| Mobile screenshots | `/home/potatoking/Downloads/mobile rei.jpeg` |
| Master Index (original) | `/home/potatoking/REI_VIBE_MASTER_INDEX.md` |

---

## 🎯 QUICK START FOR NEXT SESSION

### If Continuing This Work:
```bash
# 1. Check current state
cd /home/potatoking/debate-furnace
./scripts/verify-deploy.sh

# 2. Review what's been done
git log --oneline -5

# 3. See this file
cat MOBILE_REDESIGN_HANDOFF.md

# 4. Start with Phase 2 Task 1
# Edit src/REI.jsx to restructure layout
```

### If Starting Fresh:
Read this file first, then check `docs/REI_VIBE_MASTER_INDEX_TEMPLATE.md` for full specs.

---

## ⚡ COMMAND REFERENCES

### Verify Deployment
```bash
./scripts/verify-deploy.sh
```

### Run Tests
```bash
npm test
npm run validate:battle  # If script exists
```

### Check Token Usage
```bash
npm run token-audit
```

---

## 📊 DECISION LOG

| Date | Decision | Rationale |
|------|-----------|-----------|
| 2026-06-29 | Mobile-first approach | Better UX on phones, growing mobile traffic |
| 2026-06-29 | Phase 0 before Phase 1 | Foundation must be solid before restructuring |
| 2026-06-29 | Incremental commits | Easier to debug, rollback if issues |
| 2026-06-29 | Keep existing features | Domain selection, ingest, etc. must remain |

---

## 🔗 RELATED DOCUMENTS

- **Master Index:** `docs/REI_VIBE_MASTER_INDEX_TEMPLATE.md`
- **Token Savers:** `TOKEN_SAVERS.md`
- **Deployment Verification:** `PROMPTHOUND-DOCS/DEPLOYMENT_VERIFICATION.md`
- **CARDO REI Methodology:** `PROMPTHOUND-DOCS/CARDO-REI.md`

---

**Last Updated:** June 29, 2026  
**Next Session:** Start with Phase 2 Task 1 (REI.jsx restructure)  
**Token Budget:** ~3000 for full Phase 2 completion
