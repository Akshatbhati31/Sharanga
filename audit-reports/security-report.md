# Sharanga / DyslexiMate — Security & Compliance Audit Report

**Audit Date:** November 20, 2026  
**Auditor:** Senior Security Auditor & Threat Modeling Specialist  
**Standard Framework:** OWASP Top 10 (2021), Children's Online Privacy (COPPA principles), Row Level Security (RLS) Review  

---

## 1. Executive Summary

The DyslexiMate application was reviewed from a security, privacy, and defensive engineering perspective. As an educational platform serving children with learning differences, strict isolation between child and parent privileges, protection of learning telemetry, and preservation of backend API quotas are critical imperatives.

Overall, the client-side data isolation, Supabase Row-Level Security (RLS) policies, and PIN lockout mechanisms are well-conceived. However, several high-impact security architectural risks require remediation—specifically regarding **unauthenticated serverless API routes**, **wildcard CORS headers**, and **unsalted client-side PIN hashing**.

---

## 2. Threat Modeling & OWASP Top 10 Assessment

### A01:2021 — Broken Access Control
- **Finding 1.1: Serverless API Endpoints Lack Authentication (High Risk)**
  - **Endpoints Affected:**
    - `/api/ai/generate-activity`
    - `/api/voice/synthesize`
    - `/api/tinyfish/search`
    - `/api/tinyfish/status`
  - **Vulnerability:** The Vercel serverless functions do not inspect incoming requests for a valid Supabase JWT or bearer token. Any external client on the internet can POST to these endpoints without signing in.
  - **Impact:** An attacker can script requests to consume Google Gemini AI quotas, TinyFish API search credits, and serverless compute budgets, resulting in denial of service and unexpected cloud billing.
  - **Remediation:** Verify the `Authorization: Bearer <jwt>` header against the Supabase Auth REST endpoint (`supabase.auth.getUser()`) before processing requests.

- **Finding 1.2: Supabase Row Level Security (RLS) Integrity (Verified Strong)**
  - **Assessment:** `supabase/schema.sql` and migration scripts enforce RLS across all primary tables:
    - `public.parent_profiles`: `auth.uid() = id` (SELECT, INSERT, UPDATE).
    - `public.child_profiles`: `auth.uid() = parent_id` (SELECT, INSERT, UPDATE, DELETE).
    - `public.learning_progress`: Verified via subquery `EXISTS (SELECT 1 FROM child_profiles cp WHERE cp.id = learning_progress.child_id AND cp.parent_id = auth.uid())`.
    - `public.practice_sessions`: Strict parent foreign-key checks.
  - **Status:** **PASS**. No unauthorized cross-tenant data leaks are possible via the direct Supabase client with the public anon key.

---

### A02:2021 — Cryptographic Failures
- **Finding 2.1: Unsalted SHA-256 PIN Hashing in Local Storage (Medium Risk)**
  - **Vulnerability:** In `src/services/storageService.ts`, the `hashPin()` function computes a bare `SHA-256` digest:
    ```typescript
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    ```
  - **Impact:** A 4-digit PIN has an entropy space of exactly 10,000 combinations (`0000` to `9999`). A compromised device or exported backup allows immediate reversal of the PIN in under 5 milliseconds via precomputed rainbow tables.
  - **Remediation:** Introduce a parent-specific cryptographic salt:
    ```typescript
    export async function hashPin(pin: string, salt: string): Promise<string> {
      const salted = `${salt}_${pin}_pinaka_secure`;
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salted));
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    ```

- **Finding 2.2: Secret Key Leakage & Environment Hygiene (Verified Strong)**
  - **Assessment:** `.env.example` strictly enforces separation between client-safe variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and secret server-side keys (`GEMINI_API_KEY`, `TINYFISH_API_KEY`). Neither secret key is prefixed with `VITE_`, preventing accidental exposure into frontend JS bundles.
  - **Static Code Scan:** No hardcoded production API tokens, private keys, or passwords were found in repository code.

---

### A05:2021 — Security Misconfiguration
- **Finding 3.1: Wildcard CORS on Serverless Functions (Medium Risk)**
  - **Vulnerability:** `api/ai/generate-activity.ts` and `api/voice/synthesize.ts` define:
    ```typescript
    const CORS_HEADERS = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
    };
    ```
  - **Impact:** Any malicious website can initiate background XMLHttpRequests / fetch calls from an unsuspecting visitor's browser to DyslexiMate's backend API.
  - **Remediation:** Replace `*` with an explicit whitelist:
    ```typescript
    const ALLOWED_ORIGINS = ['https://sharanga.vercel.app', 'http://localhost:5173'];
    const origin = req.headers.origin;
    const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    ```

- **Finding 3.2: Missing Content Security Policy (CSP) & Security Headers (Low Risk)**
  - **Vulnerability:** `vercel.json` contains route rewrites but lacks custom response security headers.
  - **Remediation:** Add HTTP security headers to `vercel.json`:
    ```json
    "headers": [
      {
        "source": "/(.*)",
        "headers": [
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "X-Frame-Options", "value": "DENY" },
          { "key": "X-XSS-Protection", "value": "1; mode=block" },
          { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
        ]
      }
    ]
    ```

---

### A07:2021 — Identification & Authentication Failures
- **Finding 4.1: Parent PIN Lockout & Session Protection (Verified Working)**
  - **Assessment:** The mandatory Parent PIN Gate enforces:
    - 5-attempt threshold before activating a 30-second lockout.
    - Accurate feedback displaying remaining attempts.
    - In-memory `isParentPortalUnlocked` flag preventing URL bypass upon page reload.
    - Two-step recovery modal verifying child profile ownership before allowing PIN reset.
  - **Status:** **PASS**. Successfully verified via automated Playwright tests.

---

## 3. Security Scorecard & Risk Matrix

| Risk Area | Severity | Likelihood | Impact | Status | Remediation Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Serverless API Auth** | High | High | High | Confirmed | P1 (Immediate) |
| **Wildcard CORS** | Medium | Medium | Medium | Confirmed | P2 (High) |
| **Unsalted PIN Hash** | Medium | Low | High | Confirmed | P2 (High) |
| **Supabase RLS Isolation** | Low | Low | Critical | **Secure** | Continuous Monitoring |
| **Environment Secrets** | Low | Low | Critical | **Secure** | Continuous Monitoring |
| **HTTP Security Headers** | Low | Medium | Low | Confirmed | P3 (Medium) |
