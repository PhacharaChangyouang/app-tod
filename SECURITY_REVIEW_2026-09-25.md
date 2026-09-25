# AHA Security Review and Password-Only Authentication Migration

**Review date:** 25 September 2026 (Asia/Bangkok)  
**Repository:** `PhacharaChangyouang/app-tod`  
**Review branch:** `security/pre-release-hardening-2026-09-25`  
**Scope:** Web frontend, Flutter client, Auth, Reminder, Notification, database migrations, Docker configuration, dependency manifests, and non-destructive checks against the deployed services.

## 1. Executive summary

This revision removes OTP and legacy four-digit PIN authentication from every active application surface. AHA now exposes password registration, password login, password reset, token refresh, and logout only. OTP configuration, in-memory OTP storage, OTP/PIN controllers, API routes, web controls, and Flutter OTP/PIN screens have been removed.

The review also identified and closed a profile authorization issue that allowed a signed-in user to submit a different account role. Account roles are now immutable through the profile API. Password requirements and token lifetimes were tightened because the application is temporarily operating without a second authentication factor.

**Release decision:** suitable for local development and a controlled staging test with synthetic data. It is **not approved for unrestricted public production or real sensitive health data** until the residual risks in section 8 are resolved and the staging checklist in section 10 passes.

This report records evidence from source review and automated, build, dependency, and non-destructive API checks. It is not a guarantee that no vulnerability exists and is not a substitute for an independent penetration test.

## 2. Authentication decision

### Enabled

- `POST /auth/register-password`
- `POST /auth/login-password`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/refresh`
- `POST /auth/logout`
- Authenticated profile and family APIs

### Removed

- `POST /auth/request-otp`
- `POST /auth/verify-otp`
- `POST /auth/login-otp`
- Legacy `POST /auth/register`
- Legacy PIN login `POST /auth/login`
- `POST /auth/me/change-pin`
- OTP-based `POST /auth/me/change-phone`
- OTP/PIN web controls and client methods
- OTP request, OTP verification, PIN setup, and PIN login Flutter screens
- `OTP_MOCK_MODE`, `OTP_MOCK_CODE`, and OTP expiry configuration
- In-memory OTP storage and OTP logging code

Requests to the removed routes now receive HTTP `404` and cannot reach authentication logic.

## 3. Security changes in this revision

| Control | Change | Security effect |
|---|---|---|
| Authentication surface | Removed OTP and legacy PIN routes and code | Eliminates fixed/mock OTP exposure and the 10,000-value PIN credential space |
| Password policy | New and reset passwords require 12–72 characters with letters and numbers | Raises the cost of online and offline guessing |
| Access token lifetime | Reduced default and local Compose value from 7 days to 15 minutes | Limits exposure after access-token theft |
| Refresh token lifetime | Reduced from 30 days to 7 days | Reduces long-lived session exposure |
| Refresh token storage | Continues to store only SHA-256 token hashes in PostgreSQL | Raw refresh tokens are not retained server-side |
| Password reset | 32-byte random token, SHA-256 at rest, 15-minute expiry, single use, revokes all sessions | Limits reset-token replay and invalidates existing sessions after reset |
| Role authorization | Profile updates no longer accept or update `role` | Prevents self-service role escalation |
| Phone changes | OTP phone-change route removed; phone is read-only in the current UI | Avoids an unverified account-recovery path |
| Public registration | Production registration is closed unless `REGISTRATION_ENABLED=true` is explicitly set | Limits unverified public account creation during controlled rollout |
| Existing PIN column | Migration makes `pin_hash` nullable; no route reads or writes it | Supports safe rollout without destructive schema removal |
| Mobile authentication | Flutter entry route now uses username/email and password | Removes mobile dependency on OTP/PIN endpoints |

## 4. Previously completed hardening retained

- Caregiver reminder operations verify an accepted elderly/caregiver relationship before mutation.
- `dosage=null` is normalized safely so reminder-time edits no longer crash in Safari.
- Auth, Reminder, Notification, SOS, and support endpoints have rate limits.
- JSON request bodies are limited to `32kb`.
- SQL uses parameterized queries in reviewed paths.
- Untrusted browser origins are rejected with HTTP `403` by the revised services.
- Express/Next.js identity headers are disabled and baseline browser security headers are set.
- Production startup rejects short secrets and identical access/refresh secrets.
- Docker Compose no longer contains hardcoded database or internal-service credentials.
- Current production dependency audits report zero known vulnerabilities.

## 5. Findings and disposition

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| AUTH-01 | Critical | Fixed/mock OTP could act as a shared credential if enabled incorrectly | Closed — OTP implementation and configuration removed |
| AUTH-02 | High | Four-digit PIN login provided a weak alternate authentication route | Closed — PIN login and PIN management routes removed |
| AUTH-03 | High | Profile payload could change the account role | Closed — role removed from profile mutation and covered by regression test |
| AUTH-04 | High | Access tokens were valid for up to seven days | Closed — reduced to 15 minutes by default and in Compose |
| AUTH-05 | Medium | Password minimum was eight characters in a password-only system | Closed — raised to 12 characters for registration and reset |
| AUTH-06 | Medium | OTP-based phone change remained reachable after login | Closed — endpoint and UI removed |
| AUTH-07 | High | Public self-registration had no verified email ownership step | Mitigated — production registration is closed by default; verified invitation/onboarding remains required |
| DATA-01 | High | Caregiver could potentially target another elderly user's reminder without relationship enforcement | Closed in the preceding hardening revision and covered by tests |
| APP-01 | High | `dosage=null` caused a client-side exception and blocked reminder edits | Closed and covered by regression test |
| SESSION-01 | High | Web tokens remain accessible to JavaScript through `localStorage` | Open — public production blocker; see section 8 |
| WEB-01 | Medium | Enforced Content Security Policy is not yet enabled | Open — requires removal/noncing of inline styles and scripts |
| RATE-01 | Medium | Rate limiting is process-local and can be bypassed across replicas/IP rotation | Open — use a shared Redis-backed limiter and account-aware controls |
| OPS-01 | High | Central audit logging, alerts, tested backup/restore, and incident response are incomplete | Open — public production blocker |

## 6. Verification evidence

| Verification | Result |
|---|---|
| Auth automated tests | Passed `9/9` across three suites |
| Removed OTP/PIN endpoint regression | Passed — all seven legacy endpoints return `404` |
| Password-login rate limit regression | Passed — repeated failures reach `429` |
| Role-mutation regression | Passed — submitted `role=caregiver` is ignored and stored role remains unchanged |
| Production registration guard | Passed — registration is `403` unless explicitly enabled |
| Reminder/Caregiver security tests | Passed `5/5` |
| Null dosage regression | Passed |
| Next.js lint | Passed with existing non-blocking hook and `<img>` warnings |
| Next.js production build | Passed; 14 static pages generated |
| `npm audit --omit=dev` — frontend | 0 known vulnerabilities |
| `npm audit --omit=dev` — auth-service | 0 known vulnerabilities |
| `npm audit --omit=dev` — reminder-service | 0 known vulnerabilities |
| `npm audit --omit=dev` — notification-service | 0 known vulnerabilities |
| Git diff whitespace validation | Passed |
| GitGuardian PR scan | Passed — no secrets present in the pull request |
| Flutter static analysis | Not executed in this environment because Flutter SDK is unavailable |
| Full Docker Compose integration | Not executed in this environment because Docker is unavailable |

The earlier live, non-destructive probes confirmed that health endpoints answered successfully, unauthenticated protected API requests returned `401`, and an SQL-injection-style login attempt was rejected. The deployed site does not contain this revision until the PR is merged and deployed.

## 7. Compatibility and migration impact

- Existing accounts that have a valid `password_hash` continue to use username/email and password.
- Accounts created only through the old OTP/PIN flow may not have a password or email. They are intentionally denied by password login and require an administrator-approved recovery or migration process before access is restored.
- Do not re-enable the old PIN endpoint as a migration shortcut.
- The migration retains existing `pin_hash` values but makes the column nullable. No active code reads the column. Destructive removal can occur later after backup and rollback planning.
- Phone changes are temporarily administrative because no verified replacement method is implemented.
- Flutter registration is not exposed in this revision. New accounts should be created through the reviewed web password-registration flow during controlled testing.

## 8. Residual risks and required controls

### Public-production blockers

1. Move web sessions away from JavaScript-readable `localStorage` to an architecture using `HttpOnly`, `Secure`, `SameSite` cookies, explicit CSRF protection, and a same-origin backend-for-frontend or gateway design.
2. Add an enforced Content Security Policy after removing or noncing inline scripts/styles.
3. Use a shared rate-limit store and add per-account throttling, suspicious-login detection, and alerting.
4. Implement verified, invitation-based onboarding or email verification before enabling production self-registration.
5. Implement centralized, tamper-resistant audit events for authentication failures, password resets, role/permission denials, caregiver medication changes, SOS, and administrative recovery. Never log passwords, tokens, or health payloads unnecessarily.
6. Complete encrypted backup/restore drills, retention/deletion policy, monitoring, escalation contacts, and an incident-response runbook.
7. Commission an independent penetration test before real sensitive health data is accepted.

### Password-only limitation

Removing OTP eliminates the insecure mock flow, but password-only authentication is still single-factor authentication. For a later stronger factor, prefer phishing-resistant WebAuthn/passkeys or hardware-backed authenticators rather than restoring the removed mock OTP implementation.

## 9. Data protection notes

- Use synthetic data in development and staging.
- Enforce TLS for every user and service connection outside a developer machine.
- Rotate `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_API_KEY`, database passwords, and any historical credentials before deployment.
- Use separate least-privilege database identities for each service in production.
- Do not expose PostgreSQL ports to a public network; published Compose ports are for local development only.
- Confirm that logs, support messages, notifications, and backups do not leak medication or identity data beyond their intended recipients.

## 10. Staging release checklist

- [ ] Deploy this exact revision to an isolated staging environment.
- [ ] Run database migrations and confirm `pin_hash` is nullable.
- [ ] Confirm every removed OTP/PIN route returns `404` through the public gateway.
- [ ] Confirm only password registration/login/reset/refresh/logout are reachable.
- [ ] Keep `REGISTRATION_ENABLED=false` or unset until controlled onboarding is approved.
- [ ] Verify access tokens expire after approximately 15 minutes and refresh tokens after 7 days.
- [ ] Verify a password reset revokes all existing refresh sessions.
- [ ] Verify a profile request containing `role` cannot change the stored role.
- [ ] Verify login failures return a generic message and repeated failures receive `429`.
- [ ] Test an existing password account and a legacy OTP/PIN-only account separately.
- [ ] Complete elderly/caregiver E2E tests for connection approval, reminder CRUD, null dosage edit, taken, snooze, notifications, and SOS.
- [ ] Rotate all production secrets and verify no secret appears in build logs or Git history scans.
- [ ] Confirm CORS rejection, security headers, TLS, logging redaction, alerts, and backup restoration.
- [ ] Keep the PR unmerged if any blocker above fails.

## 11. Rollback guidance

Application rollback is safe because the migration does not drop the legacy `pin_hash` column. Roll back application services and database migration together only after confirming schema compatibility. Do not roll back by re-enabling fixed OTP or PIN authentication. If password-only authentication blocks a legitimate legacy user, use a controlled administrator identity-verification and password-provisioning procedure.

## 12. Final assessment

The attack surface is materially smaller than before this revision: fixed/mock OTP, OTP memory state, OTP logging, PIN login, OTP phone changes, and profile role mutation are removed. Automated tests and builds pass for the components available in this environment. Nevertheless, the remaining JavaScript-readable web tokens, missing enforced CSP, process-local rate limits, and incomplete operational controls mean the system should remain in controlled staging with synthetic data. Public production approval requires closure of the blockers in section 8 and independent validation.
