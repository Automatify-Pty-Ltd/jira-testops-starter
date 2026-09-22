# Security Policy

## Supported Versions

This repository is a starter template. Security fixes are applied to the latest version on the default branch.

| Version | Supported |
| --- | --- |
| Latest `main` | Yes |
| Older generated copies | No |

Repositories created from this template are independent copies. Keep dependencies, GitHub Actions, Playwright, and TestOps integrations up to date in your own repository.

## Reporting a Vulnerability

Please do **not** report security vulnerabilities in a public GitHub issue, discussion, pull request, or comment.

Use GitHub's private vulnerability reporting / Security Advisory flow for this repository when available:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Include a clear description, affected files or workflow, reproduction steps, and the potential impact.

Please avoid including production credentials, Jira API tokens, GitHub tokens, TestOps secrets, customer data, or other sensitive information in public channels.

## Secrets and Credentials

This template must not contain real credentials or environment-specific secrets. Store values such as Jira/TestOps tokens and GitHub credentials in the appropriate secret store, for example GitHub Actions secrets or environment-level secrets.

If a credential is accidentally committed, revoke or rotate it immediately before removing it from repository history.

## Dependency and Workflow Security

When updating this template:

- Prefer pinned or explicitly versioned dependencies and GitHub Actions.
- Review third-party Actions and dependencies before adding them.
- Keep workflow permissions at the minimum required level.
- Do not expose secrets to pull requests from untrusted forks.
- Treat generated starter repositories as separate security boundaries.
