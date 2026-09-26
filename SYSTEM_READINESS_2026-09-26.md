# AHA System Readiness Review — 26 September 2026

## Result

- Technical readiness for a controlled real-user pilot: **91%**
- Readiness for an unrestricted public launch: **84%**
- Recommendation: keep the initial rollout controlled until backup/restore, monitoring alerts, legal review and a real-account end-to-end run are signed off.

## Railway database inventory and cleanup

### Auth database

| Table | Status | Purpose |
| --- | --- | --- |
| `users` | Keep | Account, password/PIN hashes and legal acceptance evidence |
| `refresh_tokens` | Keep + expiry cleanup | Refresh session rotation and revocation |
| `family_connections` | Keep | Elderly/caregiver relationships |
| `password_reset_tokens` | Keep + expiry cleanup | One-time password reset links |
| `login_attempts` | Keep + 24-hour cleanup | Distributed credential throttling |
| `auth_audit_events` | Keep + configured retention | Security audit evidence |

The historical mock OTP used an in-memory `Map`; it did not create an OTP table. Source history and current migrations contain no `otp_codes` or `otp_requests` table. The fixed `123456` code, OTP service/config and five legacy OTP routes are absent from active source. Production checks returned `404` for:

- `/auth/request-otp`
- `/auth/verify-otp`
- `/auth/login-otp`
- `/auth/register`
- `/auth/me/change-phone`

The auth migration now removes expired/used password-reset records, old expired/revoked refresh tokens and login-attempt rows older than 24 hours. It deliberately does not delete accounts, active sessions, family links or audit evidence.

### Reminder database

Keep `reminders` and `reminder_logs`; both support active features and scheduler reliability evidence.

### Notification database

Keep `notifications` and `push_subscriptions`; both support notification history, emergency events and Web Push.

## Routing and pages

The production build contains only the expected application routes. The primary navigation remains exactly five destinations: Home, Reminders, Voice, Notifications and Emergency. Profile stays in the header. Family remains an active contextual route and is linked from Home. `/login` is kept only as a compatibility redirect to `/`; it is not displayed in navigation. Unknown routes use the Next.js 404 page.

Public legal routes added:

- `/privacy-policy`
- `/terms-of-service`
- `/cookies-policy`

Protected feature pages verify the authenticated session and redirect unauthenticated users to `/`.

## Registration and validation

Validated on both frontend and backend:

- Thai phone number: exactly 10 digits and starts with `0`
- First and last name: required, 1–50 characters, control/angle-bracket characters rejected
- Email: required, normalized, valid format, maximum 254 characters, unique in the database
- Username: 4–30 English letters/digits, case-insensitive uniqueness
- Password: 12–72 UTF-8 bytes, includes an English letter and a number, confirmation must match
- PIN: exactly four digits, confirmation must match, hashed with versioned server-side pepper
- Role: only `elderly` or `caregiver`
- Age: elderly accounts must provide an integer from 1–120; caregiver age is optional but validated if present
- Terms: explicit acceptance is mandatory
- Duplicate phone, username and email return `409`
- Registration has both edge and database-backed rate limits

New accounts store `terms_accepted_at`, `terms_version` and `privacy_version` using legal version `2026-09-26`.

## Legal and cookie UI

- Profile & Settings now shows the exact copyright text: `© 2026 ahahealth.online - สงวนลิขสิทธิ์`.
- Profile and registration link to readable Privacy Policy and Terms of Service pages.
- Cookie Consent displays the requested message, an Accept button and an accessible top-right close button.
- Accept persists consent and its timestamp. Closing with `X` suppresses the banner only for the current browser session and does not record consent.
- The cookie policy documents session cookies, local/session storage and the current absence of advertising/third-party analytics cookies.

## Verification evidence

- Frontend lint: pass, no warnings/errors
- Frontend production build: pass, 17 routes generated
- Auth tests: 27/27 pass
- Reminder tests: 7/7 pass
- Notification tests: 5/5 pass
- Total automated tests: 39/39 pass
- Production dependency audit: 0 known vulnerabilities in all four Node projects
- Live service health: frontend, Auth, Reminder and Notification returned HTTP 200
- Live registration endpoint is enabled and returns structured validation errors

## Remaining launch gates

1. Perform and record a Railway backup/restore drill for all three databases.
2. Create a disposable real account and run register → login → refresh → logout → password reset → account deletion/support workflow.
3. Add uptime/error alerts and a named incident-response owner.
4. Obtain Thai PDPA/legal review of the policies and define a timed account-deletion SLA.
5. Run accessibility and multi-device acceptance tests with elderly users.
