# GitHub repository secrets for TestOps callbacks

The shipped workflow (`.github/workflows/automatify-testops.yml`) reports
running / passed / failed / cancelled back to Forge through the
`updateScenarioAutomationStatus` callback. It needs exactly 2 repository
secrets — without them Jira stays stuck "queued" after the run finishes.

| Secret name | Where the value comes from |
|---|---|
| `TESTOPS_FORGE_ENDPOINT` | Jira: "Automatify TestOps" tab → "CLI" sub-tab → "Create CLI key" → the endpoint URL displayed |
| `TESTOPS_FORGE_AUTH_TOKEN` | the one-time key shown once when the CLI key is created |

## Get the values (Jira "CLI" sub-tab)

1. Board → "Automatify TestOps" tab → "CLI" sub-tab.
2. Type a label into "Key label", e.g. `github-actions-cli-key`.
3. Click "Create CLI key".

Expected: the one-time key is shown once — copy it. The endpoint URL is
displayed — copy it. (If lost, create a new CLI key.)

## Add the secrets (GitHub)

1. GitHub repo → Settings → Secrets and variables → Actions.
2. Click "New repository secret" twice:

   - Name: `TESTOPS_FORGE_ENDPOINT` — Secret: the endpoint URL from step 2
   - Name: `TESTOPS_FORGE_AUTH_TOKEN` — Secret: the one-time key from step 2

Expected: both secrets listed under "Repository secrets".

## The dispatch PAT (profile "Secret token")

The Automation profile's "Secret token" is a GitHub PAT ("PAT or bearer token")
with the `repo` and `workflow` scopes — TestOps uses it to POST the
`workflow_dispatch` call to GitHub. Create it in GitHub: your avatar (top
right) → Settings → Developer settings → Personal access tokens →
Tokens (classic) → "Generate new token (classic)" → tick `repo` and
`workflow` → "Generate token" → copy the value (shown only once). Enter it
only in the Jira profile form (placeholder "PAT or bearer token"; on edit the
placeholder reads "Leave blank to keep the current secret").

## Rules for agents

- Never ask the user to paste secret VALUES into the chat; the user enters
  them directly in the GitHub or Jira UI.
- Never fabricate, guess, or echo tokens or endpoint URLs.
- Never commit secrets — the workflow references secret NAMES only.