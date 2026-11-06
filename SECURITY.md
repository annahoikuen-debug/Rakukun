# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| master  | ✅        |

## Reporting a Vulnerability

Thank you for taking the time to find and report a security vulnerability in Rakukun!

Please send details privately to the repository maintainer via GitHub Security Advisories (the "Report a vulnerability" button on the repository) or by opening a private issue. **Do not post vulnerability details in public issues or discussions.**

Include as much of the following as possible:
- Steps to reproduce the issue
- Affected endpoints or components
- Potential impact (auth bypass, tenant data leakage, SSRF, etc.)
- Suggested fix (if any)

We will acknowledge receipt, investigate, and coordinate a fix/disclosure timeline with you.

## Security Features

- Multi-tenant isolation enforced at the application layer (every tenant-scoped operation validates membership)
- Gophish API keys encrypted at rest with AES-256-GCM
- MFA (TOTP + recovery codes) required for OWNER/ADMIN server actions
- Rate limiting on auth, test-send, launch, upload-csv, MFA verify, and public training endpoints
- Suppressed email list for bounce/complaint handling
- Audit logging for key mutations (best-effort)
- CSP / security headers on admin pages
