# Pre-Deployment Verification Checklist

Use this before any deployment to production. Saves ~500 tokens during handoff (no "how do I deploy?" questions).

## Environment Setup

- [ ] `.env` file created with required keys:
  - `GROQ_API_KEY` (Groq API key for fallback routing)
  - `OPENAI_API_KEY` (OpenAI API for gpt-4o mode)
  - `CFAI_PATH` (path to local CFai CLI, optional)
  - `MODEL` (override default model selection, optional)

- [ ] Verify keys are in `.env`, NOT in `.env.example` or committed to git

## Build & Lint

- [ ] `npm run lint` passes (no errors, warnings OK)
- [ ] `npm run build` produces `/dist/` without errors
- [ ] All changes committed (nothing unstaged)

## Testing

- [ ] `npm test -- --runInBand api/cfai.test.js` passes (source resolution tests)
- [ ] `npm test -- --runInBand` runs full suite without critical failures

## API Validation

- [ ] Groq API connectivity tested:
  - In dev: send test message through REI chat UI
  - Verify response comes back without rate-limit errors
  - Check response temperature matches source (user=0.7, scheduler=0.3)

- [ ] OpenAI API (if gpt-4o mode used):
  - Test once with `OPENAI_API_KEY` set
  - Verify fallback to Groq works if key missing or invalid

## Documentation

- [ ] `CLI_ENTRY.md` is up to date
- [ ] `TOKEN_EFFICIENCY_AUDIT.md` reviewed for recent changes
- [ ] `handoff.md` includes "For next session:" pointer to `CLI_ENTRY.md`

## Deployment (Vercel)

- [ ] Environment variables added to Vercel dashboard (Settings → Environment Variables)
- [ ] `GROQ_API_KEY`, `OPENAI_API_KEY` are masked in Vercel
- [ ] Re-deploy triggered: `git push` or manual `vercel deploy --prod`

## Post-Deployment Smoke Test

- [ ] Visit production URL
- [ ] Send a message in default assistant mode (should see response)
- [ ] Check browser console for errors
- [ ] Check Vercel function logs for errors
- [ ] Verify night-shift routing works (send a short vs. complex message)

## Rollback Plan (if needed)

- [ ] Revert last commit: `git revert <SHA>`
- [ ] Push: `git push`
- [ ] Vercel auto-redeploys
- Time to rollback: ~30 seconds

---

## Quick Reference: Environment Variables

| Variable | Purpose | Required | Notes |
|----------|---------|----------|-------|
| `GROQ_API_KEY` | Fallback/OSS routing | Yes | Get from [Groq Console](https://console.groq.com) |
| `OPENAI_API_KEY` | GPT-4o routing | No | Get from [OpenAI Dashboard](https://platform.openai.com/api-keys) |
| `CFAI_PATH` | Local CLI fallback | No | Absolute path to cfai binary |
| `MODEL` | Override model selection | No | E.g., `gpt-4o`, `llama-3.3-70b-versatile` |

---

**Typical deployment time:** 2–3 minutes (lint + build + push + Vercel auto-deploy)
