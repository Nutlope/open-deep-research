# Security Review: Open Deep Research

**Date:** 2026-05-01
**Reviewer:** Security Audit
**Scope:** Full codebase review of Nutlope/open-deep-research

---

## Executive Summary

This review identified **3 High**, **3 Medium**, and **2 Low** severity findings. The most critical issues are an unauthenticated SSRF vulnerability via the PDF generation endpoint, missing authentication on multiple API routes, and an Insecure Direct Object Reference (IDOR) that allows any user to access any research session's data.

---

## HIGH Severity Findings

### FINDING 1: Unauthenticated SSRF via PDF Endpoint

**File:** `src/app/api/pdf/route.ts:6-74`
**Severity:** HIGH
**CWE:** CWE-918 (Server-Side Request Forgery)

**Description:**
The `/api/pdf` POST endpoint accepts a user-controlled `url` parameter and uses Puppeteer to navigate to it and generate a PDF. There is **no authentication check** and **no URL validation/allowlist**.

**Attack Path:**
1. Attacker sends `POST /api/pdf` with body `{"url": "http://169.254.169.254/latest/meta-data/"}` (AWS metadata endpoint)
2. Puppeteer navigates to the internal URL from the server
3. Internal network services, cloud metadata, or internal APIs become accessible
4. The resulting PDF is returned to the attacker

**Proof of Concept:**
```bash
curl -X POST https://target.com/api/pdf \
  -H "Content-Type: application/json" \
  -d '{"url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/"}'
```

**Why Existing Defenses Fail:**
- No `auth()` check from Clerk on this route
- No URL validation — any URL scheme is accepted (file://, gopher://, etc.)
- No allowlist of permitted domains
- Puppeteer runs with full network access from the server

**Impact:** Full SSRF — access to internal services, cloud metadata (AWS/GCP credentials), internal APIs, and potentially RCE via `file://` protocol depending on Puppeteer configuration.

**Remediation:**
- Add Clerk authentication (`const { userId } = await auth()`)
- Implement a URL allowlist (only allow URLs from your own domain)
- Block access to private IP ranges (169.254.0.0/16, 10.0.0.0/8, 127.0.0.0/8, etc.)
- Disable dangerous protocols (file://, gopher://, ftp://)

---

### FINDING 2: Unauthenticated Research Trigger via storeAnswers

**File:** `src/app/api/storeAnswers/route.ts:4-43`
**Severity:** HIGH
**CWE:** CWE-306 (Missing Authentication for Critical Function)

**Description:**
The `/api/storeAnswers` endpoint has **no authentication check**. Any unauthenticated caller can store answers for any `chatId` and trigger the research workflow, consuming API credits and compute resources.

**Attack Path:**
1. Attacker discovers a valid `chatId` (e.g., through IDOR — see Finding 3, or by creating their own research session)
2. Attacker sends `POST /api/storeAnswers` with `{"chatId": "<id>", "answers": ["malicious prompt injection"]}`
3. The server stores the answers and calls `startResearch()`, which triggers LLM API calls
4. Attacker can exhaust the victim's API quota or trigger costly LLM operations

**Code Evidence:**
```typescript
// src/app/api/storeAnswers/route.ts — NO auth() call
export async function POST(req: Request) {
  const body = await req.json();
  const { chatId, answers, togetherApiKey } = body;
  // ... directly calls storeAnswers() and startResearch()
}
```

Compare to the properly protected `/api/cancel` route:
```typescript
// src/app/api/cancel/route.ts — HAS auth check
const { userId } = await auth();
if (!userId) {
  return new NextResponse("Unauthorized", { status: 401 });
}
```

**Why Existing Defenses Fail:**
- No Clerk `auth()` call on this route
- No ownership verification — the endpoint does not check if the caller owns the `chatId`
- Rate limiting (`limitResearch`) is only enforced in `startResearch.ts`, which is called *after* answers are stored

**Impact:**
- Resource exhaustion (LLM API costs)
- Ability to trigger research workflows on behalf of other users
- Potential prompt injection through malicious answers

**Remediation:**
- Add `const { userId } = await auth()` and verify `userId` owns the `chatId`
- Verify ownership by querying the database: `eq(research.clerkUserId, userId)`

---

### FINDING 3: IDOR — Unauthenticated Access to Any Research Session

**File:** `src/app/api/research/route.ts:16-49`
**Severity:** HIGH
**CWE:** CWE-639 (Insecure Direct Object Reference)

**Description:**
The `/api/research` GET endpoint accepts a `chatId` query parameter and returns all research events and status for that session **without any authentication or ownership check**. Any attacker who can guess or enumerate a `chatId` can read the full research data, including the research topic, questions, answers, and the generated report.

**Attack Path:**
1. Attacker iterates through `chatId` values (nanoid: 62^N, but IDs may leak via URLs, logs, or referers)
2. `GET /api/research?chatId=<id>` returns the full research state
3. Attener gains access to any user's research questions, answers, and reports

**Code Evidence:**
```typescript
// src/app/api/research/route.ts — NO auth check
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chatId");
  // Directly returns research data without checking ownership
  const research = await getResearch(chatId);
  const events = await streamStorage.getEvents(chatId);
  return new Response(JSON.stringify(steps), ...);
}
```

**Why Existing Defenses Fail:**
- No Clerk `auth()` middleware or route-level check
- The `chatId` is a nanoid (62-character alphabet), which provides ~21 bits of entropy per character — strong but not unguessable if leaked
- No ownership verification against `clerkUserId` in the research record

**Impact:** Confidentiality breach — any user's research queries, answers, and reports are readable by anyone with the session ID.

**Remediation:**
- Add authentication: `const { userId } = await auth()`
- Verify ownership: check `research.clerkUserId === userId` before returning data
- Alternatively, protect this route via the Clerk middleware in `src/proxy.ts`

---

## MEDIUM Severity Findings

### FINDING 4: Unauthenticated API Key Validation Endpoint

**File:** `src/app/api/validate-key/route.ts:4-41`
**Severity:** MEDIUM
**CWE:** CWE-306 (Missing Authentication)

**Description:**
The `/api/validate-key` endpoint accepts any API key and makes a real LLM call to Together AI to validate it. There is no authentication, no rate limiting, and the error response leaks the full error message from the LLM provider.

**Attack Path:**
1. Attacker sends repeated `POST /api/validate-key` with different API keys
2. Each call triggers a real LLM request to Together AI, consuming server-side API quota
3. Error responses leak detailed error messages from the AI provider

**Impact:**
- Resource exhaustion of server-side Together AI API quota
- Information leakage via error messages
- Potential for abuse as a free API key validation oracle

**Remediation:**
- Add rate limiting to this endpoint
- Consider requiring authentication
- Sanitize error messages in responses (remove `error.message` from response at `validate-key/route.ts:35`)

---

### FINDING 5: Workflow Endpoint May Lack Request Validation

**File:** `src/app/api/workflows/[...any]/route.ts:1-13`
**Severity:** MEDIUM
**CWE:** CWE-94 (Improper Control of Generation of Code)

**Description:**
The workflow endpoints are served via `serveMany` from `@upstash/workflow/nextjs`. While Upstash Workflow provides its own signature validation for incoming requests from QStash, the catch-all route `[...any]` pattern could be exploitable if:
1. The QStash signature validation is misconfigured or bypassed
2. An attacker directly invokes the workflow URL with a crafted payload

**Attack Path:**
If an attacker can invoke the workflow endpoint directly with a crafted `StartResearchPayload`, they could:
- Set `togetherApiKey` to a value that routes API calls through a malicious proxy (if Helicone is misconfigured)
- Trigger unlimited research workflows by directly calling the endpoint

**Code Evidence:**
```typescript
// src/app/api/workflows/[...any]/route.ts
export const { POST } = serveMany({
  "start-research": startResearchWorkflow,
  "gather-search-queries": gatherSearchQueriesWorkflow,
});
```

The catch-all `[...any]` route matches any subpath under `/api/workflows/`, which could be broader than intended.

**Impact:** Potential unauthorized workflow execution if Upstash signature validation fails.

**Remediation:**
- Verify that Upstash QStash signature validation is enabled and the signing secret is properly configured
- Consider narrowing the route pattern from `[...any]` to specific known paths
- Add defense-in-depth validation of `StartResearchPayload` (e.g., validate `sessionId` exists and belongs to a valid user)

---

### FINDING 6: Rate Limiting Bypass in Non-Production or Misconfigured Environments

**File:** `src/lib/limits.ts:13-23, 66-68`
**Severity:** MEDIUM
**CWE:** CWE-770 (Allocation of Resources Without Limits)

**Description:**
Rate limiting is **completely disabled** in three scenarios:
1. When `NODE_ENV !== "production"` (line 13)
2. When Upstash Redis is not configured (line 66-68)
3. When `clerkUserId` is null/undefined (line 66)

In all three cases, the `fallbackResult` is returned with `success: true`, allowing unlimited research requests.

**Attack Path:**
1. If the application is deployed without Redis configuration, all rate limits are bypassed
2. If somehow `NODE_ENV` is not set to "production" in a live environment, no rate limiting applies
3. If `clerkUserId` is missing (e.g., unauthenticated user), unlimited requests are allowed

**Code Evidence:**
```typescript
// src/lib/limits.ts:66-68
if (!ratelimit || !byokRateLimit || !clerkUserId) {
  return fallbackResult;  // { success: true, ... }
}
```

**Impact:** Complete bypass of rate limiting, enabling unlimited API consumption and cost exposure.

**Remediation:**
- Default to DENY (fail-closed) when rate limiting infrastructure is unavailable
- Add a hard cap on total requests per user per day at the database level
- Log and alert when rate limiting is bypassed

---

## LOW Severity Findings

### FINDING 7: Error Information Leakage in validate-key Response

**File:** `src/app/api/validate-key/route.ts:35`
**Severity:** LOW
**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)

**Description:**
The error response includes `error.message` directly from the Together AI SDK, which may contain internal details about the API infrastructure.

```typescript
JSON.stringify({ message: "API key is invalid", error: error.message })
```

**Impact:** Minor information disclosure. Could reveal internal API endpoint URLs, rate limit details, or SDK version information.

**Remediation:** Return only a generic error message without `error.message`.

---

### FINDING 8: Excessive CORS Configuration on PDF Endpoint

**File:** `src/app/api/pdf/route.ts:62-71`
**Severity:** LOW (informational)
**CWE:** CWE-942 (Permissive Cross-domain Policy with Trusted Domains)

**Description:**
The PDF endpoint sets overly permissive CORS headers (`Access-Control-Allow-Origin: *`) on a POST endpoint that generates content. While this is mitigated by the fact that the response is a PDF blob, the wildcard CORS on a POST endpoint is unusual.

```typescript
headers.set("Access-Control-Allow-Origin", "*");
headers.set("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
```

**Impact:** Any website can make cross-origin POST requests to this endpoint. Combined with the SSRF vulnerability (Finding 1), this makes exploitation from a malicious webpage trivial.

**Remediation:** Restrict CORS to your own domain origin only.

---

## Summary Matrix

| # | Finding | Severity | CWE | File |
|---|---------|----------|-----|------|
| 1 | Unauthenticated SSRF via PDF endpoint | HIGH | CWE-918 | `src/app/api/pdf/route.ts` |
| 2 | Unauthenticated research trigger | HIGH | CWE-306 | `src/app/api/storeAnswers/route.ts` |
| 3 | IDOR — unauthenticated research data access | HIGH | CWE-639 | `src/app/api/research/route.ts` |
| 4 | Unauthenticated API key validation | MEDIUM | CWE-306 | `src/app/api/validate-key/route.ts` |
| 5 | Workflow endpoint request validation | MEDIUM | CWE-94 | `src/app/api/workflows/[...any]/route.ts` |
| 6 | Rate limiting bypass | MEDIUM | CWE-770 | `src/lib/limits.ts` |
| 7 | Error information leakage | LOW | CWE-209 | `src/app/api/validate-key/route.ts` |
| 8 | Excessive CORS on PDF endpoint | LOW | CWE-942 | `src/app/api/pdf/route.ts` |

---

## Positive Security Controls Observed

1. **Clerk Authentication** — Used correctly on `/api/chats`, `/api/cancel`, and `/api/user/limits`
2. **Ownership Verification** — `/api/cancel` correctly checks `researchEntry.clerkUserId !== userId`
3. **Drizzle ORM** — All database queries use parameterized queries, preventing SQL injection
4. **Zod Schema Validation** — Used for AI-generated outputs (research plans, search results, stream events)
5. **Rate Limiting** — Present for authenticated users in production (1 per day, 15/day for BYOK)
6. **Input Truncation** — Search queries are truncated to 400 chars in `gather-search-workflow.ts:87-89`
7. **Exa Moderation** — Web search uses `moderation: true` to filter harmful content
8. **Research Budget Limit** — Max 3 iterations enforced in `start-research-workflow.ts:42`
9. **Benchmark Endpoint Protection** — Only allowed in non-production (`NODE_ENV !== "production"`)
