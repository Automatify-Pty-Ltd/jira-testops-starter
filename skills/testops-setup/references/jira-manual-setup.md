# Jira manual setup — exact click paths and field names

All labels below are verbatim from the Jira TestOps UI. Use them as-is when
guiding the user so they can match every word on screen.

The onboarding banner on the "Automatify TestOps" tab tracks 4 steps:
`1 Create profile → 2 Choose default → 3 Bind scenario → 4 Run automation`,
ending at "Ready — All set: the project is ready to run automation."

## Open the TestOps panel

1. Open the project board, e.g.
   `https://your-site.atlassian.net/jira/software/projects/KAN/boards/1`.
2. Click the "Automatify TestOps" tab (board top tabs) → "Automation" sub-tab.
   The panel has the "Automation" and "CLI" sub-tabs; "Automation" contains
   the "Profiles" and "Scenario bindings" tabs.

## Create the automation profile

1. "Automation" sub-tab → "Profiles" tab → "Create profile" → provider tile
   "GitHub Actions".
2. Fill the form (field labels verbatim):

   | Field | What to enter |
   |---|---|
   | Profile label | any name you want for this automation profile, e.g. `testops-starter` |
   | Owner | GitHub org or username owning the repo, e.g. `your-name` |
   | Repo | repository name, e.g. `jira-testops-starter` |
   | Workflow id | the workflow file name under `.github/workflows/`, exactly: `automatify-testops.yml` |
   | Ref | branch to dispatch; leave as `main` |
   | Inputs template | leave empty |
   | Secret token | a GitHub PAT ("PAT or bearer token") TestOps uses to dispatch workflows; needs `repo` + `workflow` scopes |

3. Click "Create profile".

Expected: green banner "Automation profile saved: <label>." and the card under
"Project profiles" showing "1 profile(s)" with "Secret configured".

Free tier limit: 1 profile (the UI shows "1 profile(s) • free tier limit 1").
"Automation profile limit reached" → edit or delete the existing profile.

## Set default

1. On the profile card → "Set default".

Expected: "Default profile: <label>" in the Automation overview; onboarding
banner moves to "Next: bind scenario".

## Create the scenarios (issue panel)

The issue panel is the only manual scenario-creation path. On the linked Jira
issue (e.g. a story): "Automatify TestOps" panel → "New scenario" → the
"Create scenario" dialog opens ("Create a new manual scenario linked to this
issue."). The dialog takes fields + steps — never a pasted Gherkin feature
file; the issue links automatically.

If the "Automatify TestOps" panel is not displayed on the issue, scroll to the
top and click "View app actions" next to the "+" button to open it.

Field mapping for the two sample scenarios in `features/playwright-docs.feature`:

| Field | Scenario 1 | Scenario 2 |
|---|---|---|
| Scenario group | `Playwright docs` (optional label) | `Playwright docs` |
| Scenario name | `Documentation homepage shows Playwright title` | `Expected-fail demo with wrong title` |
| Tags | optional, e.g. `@smoke` | optional |
| Estimated duration (minutes) | optional, e.g. `1` | optional |
| Priority | any, e.g. `medium` | any |
| Steps | must match the sample steps exactly (below) | must match the sample steps exactly (below) |

Scenario 1 "Steps" (one step per line):

```
Given I open the Playwright documentation homepage
Then the page title contains "Playwright"
```

Scenario 2 "Steps":

```
Given I open the Playwright documentation homepage
Then the page title contains "Wrong Expected Title"
```

The Steps helper text reads: "Use one step per line, starting with Given, When,
Then, And, or But." The steps are the binding contract: the dispatched workflow
renders them and runs them against the template's step definitions, so they
must match `steps/playwright-docs.steps.ts` exactly.

Click "Create scenario". Expected: the scenario appears under "Linked scenarios"
with its new key (e.g. `SC-2`). Repeat for the second scenario.

## Bind the profile

1. Board → "Automatify TestOps" tab → "Automation" → "Scenario bindings" →
   click each scenario's key.
2. Automation label: keep the suggested one ("Automation for <scenario name>").
   Profile: pick the project default → click "Bind profile".

Expected: green banner "Binding saved: …"; the table rows show the profile in
the "Profile" column; "Run now" is available.

## Run

Click "Run now" in the binding pane, or open the linked issue and run from the
"Automatify TestOps" panel. Expected: status transitions queued → running →
passed ("failed" for the expected-fail demo — that one fails by design); the
issue receives the comment "Automatify scenario automation finished with status
…" plus a link to the GitHub Actions run; the binding table shows
"Latest status <status> at <timestamp>."