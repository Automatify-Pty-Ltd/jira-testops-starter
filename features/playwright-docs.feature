Feature: Playwright documentation site is reachable
  The sample scenarios demonstrate a passing run and an expected failure
  once TestOps triggers them from Jira.

  Scenario: Documentation homepage shows Playwright title
    Given I open the Playwright documentation homepage
    Then the page title contains "Playwright"

  Scenario: Expected-fail demo with wrong title
    Given I open the Playwright documentation homepage
    Then the page title contains "Wrong Expected Title"