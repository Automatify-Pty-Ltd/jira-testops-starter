---
name: testops-setup
description: Jira TestOps setup for the jira-testops-starter repo (Playwright + playwright-bdd template). Guides the human through creating the Automation profile in Jira, adding the TESTOPS_FORGE_ENDPOINT and TESTOPS_FORGE_AUTH_TOKEN repository secrets, creating the two sample scenarios via the "Create scenario" dialog, binding them in "Scenario bindings", and running them with "Run now". Use when the user asks to set up TestOps automation for this repo, connect Jira scenarios to GitHub Actions runs, bind a profile to scenarios, or diagnose a TestOps status stuck "queued" or "failed" right after Run now. Don't use for general Playwright/playwright-bdd/TypeScript questions, for other repositories or CI providers (e.g. Azure DevOps), for developing the Automatify Forge app itself, or for the automatify CLI setup plan/apply flow.
---

# TestOps setup (jira-testops-starter)

Guides a human through wiring this repo to their Jira TestOps project so the two
sample BDD scenarios run from Jira via GitHub Actions and report their status
back. The human performs every Jira and GitHub UI action; you guide, verify
locally, and never touch secret values.

## Golden rules (read first)

1. **Human-in-the-loop at every browser action.** Before each Jira or GitHub
   step, stop and tell the user exactly what to click and what "Expected" result
   to look for. Wait for their confirmation before moving on.
2. **Never fabricate credentials.** Never invent, guess, or generate tokens,
   PATs, keys, or endpoint URLs. Never ask the user to paste secret VALUES into
   the chat — the user enters them directly in the Jira or GitHub UI.
3. **Stay in this repo.** This skill targets the jira-testops-starter template.
   Decline setup requests for other repos or providers.
4. **Use the exact UI terms** from the references — they match the Jira and
   GitHub UIs verbatim, so the user can follow along on screen.

## Before you start

Run the deterministic local checks (no network, no deps):

    node skills/testops-setup/scripts/verify-setup.mjs

All checks must pass before guiding the user. If a check fails, fix the repo
state first (run `npm install`, run from the repo root).

## Workflow (mirrors scripts/testops-wizard.mjs)

1. **Preflight** — run the verify script; note Owner, Repo, Workflow
   (automatify-testops.yml), Ref (main) from the git remote.
2. **Create the automation profile in Jira** (HITL) — board → "Automatify
   TestOps" tab → "Automation" → "Profiles" → "Create profile" → tile "GitHub
   Actions". Exact field names and the Expected result:
   `references/jira-manual-setup.md` (§ Create the automation profile).
3. **Set default** (HITL) — profile card → "Set default". Expected: "Default
   profile: <label>" in the Automation overview.
4. **Create the CLI key in Jira** (HITL) — "CLI" sub-tab → type a label into
   "Key label" → "Create CLI key". The one-time key and the endpoint URL are
   copied here and used in Step 5.
5. **Add the 2 GitHub repository secrets** (HITL) — the user adds both secrets
   in GitHub under Settings → Secrets and variables → Actions. Names, PAT
   scopes, click path: `references/github-secrets.md`.
6. **Create the 2 scenarios in Jira** (HITL) — on a Jira issue: "Automatify
   TestOps" panel → "New scenario" → the "Create scenario" dialog takes fields
   + steps (never a pasted feature file). The scenario "Steps" are the binding
   contract — they must match the sample step definitions exactly, one step per
   line. Field mapping and Expected results: `references/jira-manual-setup.md`
   (§ Create the scenarios).
7. **Bind the profile to the scenarios** (HITL) — "Scenario bindings" → each
   scenario → "Bind profile". See `references/jira-manual-setup.md`
   (§ Bind the profile).
8. **Run the scenarios locally** — `npx bddgen test`, then
   `npx playwright test` (1 passed + 1 failed by design).
9. **View the Playwright report** — `npx playwright show-report`.
10. **Run and verify in Jira** (HITL) — "Run now" on a bound scenario. Expected:
    the passing sample ends "passed"; the expected-fail demo ends "failed" by
    design; the issue gets a status comment with the Actions run link.
    Problems: `references/troubleshooting.md`.

## Don't use for

- General Playwright, playwright-bdd, or TypeScript questions.
- Other repositories, other CI providers, or non-TestOps Jira configuration.
- Building or changing the Automatify Forge app, or the `automatify` CLI
  (`setup plan/apply`) — this skill is pure UI guidance for this starter repo.