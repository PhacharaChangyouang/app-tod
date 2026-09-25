# AHA Pre-Production Security Review

**วันที่ตรวจ:** 25 กันยายน 2026 (Asia/Bangkok)

**Repository:** `PhacharaChangyouang/app-tod`  

**Branch:** `security/pre-release-hardening-2026-09-25`

**ขอบเขต:** Next.js web, Flutter client, Auth/Reminder/Notification services, PostgreSQL migrations, Nginx gateway, Docker configuration และ dependency manifests

## 1. Executive decision

รอบนี้ปิดช่องโหว่ระดับสูงที่ตรวจพบใน source code แล้ว รวมถึง token ใน `localStorage`, การไม่มี CSP, notification spoofing, Web Push SSRF, JWT validation ที่ไม่กำหนด issuer/audience, distributed credential throttling, password-reset race และ API Gateway route ผิด พร้อมรักษา phone+PIN flow ที่ผู้ใช้เดิมยังใช้งาน

**ผลตัดสิน ณ revision นี้:**

- Code พร้อม deploy ไป **isolated staging** เพื่อทำ migration และ end-to-end acceptance test
- ยัง **ไม่อนุมัติให้รับข้อมูลสุขภาพจริงแบบ public production** จนกว่ารายการ deployment/operations ในหัวข้อ 8 จะผ่านบน environment จริง
- ไม่สามารถรับรองว่า “ไม่มีช่องโหว่ 100%” ได้ การตรวจนี้เป็น secure code review และ automated regression testing ไม่ใช่ใบรับรอง penetration test จากบุคคลที่สาม

## 2. การแก้ปัญหาหลัก

### Caregiver แก้เวลาไม่ได้เมื่อ `dosage=null`

Safari เคยแสดง `null is not an object (evaluating 'u.dosage.trim')` เพราะ frontend เรียก `.trim()` กับ `null` ก่อนส่ง API ปัจจุบัน frontend และ Caregiver API normalize ด้วย `String(value ?? '').trim()` และมี regression test รองรับ `dosage=null`

### OTP removal and PIN compatibility

- ลบ OTP request/verify/login และ OTP-based registration/change-phone เท่านั้น
- OTP legacy routes ทั้ง 5 เส้นทางตอบ `404`
- ลบ OTP configuration และ service code
- คง `pin_hash`, `/auth/login` สำหรับเบอร์โทร+PIN และ `/auth/me/change-pin`
- หน้าสมัครและ API บังคับ `pin`/`confirmPin` ให้เป็นตัวเลข 4 หลักและต้องตรงกัน
- PIN เดิมที่เป็น bcrypt ยังใช้งานได้ และจะอัปเกรดเป็น versioned bcrypt+server pepper หลัง login สำเร็จ
- PIN login ใช้ generic error, dummy hash, PostgreSQL per-account/per-network throttle และ audit event

### Canonical login URL

- หน้าเข้าสู่ระบบและสมัครสมาชิกแสดงที่ root path (`https://ahahealth.online`) โดยไม่เพิ่ม `/login` หรือ query string ระหว่างสลับฟอร์ม
- unauthorized redirect จากหน้าภายในส่งกลับ `/` โดยตรง
- `/login` เดิมยังรองรับ bookmark และลิงก์เก่า โดย redirect `307` กลับ `/`
- path ของหน้าหลังเข้าสู่ระบบยังคงเดิม เพื่อรักษา Refresh, Back/Forward และ deep link ไม่ให้พัง

## 3. Security controls ที่เพิ่มในรอบสุดท้าย

| พื้นที่ | การเปลี่ยนแปลง | ผลด้านความปลอดภัย |
|---|---|---|
| Web session | เพิ่ม same-origin Next.js BFF; token อยู่ใน `HttpOnly`, `Secure`, `SameSite=Strict`, `__Host-` cookies | JavaScript อ่าน access/refresh token ไม่ได้ และลบ token เก่าจาก browser storage อัตโนมัติ |
| CSRF | mutation ผ่าน BFF ต้องมี same-origin `Origin`/`Sec-Fetch-Site` และ `X-AHA-Request` | ปฏิเสธ cross-site mutation ด้วย `403` |
| XSS | บังคับ CSP แบบ nonce + `strict-dynamic`; ไม่มี production `unsafe-eval`/`unsafe-inline` ใน `script-src` | ลดโอกาสรัน injected script; runtime test ยืนยันทุก script tag มี nonce |
| Session rotation | access 15 นาที, refresh 7 วัน, refresh token มี `jti`, hash ใน DB และ rotate เมื่อใช้งาน | ลด replay และ session collision |
| JWT | บังคับ `HS256`, issuer `aha-auth-service`, audience แยก access/refresh และจำกัด token size | ปฏิเสธ token ที่ signed ถูกแต่ claim/policy ไม่ครบ |
| Password | bcrypt cost 12, 12–72 UTF-8 bytes, dummy-hash compare เมื่อไม่พบบัญชี | ลด offline guessing และ timing-based username enumeration |
| PIN 4 หลัก | bcrypt cost 12 + stable server pepper, รองรับ legacy hash, login/change จำกัด 5 ครั้งต่อบัญชี/25 ครั้งต่อ network ใน 15 นาที | ลด online brute force และรักษาความเข้ากันได้กับผู้ใช้เดิม |
| Login abuse | process limiter + PostgreSQL per-account/per-network limiter + hashed audit actor | ป้องกัน brute force ข้ามหลาย process ได้ใน auth service |
| Password reset | token 32 bytes, hash at rest, 15 นาที, atomic single-use, generic response, session revocation | ปิด reset replay/race และลด account enumeration |
| Authorization | profile เปลี่ยน role ไม่ได้; internal family routes ต้องเป็น system; caregiver mutation ตรวจ accepted relationship | ป้องกัน role escalation และ IDOR ที่ตรวจพบ |
| Notification | ผู้ใช้ทั่วไปสร้าง system notification ไม่ได้; SOS ตรวจผู้รับ/พิกัด/ความยาว | ป้องกัน notification spoofing และ input abuse |
| Web Push | allowlist เฉพาะ provider endpoint ที่รู้จัก | ป้องกัน SSRF ไป internal/private endpoints |
| Input validation | UUID, เวลา, วัน, วันที่, dosage, medicine name, push fields และ emergency location | ลด malformed-query errors และ payload abuse |
| API Gateway | แก้ path forwarding, เพิ่ม route caregiver/push/support, strip internal key จาก public traffic | ปิดเส้นทางผิดและป้องกัน external service-key injection |
| Database | TLS certificate verification เป็นค่าเริ่มต้นใน production; pool/query timeout | ลด MITM และ resource exhaustion |
| Containers | non-root, read-only filesystem, drop capabilities, no-new-privileges; DB ports bind localhost | ลด container escape impact และ public DB exposure |
| Mobile | HTTPS required ใน release, refresh rotation อัตโนมัติ, cleartext disabled, backup disabled | ป้องกัน token transport ผ่าน HTTP และแก้ session หมดอายุหลัง 15 นาที |
| Supply chain | production และ full npm audit เป็นศูนย์ | ไม่พบ advisory ที่ npm รายงาน ณ วันที่ตรวจ |

## 4. Browser session architecture

Web browser เรียกเฉพาะ `/api/bff/...` บน origin เดียวกัน BFF เป็นผู้ถือ access/refresh cookies และส่ง Bearer token ไปยัง backend แบบ server-to-server ส่วน Flutter ใช้ Bearer token ใน `flutter_secure_storage` และ refresh แบบ single-flight

BFF มี route/method allowlist จึงไม่ทำหน้าที่เป็น open proxy และจะไม่ส่ง `accessToken` หรือ `refreshToken` กลับใน JSON response

## 5. Automated verification evidence

| การตรวจ | ผล |
|---|---|
| Auth tests | ผ่าน 24/24 — 7 suites |
| Reminder/Caregiver tests | ผ่าน 7/7 |
| Notification tests | ผ่าน 5/5 |
| รวม backend security regression | ผ่าน 36/36 |
| Legacy OTP routes | 5 routes ตอบ `404`; phone+PIN routes ยังเปิดตามข้อกำหนด |
| Role mutation / caregiver IDOR | ปฏิเสธตามสิทธิ์ |
| JWT ไม่มี issuer/audience | `401` |
| Notification spoofing | `403` |
| Web Push endpoint ไป `127.0.0.1` | `400` ก่อน query/ส่ง request |
| Invalid UUID/time/location | `400` ก่อน mutation |
| Null dosage caregiver flow | ผ่าน |
| Next.js lint | ผ่าน ไม่มี error |
| Next.js production build | ผ่าน 14 dynamic routes/pages + BFF + middleware |
| Canonical login URL runtime | `/` ตอบ `200`; `/login` ตอบ `307` ไป `/`; security headers ยังอยู่ครบ |
| CSP runtime inspection | nonce ใน CSP ตรงกับ HTML และ script ไม่มี nonce = 0 |
| BFF CSRF/allowlist/token stripping | ตรวจ runtime ผ่าน |
| BFF phone+PIN login | `200`, token ถูก strip จาก JSON, session อยู่ใน Secure/HttpOnly/SameSite cookies |
| Production PIN secret guard | startup ปฏิเสธ environment ที่ไม่มี `PIN_PEPPER` |
| BFF ไม่มี production upstream config | fail closed ด้วย `503`; ไม่ fallback ไป localhost |
| BFF ติดต่อ upstream ไม่ได้ | ตอบ JSON `502` โดยไม่เปิดเผย token/URL |
| `npm audit --omit=dev` ทั้ง 4 packages | 0 vulnerabilities |
| full `npm audit` ทั้ง 4 packages | 0 vulnerabilities |
| Git diff whitespace check | ผ่าน |
| source scan | ไม่พบ active OTP route, active browser token persistence หรือ credential จริง |

## 6. สิ่งที่ตรวจพบระหว่างทดสอบและแก้ก่อนส่งมอบ

1. CSP รุ่นแรกทำให้ Next.js static HTML ไม่มี nonce และจะบล็อก JavaScript ทั้งหน้า — แก้ Root Layout เป็น dynamic, ส่ง nonce จาก middleware และตรวจ HTML runtime ซ้ำจน script ทุกตัวมี nonce
2. API Gateway เดิม strip `/auth/` prefix โดยไม่ตั้งใจ — แก้ `proxy_pass` ให้ backend ได้ path ที่ถูกต้อง
3. ผู้ใช้ทั่วไปเรียก `POST /api/notifications` เพื่อสร้างข้อความเลียนแบบ system event ได้ — จำกัด endpoint เป็น internal-service only
4. Web Push endpoint รับ HTTPS URL ใดก็ได้ — เพิ่ม provider allowlist เพื่อปิด SSRF
5. Mobile access token อายุ 15 นาทีแต่ไม่มี refresh flow — เพิ่ม automatic single-flight refresh และแก้ gateway family/SOS paths
6. password reset ใช้ SELECT ก่อน mark-used ทำให้มี race — เปลี่ยนเป็น atomic `UPDATE ... RETURNING` พร้อม `FOR UPDATE SKIP LOCKED`
7. production database TLS เดิมไม่ verify certificate ในบาง service — เปลี่ยนเป็น verify by default และรองรับ `DB_CA_CERT`

## 7. Migration and compatibility impact

- Migration เป็นแบบ additive และไม่ลบ/เขียนทับ `pin_hash` ของผู้ใช้เดิม
- หาก production มีผู้ใช้แล้วแต่ไม่พบคอลัมน์ `pin_hash` migration จะ fail closed และสั่ง restore จาก backup แทนการสร้างคอลัมน์ว่าง
- Auth service รัน idempotent schema migration ก่อนเปิด port รวมตาราง login throttling และ audit events
- บัญชี password เดิมใช้ต่อได้
- บัญชีเดิมที่มี `pin_hash` ยัง login ด้วยเบอร์โทร+PIN ได้ แม้ไม่มี `password_hash`
- ต้องกำหนด `PIN_PEPPER` แบบสุ่มอย่างน้อย 48 ตัวอักษรและเก็บค่าให้คงที่; การเปลี่ยนค่านี้ทำให้ PIN hash รุ่นใหม่ตรวจไม่ได้
- production self-registration ปิดโดยค่าเริ่มต้น เว้นแต่ตั้ง `REGISTRATION_ENABLED=true`
- Web deployment ต้องกำหนด server-only `AUTH_API_URL`, `REMINDER_API_URL`, `NOTIFICATION_API_URL`; ห้ามใช้ `NEXT_PUBLIC_*` สำหรับ upstream เหล่านี้

## 8. Production gates ที่ยังต้องยืนยันบน environment จริง

รายการต่อไปนี้ไม่สามารถพิสูจน์จาก source code หรือ sandbox นี้ และเป็น **release gate** ไม่ใช่ข้อเสนอเสริม:

1. Deploy revision นี้ใน staging แล้วผ่าน E2E ด้วยบัญชี elderly/caregiver จริงสองบัญชี: login, connect, add/edit/delete medicine, null dosage, taken, snooze, push, logout และ SOS
2. Rotate `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_API_KEY`, database passwords, Resend และ VAPID keys; สร้าง `PIN_PEPPER` คงที่แยกต่างหาก ทุก secret ต้องสุ่มอย่างน้อย 48 ตัวและไม่ซ้ำ
3. ยืนยัน Railway/Vercel/private network, TLS certificate chain, `DB_CA_CERT`, public DNS และไม่มี backend/database port ที่ไม่จำเป็นเปิดสาธารณะ
4. เปิด managed WAF/edge rate limiting หาก scale มากกว่าหนึ่ง gateway และตั้ง alert สำหรับ login block, `401/403/429`, SOS failure, DB failure และ error spike
5. ทำ encrypted backup และ restore drill สำเร็จ พร้อม retention/deletion policy, incident owner และ breach-response runbook
6. ตรวจ privacy/PDPA: consent, purpose, data minimization, support-message retention, log access และกระบวนการลบข้อมูล
7. รัน Flutter analyzer/build บน CI ที่มี Flutter SDK และทดสอบ Android/iOS จริง; sandbox นี้ไม่มี Flutter SDK
8. รัน full Docker/staging integration; sandbox นี้ไม่มี Docker daemon
9. ทำ independent authenticated penetration test ก่อนรับข้อมูลสุขภาพจริงจากสาธารณะ
10. หากต้องเปิดสมัครสาธารณะ ให้เพิ่ม verified invitation/email onboarding ก่อนเปิด `REGISTRATION_ENABLED=true`

## 9. Deployment checklist

- [ ] Backup ก่อน migration และยืนยันว่า `pin_hash` ของผู้ใช้เดิมยังอยู่ครบ
- [ ] ตรวจจำนวน `pin_hash IS NULL` และทดสอบบัญชีเดิมในสำเนา staging; หากคอลัมน์เคยถูกลบต้อง restore hash จาก backup ก่อน deploy
- [ ] Deploy frontend และ backend ทั้ง 3 service จาก commit เดียวกัน
- [ ] ตั้ง `NODE_ENV=production`, HTTPS `FRONTEND_URL` และ server-only upstream URLs
- [ ] ตั้ง secret ใหม่ตามข้อ 8 และตรวจ startup fail-fast ผ่าน
- [ ] ตรวจ OTP routes ผ่าน public gateway เป็น `404` และทดสอบ phone+PIN login ของบัญชีเดิม
- [ ] ทดสอบสมัครสมาชิกว่า PIN/ยืนยัน PIN ไม่ตรงกันถูกปฏิเสธทั้ง Web และ API
- [ ] ตรวจ login response ของ web ไม่มี token ใน body/localStorage และ cookie เป็น `HttpOnly; Secure; SameSite=Strict`
- [ ] ตรวจ CSP ไม่มี violation ที่ทำให้ login/dashboard/push ใช้งานไม่ได้
- [ ] ทดสอบ login ผิดจนได้ `429` และตรวจ audit event โดยไม่มี password/token/health payload
- [ ] ทดสอบ caregiver ที่ไม่เชื่อมต่อไม่สามารถอ่าน/แก้/ลบ reminder
- [ ] ทดสอบ logout แล้วอุปกรณ์ไม่รับ push ของบัญชีเดิม
- [ ] ทดสอบ backup restore, monitoring และ on-call notification
- [ ] ให้ security reviewer อิสระลงนามก่อน production go-live

## 10. Final assessment

จากหลักฐานใน repository ช่องโหว่ที่ตรวจพบใน application code รอบนี้ถูกปิดและ regression tests ผ่านทั้งหมด อย่างไรก็ตามสถานะ “ปลอดภัยพอสำหรับข้อมูลสุขภาพจริง” ต้องอาศัยหลักฐานจาก staging/production infrastructure, mobile build, backup/restore, monitoring และ penetration test ด้วย จึงต้องคงสถานะ **staging-ready, production approval pending external gates** จนกว่าหัวข้อ 8 และ 9 จะผ่านครบ

## 11. Production incident and verification addendum — 26 September 2026

### Incident: password and PIN login returned `503`

**Impact:** ผู้ใช้เดิมเข้าสู่ระบบผ่านเว็บไม่ได้ทั้งแบบบัญชี/รหัสผ่านและเบอร์โทรศัพท์/PIN ข้อมูลบัญชีและ `pin_hash` ไม่ได้ถูกลบหรือแก้ไข

**Root cause:** Next.js BFF ทำงานแบบ fail closed ใน production แต่ Railway frontend ยังไม่มี server-only variables `AUTH_API_URL`, `REMINDER_API_URL` และ `NOTIFICATION_API_URL` จึงตอบ `503 Service unavailable` ก่อนส่งคำขอถึง Auth service

**Remediation:**

- เพิ่ม server-only upstream URLs ทั้งสามค่าให้ frontend โดยคง `NEXT_PUBLIC_*` ออกจากเส้นทาง BFF
- เปิด `NODE_ENV=production` และตั้ง `PIN_PEPPER` แบบสุ่มคงที่ให้ Auth service
- rotate `JWT_SECRET`, `JWT_REFRESH_SECRET` และ `INTERNAL_API_KEY` เป็นค่าสุ่ม 512-bit; ซิงก์ JWT/internal key ให้ backend services ที่เกี่ยวข้อง
- ตั้ง `DB_SSL_REJECT_UNAUTHORIZED=false` บน Railway services ที่เชื่อม PostgreSQL ด้วย TLS chain แบบ self-signed โดยยังคงเปิด TLS; ไม่ได้ตั้ง `DB_SSL=false`
- เปิด production guard ให้ Reminder และ Notification และ deploy configuration ที่สอดคล้องกัน

การ rotate JWT ทำให้ session เก่าหมดอายุและผู้ใช้ต้องเข้าสู่ระบบใหม่หนึ่งครั้ง แต่ไม่กระทบบัญชี รหัสผ่าน PIN หรือข้อมูลยา

### Production verification evidence

| การตรวจบน production | ผล |
|---|---|
| Railway project health | `7/7 services online` |
| Auth `/health` | `200` |
| Reminder `/health` | `200` |
| Notification `/health` | `200`; push configured |
| Password login ผ่าน same-origin BFF ด้วยบัญชีจำลองที่ไม่มีอยู่ | `401` และ generic error; ไม่ใช่ `503` |
| PIN login ผ่าน same-origin BFF ด้วยเบอร์จำลองที่ไม่มีอยู่ | `401` และ generic error; ไม่เปิดเผยว่ามีบัญชีหรือไม่ |
| PIN account throttle | ตอบ `429` หลังถึงเกณฑ์ 5 ครั้งใน 15 นาที |
| CSRF guard | คำขอ mutation ที่ไม่มี same-origin headers ถูกปฏิเสธ `403` |
| Security headers | CSP nonce/strict-dynamic, HSTS, `nosniff`, `DENY`, Permissions-Policy และ Referrer-Policy อยู่ครบ |
| Backend regression | Auth 24/24, Reminder 7/7, Notification 5/5 — รวม 36/36 |
| Frontend | lint ผ่าน และ production build สำเร็จ |
| Production dependency audit | `npm audit --omit=dev` ทั้ง 4 packages: 0 vulnerabilities |
| Source scan | ไม่พบ tracked default credential, active OTP route, XSS sink หรือ browser token persistence |

### Release decision after recovery

ระบบเว็บและ backend กลับมาให้บริการตามปกติสำหรับ controlled pilot และปัญหา login `503` ได้รับการแก้ไขแล้ว หลักฐานนี้ยืนยัน availability และ controls ที่ทดสอบได้ แต่ไม่ใช่คำรับรองว่าไม่มีช่องโหว่ทุกประเภท บัญชีจริงยังควรทดสอบ login ทั้งสองวิธีและ caregiver edit-reminder flow โดยเจ้าของระบบ และ external gates เรื่อง backup/restore, monitoring, PDPA, mobile device verification และ independent authenticated penetration test ยังต้องดำเนินการก่อนเปิดรับข้อมูลสุขภาพจริงในวงกว้าง
