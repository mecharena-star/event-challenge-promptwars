# Security

## Reporting
Open a private security advisory on the repository, or contact the maintainer directly. Please do not file public issues for vulnerabilities.

## Threat model in one page
| Threat | Control | Where |
| --- | --- | --- |
| Malformed or hostile input | One strict Zod schema: unknown keys rejected, every field bounded, prototype keys rejected | `src/domain/schema.ts` |
| Oversized or slow-drip bodies | 8 KB cap checked on `Content-Length` and while streaming | `src/server/http.ts` |
| Cross-site request forgery | `Origin` and `Sec-Fetch-Site` checks; no cookies or ambient credentials exist | `src/server/http.ts` |
| Abuse and cost exhaustion | Per-client sliding-window limits (stricter for the AI route), bounded memory, 12 s AI timeout, 1,500 output tokens | `src/server/rate-limit.ts`, `src/ai/gemini.ts` |
| Prompt injection | User text is sanitised, length-capped, and confined to one delimited block that cannot be closed; the model has no tools; output is schema-constrained and re-validated; the UI renders text only | `src/ai/prompt.ts`, `src/ai/ideas.ts` |
| XSS | React escapes all output; per-request CSP nonce with `strict-dynamic`; no inline styles; no `dangerouslySetInnerHTML` | `src/proxy.ts` |
| Secret leakage | Key is server-only (`server-only` import guard, never `NEXT_PUBLIC_`), validated at start-up, never logged or echoed | `src/server/env.ts` |
| Information disclosure | Generic 500s; logs carry codes and timings only, never request bodies | `src/server/handlers.ts`, `src/server/logger.ts` |
| Calendar-file injection | RFC 5545 escaping; newlines cannot create new properties | `src/domain/ics.ts` |
| Vulnerable dependencies | Minimal runtime dependencies, committed lockfile, `npm audit` in CI, Dependabot | `.github/` |

## Known limits
- Rate limiting is per server instance. On serverless platforms use a shared store or an edge limiter for a global cap.
- `X-Forwarded-For` is trusted as set by the hosting platform. Behind an untrusted proxy it can be spoofed.
- No personal data is stored. Plans exist only in the browser session.
