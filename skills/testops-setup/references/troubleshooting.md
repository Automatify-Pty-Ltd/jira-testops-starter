# Troubleshooting

Status meanings: a run moves queued → running → passed in Jira, reported by the
workflow's callback. The "Expected-fail demo with wrong title" scenario is
SUPPOSED to fail — it proves failure reporting.

| Symptom in Jira | Cause | Fix |
|---|---|---|
| Status `failed` right after Run now; GitHub has no run | Workflow id wrong OR file not on default branch (404) | Fix Workflow id / Ref; commit workflow to default branch |
| Status `failed` right after Run now; GitHub shows nothing | Workflow doesn't declare Forge's inputs (422) | Declare all 10 dispatch inputs (or set Inputs template) |
| Status stuck `queued` (GitHub run fails at the Forge report step, or ran without reporting) | Repo secrets `TESTOPS_FORGE_ENDPOINT` / `TESTOPS_FORGE_AUTH_TOKEN` missing (workflow cannot call Forge) | Add the 2 repo secrets (Step 5) |
| "Automation profile limit reached" | Free tier = 1 profile | Edit/delete existing profile |
| Run fails with "Missing step definitions" | Jira scenario steps differ from the template's step definitions | Paste the exact steps shown in Step 6 |

Free tier limits: 1 profile, 25 scenarios, 100 automation runs per month.

Agent first aid: run `node skills/testops-setup/scripts/verify-setup.mjs` to
confirm the local wiring (Node, deps, workflow inputs, feature/steps files)
before touching anything else.