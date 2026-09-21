import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'features/*.feature',
  steps: 'steps/*.ts',
});

export default defineConfig({
  testDir,
  reporter: [['list'], ['junit', { outputFile: 'test-results/junit.xml' }]],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
