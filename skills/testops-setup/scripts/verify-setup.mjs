#!/usr/bin/env node
// Deterministic local checks for the jira-testops-starter TestOps wiring.
// Run from the repo root: node skills/testops-setup/scripts/verify-setup.mjs
// No network calls. The workflow check is regex-level (no YAML dependency) —
// it reads the inputs block we ship in this repo, which is sufficient here.

import fs from 'node:fs';

const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass, detail });

// Node >= 20
const nodeMajor = Number(process.versions.node.split('.')[0]);
check('Node >= 20', nodeMajor >= 20, `detected ${process.version}`);

// Dependencies installed
check('Dependencies installed (node_modules present)', fs.existsSync('node_modules'));

// Workflow file exists and declares the 10 dispatch inputs
const workflowPath = '.github/workflows/automatify-testops.yml';
const workflow = fs.existsSync(workflowPath) ? fs.readFileSync(workflowPath, 'utf8') : null;
check('Workflow file present', workflow !== null);
check('Workflow triggers via workflow_dispatch', workflow?.includes('workflow_dispatch') ?? false);
const REQUIRED_INPUTS = [
  'project_key',
  'issue_key',
  'jira_base_url',
  'testops_environment',
  'scenario_id',
  'scenario_ref',
  'scenario_ordinal',
  'scenario_name',
  'feature_name',
  'steps',
];
let declaredInputs = [];
if (workflow) {
  const start = workflow.indexOf('    inputs:');
  const end = workflow.indexOf('permissions:', start);
  const block = workflow.slice(start, end);
  declaredInputs = [...block.matchAll(/^ {6}([a-z_]+):$/gm)].map((m) => m[1]);
}
const missingInputs = REQUIRED_INPUTS.filter((k) => !declaredInputs.includes(k));
const extraInputs = declaredInputs.filter((k) => !REQUIRED_INPUTS.includes(k));
check(
  'Workflow declares exactly the 10 dispatch inputs',
  workflow !== null && missingInputs.length === 0 && extraInputs.length === 0,
  missingInputs.length === 0 && extraInputs.length === 0
    ? `found ${declaredInputs.length}`
    : `missing: [${missingInputs}] unexpected: [${extraInputs}]`,
);

// Feature file with the 2 required scenario titles
const featurePath = 'features/playwright-docs.feature';
const feature = fs.existsSync(featurePath) ? fs.readFileSync(featurePath, 'utf8') : null;
check('Feature file present', feature !== null);
const requiredScenarios = [
  'Scenario: Documentation homepage shows Playwright title',
  'Scenario: Expected-fail demo with wrong title',
];
const missingScenarios = feature
  ? requiredScenarios.filter((s) => !feature.includes(s))
  : requiredScenarios;
check(
  'Feature file has the 2 required scenario titles',
  missingScenarios.length === 0,
  missingScenarios.length === 0 ? 'both found' : `missing: ${missingScenarios}`,
);

// Steps file
check('Step definitions file present', fs.existsSync('steps/playwright-docs.steps.ts'));

let failed = 0;
for (const { name, pass, detail } of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!pass) failed++;
}
console.log(`Summary: ${checks.length - failed}/${checks.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
