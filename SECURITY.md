# Security Policy

## Reporting a vulnerability

Email `aaronmarchant96@outlook.com` with details. Do not open a public issue for security vulnerabilities.

Expect a response within 72 hours. We'll coordinate the fix and disclosure timeline.

## Scope

Security concerns that are in-scope for this project:

- **API key exposure** — hardcoded Groq, OpenAI, or custom API keys committed to the repository or exposed in client-side code
- **Prompt injection** — adversarial inputs that bypass the routing engine's red-team scanner and reach production models
- **Unauthenticated API access** — endpoints missing Bearer token validation
- **Denial of service** — inputs that crash the routing pipeline or exhaust API quota

## Out of scope

- Theoretical prompt-injection against the underlying Groq/OpenAI models (these are provider-level concerns)
- Physical access attacks
- Social engineering

## Acknowledgments

We appreciate responsible disclosure and will credit researchers who report valid vulnerabilities (with permission).
