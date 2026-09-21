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

// ---------- state (resume) ----------

const loadCompleted = () => {
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return Array.isArray(parsed.completed) ? parsed.completed : [];
  } catch {
    return [];
  }
};

const saveCompleted = (completed) => {
  fs.writeFileSync(STATE_FILE, `${JSON.stringify({ completed }, null, 2)}\n`);
};

// ---------- autodrive (sandbox verification only; invisible without the env var) ----------

const AUTODRIVE_KEYS = { yes: '\r', help: '\x1b[B\r', quit: '\x1b[B\x1b[B\r' };

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
  p.log.message(`Step ${n}/6 · ${text}`, { symbol: p.symbol('active'), spacing: 0 });
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
  '2. Click the "Automatify TestOps" tab → "Automation" sub-tab.',
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
  '2. Click "Create CLI key" → label: wizard-key → "Create CLI key".',
  '   Expected: the one-time key is shown once — copy it.',
  '   Expected: the endpoint URL is displayed — copy it.',
  '3. GitHub repo → Settings → Secrets and variables → Actions',
  '   → "New repository secret" (twice):',
  '      · Name: TESTOPS_FORGE_ENDPOINT    Secret: <endpoint from step 2>',
  '      · Name: TESTOPS_FORGE_AUTH_TOKEN  Secret: <key from step 2>',
  '',
  'Expected: both secrets listed under "Repository secrets".',
];

const STEP_5_BODY = [
  'Create TWO scenarios — one per sample scenario in',
  'features/playwright-docs.feature. For each one:',
  '',
  '1. Open (or create) a Jira issue, e.g. a story.',
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
  '    Steps           →  MUST match the sample steps exactly —',
  '                       the workflow runs the steps you paste,',
  "                       using the template's step definitions.",
  '                       One step per line, starting with Given,',
  '                       When, Then, And, or But:',
  '                         1) Given I open the Playwright',
  '                            documentation homepage',
  '                            Then the page title contains',
  '                            "Playwright"',
  '                         2) Given I open the Playwright',
  '                            documentation homepage',
  '                            Then the page title contains',
  '                            "Wrong Expected Title"',
  '',
  '4. Click "Create scenario" — the issue links automatically.',
  '   Expected: the scenario appears under "Linked scenarios"',
  '   with its new key (e.g. SC-2).',
  '5. Repeat steps 1–4 for the second scenario.',
  '',
  'Then bind both scenarios:',
  '6. Board → "Automatify TestOps" → "Automation" → "Scenario bindings"',
  "   → click each scenario's key.",
  '7. Automation label: keep the suggested one.',
  '   Profile: pick "testops-starter" → click "Bind profile".',
  '',
  'Expected: green banner "Binding saved: …" and the table rows',
  '          show "testops-starter" in the "Profile" column.',
];

const STEP_6_BODY = [
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
  '  redo Step 4 (repo secrets).',
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
  ],
  3: [
    '"Set default" lives on the profile card in the "Profiles" sub-tab.',
    'Expected after setting it: Automation overview shows "Default profile: <label>".',
  ],
  4: [
    'Status stuck "queued" (GitHub run fails at the Forge report step, or ran without reporting) — repo secrets TESTOPS_FORGE_ENDPOINT / TESTOPS_FORGE_AUTH_TOKEN missing (workflow cannot call Forge). Fix: add the 2 repo secrets (Step 4).',
  ],
  5: [
    'Run fails with "Missing step definitions" — Jira scenario steps differ from the template\'s step definitions. Fix: paste the exact steps shown in Step 5.',
  ],
};

function gateOptions(yesLabel) {
  return [
    { value: 'yes', label: yesLabel },
    { value: 'help', label: 'No — show help for this step' },
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
  {
    id: 'step-1',
    text: 'Preflight',
    run: async () => {
      preflight();
      for (;;) {
        const answer = await askGate('What next?', 'Yes, continue to Step 2');
        if (answer === 'yes') return true;
        if (answer === 'quit') return false;
        p.log.message(STEP_HELP[1]);
      }
    },
  },
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
    text: 'Add the GitHub repository secrets  (browser, ~2 min)',
    body: STEP_4_BODY,
    question: 'Both secrets added?',
    help: STEP_HELP[4],
  },
  {
    id: 'step-5',
    text: 'Create the scenarios in Jira and bind the profile  (browser, ~3 min)',
    body: STEP_5_BODY,
    question: 'Both scenarios created and bound?',
    help: STEP_HELP[5],
  },
];

async function runGuidedStep(index) {
  const step = WIZARD_STEPS[index];
  console.log('');
  header(index + 1, step.text);
  if (step.body) p.log.message(step.body);
  for (;;) {
    const answer = await askGate(step.question, 'Yes, continue');
    if (answer === 'yes') return true;
    if (answer === 'quit') return false;
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

// ---------- main ----------

async function main() {
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

  const completed = loadCompleted();
  const labelOf = (i) => WIZARD_STEPS[i].text;
  const quitAt = (stepIndex) => {
    const lines = [];
    for (let i = 0; i < stepIndex; i++) {
      lines.push(`✓ Step ${i + 1}/6 · ${labelOf(i)} — done`);
    }
    lines.push(`○ Step ${stepIndex + 1}/6 · ${labelOf(stepIndex)} — pending`);
    lines.push('re-run `npm run testops-wizard` to resume');
    p.log.message(lines);
    process.exit(0);
  };

  // Step 1 (custom flow: preflight checks + values box)
  if (completed.includes('step-1')) {
    p.log.info('Step 1/6 · Preflight — already completed, skipping');
  } else {
    console.log('');
    header(1, 'Preflight');
    const ok = await WIZARD_STEPS[0].run();
    if (!ok) quitAt(0);
    completed.push('step-1');
    saveCompleted(completed);
  }

  // Steps 2–5 (guided bodies + gates)
  for (let i = 1; i < WIZARD_STEPS.length; i++) {
    const step = WIZARD_STEPS[i];
    if (completed.includes(step.id)) {
      p.log.info(`Step ${i + 1}/6 · ${step.text} — already completed, skipping`);
      continue;
    }
    const ok = await runGuidedStep(i);
    if (!ok) quitAt(i);
    completed.push(step.id);
    saveCompleted(completed);
  }

  // Step 6 (outro, no gate)
  console.log('');
  header(6, 'Done');
  p.log.message(STEP_6_BODY);
  completed.push('step-6');
  saveCompleted(completed);
  printOutro();
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
