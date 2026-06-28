VERIFICATION_CONFIRMED: false

# Vibe Push & Verify Plan: Hinge Meter & REI Dashboard Deployment

This plan coordinates the verification and deployment steps for **Vibe** to push the local refactoring changes to the remote repository and verify the Vercel deploy.

---

## 1. Summary of Changes
*   **Hinge Meter Integration:** Added SVG force-balance pivot needle diagram bound to the CARDO GUARD engine.
*   **REI Methodology Engine UI:** Replaced the legacy simple form with the split workspace layout (Proof vs. Claim), Amber Evaluate button, and Monospace Terminal Output Console.
*   **Catalog Card Setup:** Aligned landing cards and registered the `#rei` / `#hinge-meter` hash-routing systems.
*   **Jest Test Status:** Cleaned up card indices, verified that all 42 tests are passing green.

---

## 2. Pre-Push Verification Check (For Human Reviewer)
Before updating the verification header to `true`, the reviewer must check:
1.  Are all local tests passing green?
    ```bash
    npm test
    ```
2.  Are the modified files correct in git status?
    ```bash
    git status
    ```

---

## 3. Actions for Vibe to Run
After `VERIFICATION_CONFIRMED: true` is set, Vibe should execute:

```bash
# 1. Stage all modifications and untracked files (HingeMeter.jsx, REI.jsx)
git add .

# 2. Commit the changes
git commit -m "feat: implement REI split workspace and Hinge Meter force visualizer"

# 3. Push to remote main
git push origin main
```

---

## 4. Post-Push Verification
Verify that the push was successful:
```bash
git status
```
It should report: `Your branch is up to date with 'origin/main'.`
Check the live deployment at Vercel to confirm build success: `https://debate-furnace-prompthound.vercel.app/`
