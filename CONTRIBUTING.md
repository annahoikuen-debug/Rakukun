# Contributing to Rakukun

Thank you for your interest in contributing to Rakukun! This guide details how to contribute to Rakukun (a multi-tenant phishing-training SaaS built with Next.js + Gophish).

## Getting Started

1. Fork the repository and create a feature branch from `master`.
2. Install dependencies:

   ```bash
   cd web
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in local values.
4. Run the app:

   ```bash
   npm run dev
   ```

5. Run checks before submitting:

   ```bash
   npm run check   # typecheck + lint + test
   ```

## Security Vulnerability Disclosure

Please report suspected security vulnerabilities **privately** via GitHub Security Advisories (the "Report a vulnerability" button on the repository). Do **NOT** create publicly viewable issues for suspected vulnerabilities.

## Pull Request Guidelines

- Keep changes focused on a single concern.
- Add or update tests for new behavior.
- Update documentation (README, DEPLOYMENT.md) when user-facing behavior changes.
- Run `npm run check` and ensure it passes before opening a PR.
- If modifying Go code (Gophish fork under `/`), ensure `go build ./...` passes.

## Code of Conduct

Please treat maintainers and contributors with courtesy and respect. Issues and merge requests not in line with these guidelines may be closed without notice.
