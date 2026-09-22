import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, Then } = createBdd();

Given('I open the Playwright documentation homepage', async ({ page }) => {
  await page.goto('https://playwright.dev');
});

Then('the page title contains {string}', async ({ page }, expected: string) => {
  await expect(page).toHaveTitle(new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
