#!/usr/bin/env node
// Automatify TestOps — guided setup wizard.
// Pure guidance: no network calls, no automatify CLI, no secret prompts.
// Printed copy is the approved replay transcript (design doc §6) — do not paraphrase.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { PassThrough } from 'node:stream';
import * as p from '@clack/prompts';

const STATE_FILE = '.testops-wizard-state.json';
const WORKFLOW_FILE = '.github/workflows/automatify-testops.yml';
const FEATURE_FILE = 'features/playwright-docs.feature';

// ---------- state (resume; version guard drops stale pre-10-step states) ----------

const loadCompleted = () => {
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (parsed.version !== 2 || !Array.isArray(parsed.completed)) return [];
    return parsed.completed;
  } catch {
    return [];
  }
};

const saveCompleted = (completed) => {
  fs.writeFileSync(STATE_FILE, `${JSON.stringify({ version: 2, completed }, null, 2)}\n`);
};

const resetState = () => {
  fs.rmSync(STATE_FILE, { force: true });
};

// ---------- autodrive (sandbox verification only; invisible without the env var) ----------

const AUTODRIVE_KEYS = {
  yes: '\r',
  help: '\x1b[B\r',
  reset: '\x1b[B\x1b[B\r',
  quit: '\x1b[B\x1b[B\x1b[B\r',
};

let scriptedAnswers = null;
if (process.env.TESTOPS_WIZARD_AUTODRIVE) {
  scriptedAnswers = JSON.parse(fs.readFileSync(process.env.TESTOPS_WIZARD_AUTODRIVE, 'utf8'));
}

function keystrokesFor(answer) {
  const keys = AUTODRIVE_KEYS[answer];
  if (!keys) {
    console.error(`autodrive: unknown answer ${JSON.stringify(answer)}`);
    process.exit(1);
  }
  return keys;
}

// ---------- printing helpers ----------

function bannerBox(contentLines) {
  const width = 54; // transcript box interior — static copy, fixed width
  process.stdout.write(`╭${'─'.repeat(width)}╮\n`);
  for (const line of contentLines) {
    process.stdout.write(`│${line}${' '.repeat(width - line.length)}│\n`);
  }
  process.stdout.write(`╰${'─'.repeat(width)}╯\n`);
}

function header(n, text) {
  p.log.message(`Step ${n}/10 · ${text}`, { symbol: p.symbol('active'), spacing: 0 });
}

// ---------- preflight ----------

function detectGitRemote() {
  try {
    const url = execFileSync('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    const match = url.match(/^(?:https?:\/\/|git@)([^/:]+)[/:](.+?)(?:\.git)?\/?$/);
    if (match)
      return { host: match[1], owner: match[2].split('/')[0], repo: match[2].split('/')[1] };
  } catch {
    // no git or no origin remote
  }
  return null;
}

function preflight() {
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  const depsInstalled = fs.existsSync('node_modules');
  const remote = detectGitRemote();
  const workflowPresent = fs.existsSync(WORKFLOW_FILE);
  const featurePresent = fs.existsSync(FEATURE_FILE);

  const checks = [
    { ok: nodeMajor >= 20, text: `Node ${process.version} (≥ 20 required)` },
    { ok: depsInstalled, text: 'Dependencies installed' },
    {
      ok: remote !== null,
      text: remote
        ? `Git remote: ${remote.host}/${remote.owner}/${remote.repo}`
        : 'Git remote: not found',
    },
    { ok: workflowPresent, text: `Workflow file present: ${WORKFLOW_FILE}` },
    { ok: featurePresent, text: `Feature file present:  ${FEATURE_FILE}` },
  ];
  const body = checks.map((c) => `${c.ok ? '✓' : '✗'} ${c.text}`);
  if (remote) {
    body.push(
      '',
      "You'll use these values in Jira later:",
      ` · Owner:      ${remote.owner}`,
      ` · Repo:       ${remote.repo}`,
      ' · Workflow:   automatify-testops.yml',
      ' · Ref:        main',
    );
  }
  p.log.message(body, { spacing: 0 });
  return remote;
}

// ---------- step copy (verbatim from the approved replay transcript) ----------

const STEP_2_BODY = [
  '1. Open your project board, e.g.',
  '   https://your-site.atlassian.net/jira/software/projects/KAN/boards/1',
  '2. Click the "Automatify TestOps" tab → "Automation" sub-tab → "Profiles" tab.',
  '3. Click "Create profile" → pick the "GitHub Actions" provider.',
  '4. Fill the form:',
  '     Profile label   — any name you want for this automation',
  '                       profile, e.g. testops-starter',
  '     Owner           — GitHub org or username owning the repo,',
  '                       e.g. your-name (shown in Step 1)',
  '     Repo            — repository name, e.g. jira-testops-starter',
  '     Workflow id     — the workflow file name under',
  '                       .github/workflows/, exactly:',
  '                       automatify-testops.yml',
  '     Ref             — branch to dispatch; leave as main',
  '     Inputs template — leave empty',
  '     Secret token    — a GitHub PAT ("PAT or bearer token") that',
  '                       TestOps uses to dispatch workflows;',
  '                       needs repo + workflow scopes',
  '5. Click "Create profile".',
  '',
  'Expected: green banner "Automation profile saved: testops-starter."',
  '          and the card under "Project profiles" showing',
  '          "1 profile(s)" with "Secret configured".',
];

const STEP_3_BODY = [
  '1. On the profile card → "Set default".',
  '',
  'Expected: Automation overview shows "Default profile: testops-starter".',
];

const STEP_4_BODY = [
  '1. In the TestOps panel → "CLI" sub-tab.',
  '2. Type a label into "Key label", e.g. github-actions-cli-key.',
  '3. Click "Create CLI key".',
  '   Expected: the one-time key is shown once — copy it.',
  '   Expected: the endpoint URL is displayed — copy it.',
];

const STEP_5_BODY = [
  '1. GitHub repo → Settings → "Secrets and variables" in the left',
  '   menu → Actions → "New repository secret" (twice):',
  '      · Name: TESTOPS_FORGE_ENDPOINT    Secret: <endpoint from Step 4>',
  '      · Name: TESTOPS_FORGE_AUTH_TOKEN  Secret: <key from Step 4>',
  '',
  'Expected: both secrets listed under "Repository secrets".',
];

const STEP_6_BODY = [
  'Create TWO scenarios — one per sample scenario in',
  'features/playwright-docs.feature. For each one:',
  '',
  '1. Open (or create) a Jira issue, e.g. a story.',
  '   If the "Automatify TestOps" panel is not displayed on the issue,',
  '   scroll to the top and click "View app actions" next to the "+"',
  '   button to open it.',
  '2. On the issue, open the "Automatify TestOps" panel → "New scenario".',
  '   The "Create scenario" dialog opens.',
  '3. Fill the form — what goes where:',
  '',
  '    Scenario group  →  Playwright docs        (optional label)',
  '    Scenario name   →  any descriptive name, e.g. the sample',
  '                       titles:',
  '                         1) Documentation homepage shows',
  '                            Playwright title',
  '                         2) Expected-fail demo with wrong title',
  '    Tags            →  optional, e.g. @smoke',
  '    Estimated duration (minutes) → optional, e.g. 1',
  '    Priority        →  any, e.g. medium',
  '    Steps           →  MUST match the sample steps exactly — the',
  '                       workflow runs the steps you paste, using the',
  "                       template's step definitions. One step per line:",
  '',
  '                       Scenario 1:',
  '                         Given I open the Playwright documentation homepage',
  '                         Then the page title contains "Playwright"',
  '',
  '                       Scenario 2:',
  '                         Given I open the Playwright documentation homepage',
  '                         Then the page title contains "Wrong Expected Title"',
  '',
  '4. Click "Create scenario" — the issue links automatically.',
  '   Expected: the scenario appears under "Linked scenarios"',
  '   with its new key (e.g. SC-2).',
  '5. Repeat steps 1–4 for the second scenario.',
];

const STEP_7_BODY = [
  '1. Board → "Automatify TestOps" → "Automation" → "Scenario bindings"',
  "   → click each scenario's key.",
  '2. Automation label: keep the suggested one.',
  '   Profile: pick "testops-starter" → click "Bind profile".',
  '',
  'Expected: green banner "Binding saved: …" and the table rows',
  '          show "testops-starter" in the "Profile" column.',
];

const STEP_8_BODY = [
  'Replicate the two scenarios in your terminal:',
  '',
  '1. npx bddgen test',
  '2. npx playwright test',
  '   Expected: 1 passed, 1 failed — the expected-fail demo is',
  '   SUPPOSED to fail; the exit code is non-zero on purpose.',
  '   The browser opens headed and traces are recorded.',
  '',
  'Expected: junit at test-results/junit.xml, HTML report at',
  '          playwright-report/.',
];

const STEP_9_BODY = [
  '1. npx playwright show-report',
  '',
  'Expected: the HTML report opens in your browser — each scenario',
  '          shows its steps, trace, and screenshots.',
];

const STEP_10_BODY = [
  'Configured: profile ✓ · default ✓ · repo secrets ✓',
  '            scenarios ✓ · bindings ✓',
  '',
  'Try it now:',
  ' 1. "Scenario bindings" → your scenario → "Run now"',
  '    (or open the linked issue → run from the TestOps panel).',
  ' 2. "Documentation homepage shows Playwright title" → PASS.',
  ' 3. "Expected-fail demo with wrong title" → FAIL.',
  '    That one is SUPPOSED to fail — it proves failure reporting.',
  '',
  'Expected: status transitions queued → running → passed',
  '          (failed for the demo scenario), an issue comment',
  '          "Automatify scenario automation finished with status …"',
  '          and a link to the GitHub Actions run.',
  '',
  'If the status stays "queued" after the run finishes:',
  '  redo Step 5 (repo secrets).',
  'If the status is "failed" right after Run now:',
  '  check Workflow id / Ref (Step 2) and that the workflow file',
  '  is committed to the default branch.',
];

// "No — show help for this step" content: cause/fix lines from the troubleshooting table.
const STEP_HELP = {
  1: [
    'Preflight is auto-verified locally:',
    '  · "Dependencies installed" — run: npm install',
    '  · "Git remote" — add one, e.g.: git remote add origin https://github.com/your-name/jira-testops-starter.git',
    '  · Workflow/feature file missing — run the wizard from the repo root.',
  ],
  2: [
    '"Automation profile limit reached" — free tier = 1 profile. Fix: edit/delete the existing profile.',
    'Status "failed" right after Run now; GitHub has no run — Workflow id wrong OR file not on default branch (404). Fix: correct Workflow id / Ref; commit the workflow to the default branch.',
    'Need a GitHub PAT? GitHub → your avatar (top right) → Settings →',
    'Developer settings → Personal access tokens → Tokens (classic) →',
    '"Generate new token (classic)" → tick "repo" and "workflow" →',
    '"Generate token" → copy the value (shown only once).',
  ],
  3: [
    '"Set default" lives on the profile card in the "Profiles" tab.',
    'Expected after setting it: Automation overview shows "Default profile: <label>".',
  ],
  4: [
    'Expected: the one-time key is shown once — copy it.',
    'Expected: the endpoint URL is displayed — copy it.',
    'Both values are used in Step 5.',
  ],
  5: [
    'Status stuck "queued" (GitHub run fails at the Forge report step, or ran without reporting) — repo secrets TESTOPS_FORGE_ENDPOINT / TESTOPS_FORGE_AUTH_TOKEN missing (workflow cannot call Forge). Fix: add the 2 repo secrets (Step 5).',
  ],
  6: [
    'Run fails with "Missing step definitions" — Jira scenario steps differ from the template\'s step definitions. Fix: paste the exact steps shown in Step 6.',
  ],
  7: ['The bindings pane is at Board → "Automatify TestOps" → "Automation" → "Scenario bindings".'],
  8: [
    'If you see "Error: No tests found", run `npx bddgen test` first — generated tests live in .features-gen/ and are not committed.',
  ],
  9: [
    'The report lives in playwright-report/ — reopen it any time with `npx playwright show-report`.',
  ],
};

// ---------- gates ----------

function gateOptions(yesLabel) {
  return [
    { value: 'yes', label: yesLabel },
    { value: 'help', label: 'No — show help for this step' },
    { value: 'reset', label: 'Reset wizard (start over from Step 1)' },
    { value: 'quit', label: 'Quit (progress saved)' },
  ];
}

async function askGate(question, yesLabel) {
  const selectOpts = {
    message: question,
    options: gateOptions(yesLabel),
    showInstructions: false,
  };
  if (scriptedAnswers) {
    const answer = scriptedAnswers.shift();
    if (!answer) {
      console.error('autodrive: script exhausted while a gate was still open');
      process.exit(1);
    }
    const input = new PassThrough();
    setTimeout(() => input.write(keystrokesFor(answer)), 40);
    selectOpts.input = input;
    selectOpts.output = process.stdout;
  }
  const value = await p.select(selectOpts);
  return p.isCancel(value) ? 'quit' : value;
}

// ---------- wizard steps ----------

const WIZARD_STEPS = [
  { id: 'step-1', text: 'Preflight' },
  {
    id: 'step-2',
    text: 'Create the automation profile in Jira  (browser, ~2 min)',
    body: STEP_2_BODY,
    question: 'Profile created?',
    help: STEP_HELP[2],
  },
  {
    id: 'step-3',
    text: 'Set it as the project default  (recommended)',
    body: STEP_3_BODY,
    question: 'Default set?',
    help: STEP_HELP[3],
  },
  {
    id: 'step-4',
    text: 'Create the CLI key in Jira  (browser, ~1 min)',
    body: STEP_4_BODY,
    question: 'CLI key created and copied?',
    help: STEP_HELP[4],
  },
  {
    id: 'step-5',
    text: 'Add the GitHub repository secrets  (browser, ~2 min)',
    body: STEP_5_BODY,
    question: 'Both secrets added?',
    help: STEP_HELP[5],
  },
  {
    id: 'step-6',
    text: 'Create the scenarios in Jira  (browser, ~2 min)',
    body: STEP_6_BODY,
    question: 'Both scenarios created?',
    help: STEP_HELP[6],
  },
  {
    id: 'step-7',
    text: 'Bind the profile to the scenarios  (browser, ~1 min)',
    body: STEP_7_BODY,
    question: 'Both scenarios bound?',
    help: STEP_HELP[7],
  },
  {
    id: 'step-8',
    text: 'Run the scenarios locally  (terminal, ~1 min)',
    body: STEP_8_BODY,
    question: 'Local run done?',
    help: STEP_HELP[8],
  },
  {
    id: 'step-9',
    text: 'View the Playwright report  (terminal, ~1 min)',
    body: STEP_9_BODY,
    question: 'Report viewed?',
    help: STEP_HELP[9],
  },
  { id: 'step-10', text: 'Done' },
];

async function runGuidedStep(index) {
  const step = WIZARD_STEPS[index];
  console.log('');
  header(index + 1, step.text);
  if (step.body) p.log.message(step.body);
  for (;;) {
    const answer = await askGate(step.question, 'Yes, continue');
    if (answer === 'yes') return 'done';
    if (answer === 'quit') return 'quit';
    if (answer === 'reset') return 'reset';
    p.log.message(step.help);
  }
}

// ---------- outro (hand-rolled to match the transcript border) ----------

function printOutro() {
  const width = 54;
  process.stdout.write('│\n');
  process.stdout.write(`╰${'─'.repeat(width)}╯\n`);
  process.stdout.write('   Setup complete · docs: https://automatify.com.au/docs/testops\n');
  process.stdout.write('   Quit earlier? Re-run `npm run testops-wizard` — done steps are\n');
  process.stdout.write('   skipped automatically and you resume where you left off.\n');
}

// ---------- main flow ----------

async function runFlow() {
  const completed = loadCompleted();
  const labelOf = (i) => WIZARD_STEPS[i].text;
  const quitAt = (stepIndex) => {
    const lines = [];
    for (let i = 0; i < stepIndex; i++) {
      lines.push(`✓ Step ${i + 1}/10 · ${labelOf(i)} — done`);
    }
    lines.push(`○ Step ${stepIndex + 1}/10 · ${labelOf(stepIndex)} — pending`);
    lines.push('re-run `npm run testops-wizard` to resume');
    p.log.message(lines);
    process.exit(0);
  };

  // Preflight output is always shown (fresh values each run); the gate only when not completed.
  console.log('');
  header(1, labelOf(0));
  preflight();
  if (WIZARD_STEPS.every((s) => completed.includes(s.id))) {
    p.log.info('All steps complete — to start over, run: npm run testops-wizard -- --reset');
  }
  if (completed.includes('step-1')) {
    p.log.info('Step 1/10 · Preflight — already completed, skipping');
  } else {
    for (;;) {
      const answer = await askGate('What next?', 'Yes, continue to Step 2');
      if (answer === 'yes') break;
      if (answer === 'quit') quitAt(0);
      if (answer === 'reset') {
        resetState();
        return 'reset';
      }
      p.log.message(STEP_HELP[1]);
    }
    completed.push('step-1');
    saveCompleted(completed);
  }

  // Steps 2–9 (guided bodies + gates)
  for (let i = 1; i < WIZARD_STEPS.length - 1; i++) {
    const step = WIZARD_STEPS[i];
    if (completed.includes(step.id)) {
      p.log.info(`Step ${i + 1}/10 · ${step.text} — already completed, skipping`);
      continue;
    }
    const outcome = await runGuidedStep(i);
    if (outcome === 'quit') quitAt(i);
    if (outcome === 'reset') {
      resetState();
      return 'reset';
    }
    completed.push(step.id);
    saveCompleted(completed);
  }

  // Step 10 (outro, no gate)
  console.log('');
  header(10, labelOf(9));
  p.log.message(STEP_10_BODY);
  completed.push('step-10');
  saveCompleted(completed);
  printOutro();
  return 'done';
}

async function main() {
  if (process.argv.includes('--reset')) resetState();

  bannerBox([
    '',
    '   Automatify TestOps — guided setup',
    '   Connects this repo to your Jira TestOps project',
    '   so BDD scenarios run from Jira via GitHub Actions.',
    "   No CLI needed — you'll do a few steps in Jira and",
    '   GitHub, and the wizard tells you exactly what.',
    '   Progress is saved after every step — quit anytime',
    '   and re-run this command to resume.',
    '',
  ]);

  for (;;) {
    const outcome = await runFlow();
    if (outcome === 'done') break;
    // 'reset': state file already deleted by the gate handler — restart from Step 1.
  }
}

process.on('SIGINT', () => {
  process.stdout.write('\n');
  p.log.message([
    '✗ Interrupted — progress is saved.',
    're-run `npm run testops-wizard` to resume',
  ]);
  process.exit(0);
});

main();
