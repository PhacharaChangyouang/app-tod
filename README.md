# AHA - AI Health Assistant

> **Security/readiness update — 25 September 2026:** the codebase has passed the
> non-destructive checks documented in [Security and pre-release test report](#security-and-pre-release-test-report--25-september-2026).
> Application-code hardening is complete for this revision. It is ready for an
> isolated staging deployment, but production approval still requires the environment,
> backup/restore, monitoring, mobile build, E2E and independent penetration-test gates in the report.
>
> รายงานการถอด OTP/PIN และทบทวนความปลอดภัยล่าสุดอยู่ที่
> [SECURITY_REVIEW_2026-09-25.md](SECURITY_REVIEW_2026-09-25.md)

ระบบช่วยจัดการยาและการดูแลผู้สูงอายุ โดยมีสองเป้าหมายคู่ขนาน:

1. `mobile_app/` เป็น Flutter app สำหรับพัฒนาและเตรียม build เป็น Android/iOS ในอนาคต
2. `frontend/` เป็น React/Next.js web app สำหรับ deploy และทดสอบกับผู้ใช้กลุ่มเล็กก่อนขึ้น Store

## สถานะปัจจุบัน

**Phase 2 - Controlled Web Pilot / Sprint 3-4**

ฟังก์ชันหลักของ Flutter app เชื่อมกับ backend และทดสอบ end-to-end บนเครื่องแล้ว:

- สมัครสมาชิกและเข้าสู่ระบบด้วยชื่อผู้ใช้/อีเมลและรหัสผ่านเท่านั้น
- ถอด OTP และการเข้าสู่ระบบด้วย PIN ออกจาก Web, Mobile และ Auth API แล้ว
- บัญชี `elderly` และ `caregiver`
- เลือกอายุได้ช่วง 0-100 สำหรับทั้งสอง role
- เพิ่ม, ดู และลบรายการยา/นัดหมาย
- บันทึกวันและเวลาที่ต้องเตือน
- เชื่อมสมาชิกครอบครัวด้วยเบอร์โทร และยอมรับ/ปฏิเสธคำขอ
- หน้า caregiver สำหรับยา, ครอบครัว และประวัติการแจ้งเตือน
- SOS และ notification history
- แจ้งเตือนยาไปยังเจ้าของยาและสมาชิกครอบครัวที่เชื่อมแล้ว
- กล่องแจ้งเตือนแบบ animated ในหน้า Home ของผู้สูงอายุและผู้ดูแล
- หน้าจอหลักและฟอร์มสำคัญรองรับการ scroll บนจอเล็ก

## แพลตฟอร์ม

### Flutter mobile app

โค้ดสำหรับแอพในอนาคตอยู่ที่ [mobile_app](mobile_app) และยังต้องเก็บไว้ใน repository:

- source: `mobile_app/lib/`
- Android project: `mobile_app/android/`
- iOS project: `mobile_app/ios/`
- dependencies/build config: `mobile_app/pubspec.yaml`

ทดสอบ web build ในเครื่อง:

```powershell
cd mobile_app
flutter build web
flutter run -d edge --web-port 5173
```

ทดสอบจากโทรศัพท์บน Wi-Fi เดียวกับคอมพิวเตอร์:

```powershell
cd mobile_app
flutter run -d web-server --web-hostname 0.0.0.0 --web-port 5173
```

เปิดจากโทรศัพท์ด้วย `http://IP-ของคอมพิวเตอร์:5173` ห้ามใช้ `localhost` หรือ `127.0.0.1` จากโทรศัพท์

### React web app

โค้ดเว็บอยู่ที่ [frontend](frontend) และใช้ Next.js บน React:

```powershell
cd frontend
npm install
npm run dev
```

เว็บ React เป็นเป้าหมายหลักของ controlled pilot และมีหน้า reminders, caregiver, family, notification, profile และ SOS ผ่าน same-origin BFF

## Backend architecture

```text
Browser -> Next.js BFF (HttpOnly session) -> private backend services
Flutter -> HTTPS Nginx API gateway -> backend services

auth-service :3001 -> auth PostgreSQL
reminder-service :3002 -> reminder PostgreSQL
notification-service :3003 -> notification PostgreSQL
```

บริการที่มีอยู่:

- `auth-service`: password login/reset, JWT access/refresh token, user และ family connections
- `reminder-service`: CRUD รายการยา, selected days, scheduler และ retry
- `notification-service`: notification history, deduplication และ delivery audit timestamps
- `nginx/`: public API gateway สำหรับ Flutter; strip internal-service headers และ rate limit ที่ขอบระบบ

รัน backend ทั้งชุด:

```powershell
docker compose up -d --build
docker compose ps
```

## Reminder delivery

scheduler ใช้เวลา `Asia/Bangkok` และตรวจทุก 15 วินาที ไม่ใช้การเทียบเวลานาทีเดียวแบบเดิม

- `last_triggered_key` กันการเตือนรอบเดิมซ้ำหลัง restart
- ถ้าส่งไม่สำเร็จจะ retry รอบถัดไป
- `dedupe_key` กัน notification ซ้ำ
- `scheduled_at` และ `delivered_at` ใช้ตรวจ latency และทำเอกสารสรุปผล
- ระบบส่ง notification ให้ผู้ใช้เจ้าของรายการและ family connection ที่มีสถานะ `accepted`

ความแม่นยำใน pilot ขึ้นกับ server, database, network, browser และการเปิดหน้าแอพ จึงยังไม่ควรอ้างการรับประกัน 100%

## Authentication status

ระบบใช้ password-only authentication ชั่วคราว และถอด OTP/PIN authentication ออกจาก code path ที่ใช้งานทั้งหมด รหัสผ่านใหม่และรหัสผ่านที่ reset ต้องยาว 12–72 UTF-8 bytes มีทั้งตัวอักษรภาษาอังกฤษกับตัวเลข และ hash ด้วย bcrypt cost 12 Access token มีอายุ 15 นาที และ refresh token มีอายุ 7 วัน

บัญชีเก่าที่มีเฉพาะ OTP/PIN และไม่มี `password_hash` จะไม่สามารถเข้าสู่ระบบได้ ต้องผ่านกระบวนการกู้คืน/ตั้งรหัสผ่านโดยผู้ดูแลที่ตรวจสอบตัวตนแล้ว ห้ามเปิด PIN endpoint เดิมกลับมาเพื่อแก้ปัญหาชั่วคราว

## Database และ deployment plan

แผน pilot ที่แนะนำ:

```text
Vercel       React/Next.js web app
Backend      Node.js services แยกจาก Vercel
Database     Supabase Free หรือ Neon Free PostgreSQL
Email        ผู้ให้บริการส่งลิงก์ reset password ที่ตั้งค่าใน environment
```

Vercel เหมาะกับ frontend แต่ไม่เหมาะกับ scheduler ที่ต้องทำงานต่อเนื่องทุก 15 วินาที ส่วน free database เหมาะกับข้อมูลทดสอบเท่านั้นและอาจ sleep หรือมี quota จำกัด

## Readiness assessment

สถานะนี้เป็นการประเมินจาก source code และการทดสอบใน environment นี้ ไม่ใช่การรับรอง penetration test:

| ด้าน | สถานะ | หมายเหตุ |
|---|---|---|
| Application code สำหรับ staging | พร้อมแบบมีเงื่อนไข | security regression 25/25, build/audit ผ่าน; ต้อง backup และ deploy integration |
| Public production | รอ external gates | ต้องยืนยัน environment, monitoring, restore drill, PDPA และ independent penetration test |
| Flutter app | รอ CI/device verification | เพิ่ม HTTPS/refresh แล้ว แต่ environment นี้ไม่มี Flutter SDK |
| React web app | staging-ready | ใช้ BFF/CSP แล้วและมี flow หลักครบสำหรับ controlled pilot |
| ความพร้อมขึ้น Store | ยังไม่พร้อม | ต้องทำ signing, privacy declaration, device/release testing และ Store compliance |

## Security baseline ก่อนรับข้อมูลจริง

ข้อมูลสุขภาพและข้อมูลครอบครัวเป็น sensitive data ดังนั้นให้ใช้ข้อมูลจำลองจนกว่า production gates ในรายงานจะผ่าน:

- ใช้ HTTPS ทุก environment ที่มีผู้ใช้จริง
- เก็บ JWT secrets, database credentials และ internal API key ใน secret manager/environment variables และ rotate ค่าเก่าทั้งหมด
- ใช้ least-privilege database users และแยก database test/production
- คง managed WAF/edge rate limit, auth database throttle, request validation และ audit log ที่เพิ่มแล้ว
- ตั้ง monitoring และ alerting บน production environment
- ทำ backup/restore drill และกำหนด data retention
- ตรวจ access control ของ family, reminder และ notification ทุก endpoint
- รัน automated security tests และ staging integration ทุก release
- ทำ privacy notice, consent, data deletion และ incident response plan

## Git ignore policy

ห้าม ignore source ที่ต้องใช้สร้างแอพในอนาคต:

```text
mobile_app/lib/
mobile_app/android/
mobile_app/ios/
mobile_app/pubspec.yaml
```

ไฟล์ secrets, dependency cache และ build output ควร ignore เช่น `.env`, `node_modules/`, `mobile_app/.dart_tool/` และ `mobile_app/build/`

## Next milestones

### Sprint 4 - Controlled pilot

- ทำ React web ให้มี login, reminders, family และ caregiver flow ครบ
- Deploy frontend บน Vercel
- ใช้ Supabase Free หรือ Neon Free แยกฐานข้อมูลทดสอบ
- จำกัดกลุ่มผู้ใช้และใช้ข้อมูลจำลอง
- เก็บ feedback, error logs และ reminder delivery metrics

### Sprint 5 - Authentication and security hardening (implemented; awaiting staging verification)

- ตรวจ BFF cookie-only session, CSRF และ CSP ซ้ำบน staging URL จริง
- พิจารณา WebAuthn/passkeys เป็นปัจจัยยืนยันเพิ่มเติมโดยไม่เปิด mock OTP กลับมา
- rotate production secrets และยืนยัน HTTPS/private networking
- ให้ผู้ตรวจอิสระทำ authenticated penetration test

### Sprint 6 - Store preparation

- ทดสอบ Android และ iOS บนอุปกรณ์จริง
- ทำ app signing, privacy policy และ consent flow
- เตรียม screenshots, store metadata และ release build
- เปิด beta testing ก่อน production release

## Current test endpoints

- Local Flutter web: `http://localhost:5174`
- LAN Flutter web ตัวอย่าง: `http://192.168.1.146:5174`
- API gateway: `http://localhost:8080`

ค่าพอร์ตและ IP เป็นค่าทดสอบในเครื่อง อาจเปลี่ยนตาม environment

## Security and pre-release test report — 25 September 2026

รายงานนี้ครอบคลุมการตรวจโค้ด, dependency audit, production build, automated API tests และการทดสอบแบบไม่ทำลายระบบที่ deploy อยู่ ณ วันที่ 25 กันยายน 2026 การทดสอบไม่ได้ทำ load test, DoS, ลบข้อมูล, แก้ข้อมูลผู้ใช้จริง หรือพยายามยึดบัญชีจริง

### ปัญหาที่ได้รับแจ้งและสาเหตุ

ผู้ดูแลหรือผู้สูงอายุไม่สามารถแก้เวลาเตือนยาได้ในรายการที่ไม่มีข้อมูลขนาดยา และ Safari แสดงข้อผิดพลาด:

```text
null is not an object (evaluating 'u.dosage.trim')
```

สาเหตุคือ API ส่ง `dosage: null` กลับมา แต่ฟอร์มหน้า `/reminders` เรียก `.trim()` กับค่า `null` ก่อนส่งคำขอแก้ไข ทำให้ JavaScript หยุดทำงานก่อนถึง Reminder API จึงดูเหมือนว่าแก้เวลาไม่ได้

การแก้ไข:

- แปลง `medicine_name` และ `dosage` เป็น string ปลอดภัยตอนเปิดฟอร์มแก้ไข
- ใช้ `String(value ?? '').trim()` ตอนบันทึก เพื่อรองรับ `null` และ `undefined`
- ฝั่ง Caregiver API รองรับ `dosage=null` และ normalize ข้อมูลก่อนบันทึก
- เพิ่ม automated regression test สำหรับการสร้างรายการยาที่ `dosage=null`

### Security hardening ที่เพิ่ม

- จำกัด JSON request body ทุก service ไว้ที่ `32kb` เพื่อลดความเสี่ยง memory/CPU exhaustion
- เพิ่ม rate limit เฉพาะ password login/register/reset, Reminder API, Notification API, SOS และ support contact
- ปฏิเสธ origin ที่ไม่อยู่ใน CORS allowlist ด้วย HTTP `403` แทนการตอบ `500`
- ปิด header ที่เปิดเผย Express/Next.js และเพิ่ม `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` และ `Permissions-Policy`
- จำกัดชื่อยาไม่เกิน 120 ตัวอักษร, ขนาดยาไม่เกิน 100 ตัวอักษร และข้อความ notification ไม่เกินขนาดที่กำหนด
- อัปเดต Next.js จากสาย 14 ที่พบช่องโหว่เป็น `15.5.24`
- ถอด `next-pwa` ที่ไม่ได้ใช้งานและดึง dependency เก่าที่มีช่องโหว่เข้ามา
- บังคับ PostCSS/Nanoid ไปยังรุ่นที่แก้ advisory แล้ว
- อัปเดต Express/transitive dependencies ของ backend จน production dependency audit เป็นศูนย์
- นำรหัสผ่าน PostgreSQL และ `INTERNAL_API_KEY` แบบตายตัวออกจาก `docker-compose.yml`; local environment ต้องกำหนดผ่าน `.env`
- เพิ่ม production fail-fast: secret ต้องสุ่มอย่างน้อย 48 ตัวอักษร และ access/refresh/internal secret ต้องไม่ซ้ำ
- ถอด OTP/PIN authentication และปิด endpoint เดิมทั้งหมด
- ป้องกันผู้ใช้เปลี่ยน `role` ของตัวเองผ่าน profile API
- ลดอายุ access token เหลือ 15 นาทีและ refresh token เหลือ 7 วัน
- ย้าย web session ออกจาก `localStorage` ไปยัง same-origin BFF และ `HttpOnly; Secure; SameSite=Strict` cookies
- เพิ่ม CSRF origin/header checks และ CSP แบบ nonceที่ตรวจ runtime แล้ว
- บังคับ JWT algorithm/issuer/audience, bcrypt cost 12 และ PostgreSQL per-account login throttling
- ปิด notification spoofing, Web Push SSRF และ password-reset race
- แก้ Nginx gateway routes, strip internal header และ bind พอร์ตฐานข้อมูลไว้ที่ localhost
- บังคับ database TLS certificate verification ใน production และเพิ่ม query/pool timeout
- เพิ่ม mobile automatic refresh, HTTPS-only release, disable cleartext/backup
- ลบ `pin_hash` ออกจาก schema ใน migration นี้

> หลัง merge ต้องหมุนเวียน `INTERNAL_API_KEY`, `JWT_SECRET`, `JWT_REFRESH_SECRET` และรหัสผ่านฐานข้อมูลใน Railway/production เนื่องจากค่า development เก่าเคยปรากฏอยู่ใน Git history การลบออกจากไฟล์ล่าสุดไม่ทำให้ secret เก่าปลอดภัยอีกครั้ง

### ผลการทดสอบ

| การทดสอบ | ผลลัพธ์ |
|---|---|
| Next.js production build (`npm run build`) | ผ่าน — 14 dynamic pages/routes พร้อม BFF และ CSP middleware |
| Frontend lint | ผ่าน — ไม่มี error |
| Auth automated tests | ผ่าน 13/13 |
| Reminder/Caregiver security tests | ผ่าน 7/7 |
| Notification security tests | ผ่าน 5/5 |
| CSP runtime | script ทุกตัวมี nonce ตรงกับ response CSP |
| BFF runtime | CSRF/route allowlist/token stripping/cookie rotation ผ่าน |
| BFF fail-safe | upstream config หายตอบ `503`; upstream ล่มตอบ JSON `502` โดยไม่เปิดเผย token/URL |
| ไม่มี token เข้า Auth `/auth/me` | ปฏิเสธ `401` |
| ไม่มี token เข้า Reminder API | ปฏิเสธ `401` |
| ไม่มี token เข้า Notification API | ปฏิเสธ `401` |
| บัญชี `elderly` เรียก Caregiver API | ปฏิเสธ `403` |
| Caregiver แก้ยาของผู้สูงอายุที่ไม่ได้เชื่อมต่อ | ปฏิเสธ `403` ก่อน `UPDATE` ฐานข้อมูล |
| เวลา `99:99` | ปฏิเสธ `400` ก่อนเข้าฐานข้อมูล |
| รายการยาที่ `dosage=null` | ผ่านและบันทึกเป็น `NULL` ได้ |
| CORS origin ที่ไม่อนุญาต | automated test ผ่าน `403`; production เดิมยังตอบ `500` จนกว่าจะ deploy revision นี้ |
| SQL-injection-style login probe ต่อ production | ปฏิเสธ `401`; query ในโค้ดใช้ parameterized SQL |
| `npm audit --omit=dev` — frontend | 0 ช่องโหว่ |
| `npm audit --omit=dev` — auth-service | 0 ช่องโหว่ |
| `npm audit --omit=dev` — reminder-service | 0 ช่องโหว่ |
| `npm audit --omit=dev` — notification-service | 0 ช่องโหว่ |
| full `npm audit` — frontend/auth/reminder/notification | 0 ช่องโหว่ |
| GitGuardian scan บน Pull Request ก่อนรอบ hardening นี้ | ผ่าน — revision ใหม่ยังต้องรอ remote PR scan หลัง push |

Production health endpoints ของ Auth, Reminder และ Notification ตอบ `200` ในวันที่ทดสอบ แต่ผลดังกล่าวยืนยันเพียงว่า service และ database health check ตอบสนอง ไม่ได้ยืนยันทุก user flow

### สถานะพร้อมใช้งาน

| ระดับการใช้งาน | สถานะ | เงื่อนไข |
|---|---|---|
| Development/local | พร้อม | สร้าง `.env` จาก `.env.example` และใช้ข้อมูลจำลอง |
| Controlled pilot | พร้อมแบบมีเงื่อนไข | deploy revision นี้ใน staging, backup ก่อน migration, rotate secrets และผ่าน E2E checklist |
| Public production | รอ external gates | ต้องผ่าน environment TLS/network review, monitoring, backup/restore, mobile build, PDPA review และ independent penetration test |

ระบบลดความเสี่ยงจากการเดารหัส, request ขนาดใหญ่, unauthorized API access, IDOR ใน Caregiver API, CORS และ dependency ที่มี advisory ได้ดีขึ้น แต่ไม่มีระบบใดป้องกันการโจมตีได้ 100% และการตรวจรอบนี้ไม่ใช่การรับรอง penetration test โดยบุคคลที่สาม

### Release gates ที่ยังต้องผ่านก่อนเปิดสาธารณะ

1. Deploy staging และทำ E2E สองบทบาทครบ login, connection, reminder CRUD/null dosage, taken, snooze, push, logout และ SOS
2. Rotate secrets/keys ทั้งหมดเป็นค่าสุ่มใหม่อย่างน้อย 48 ตัวอักษร และตรวจ TLS/private networking บน environment จริง
3. เปิด monitoring/alert, ทำ encrypted backup และ restore drill, retention/deletion policy และ incident-response runbook
4. รัน Flutter analyzer/build และทดสอบ Android/iOS จริง เพราะ environment นี้ไม่มี Flutter SDK
5. รัน Docker/staging integration เพราะ environment นี้ไม่มี Docker daemon
6. ตรวจ PDPA/consent/data minimization และ verified onboarding ก่อนเปิด self-registration
7. ใช้ managed edge/WAF rate limit เมื่อ scale หลาย gateway instance
8. ทำ independent authenticated penetration test ก่อนรับข้อมูลสุขภาพจริง

### Staging checklist ก่อนให้ผู้ใช้กลุ่มทดลองเข้าใช้

- [ ] Deploy commit/revision นี้ครบทั้ง frontend และ 3 backend services
- [ ] Backup ฐานข้อมูลก่อน migration และยืนยันการลบ `pin_hash` ตามแผน
- [ ] ตรวจว่า OTP/PIN endpoint เดิมทั้งหมดตอบ `404` ผ่าน public gateway
- [ ] ตรวจว่า access token หมดอายุประมาณ 15 นาทีและ refresh token 7 วัน
- [ ] ปิด `REGISTRATION_ENABLED` ใน production จนกว่าจะมี verified onboarding
- [ ] เตรียมกระบวนการย้ายบัญชีเก่าที่ไม่มี `password_hash` โดยไม่เปิด PIN login กลับมา
- [ ] สร้าง secret แบบสุ่มอย่างน้อย 48 ตัวอักษรและไม่ซ้ำกัน แล้ว rotate ค่าเดิมทั้งหมด
- [ ] ตรวจ web login ว่า response ไม่มี token, cookie เป็น `HttpOnly; Secure; SameSite=Strict` และ `localStorage` ไม่มี session
- [ ] ตรวจ CSP console ไม่มี violation ที่ทำให้ login/dashboard/push ใช้งานไม่ได้
- [ ] ตรวจว่า production CORS origin แปลกตอบ `403` และหน้าเว็บไม่มี `X-Powered-By`
- [ ] ทดสอบ login ผิดซ้ำจนได้ `429` ใน staging แล้วรอให้ปลดล็อกตามเวลา
- [ ] ทดสอบ Caregiver แก้เวลาเมื่อ `dosage` ว่าง/เป็น `null`
- [ ] ทดสอบ Caregiver ไม่สามารถอ่านหรือแก้ยาของผู้สูงอายุที่ไม่ได้เชื่อมต่อ
- [ ] ทดสอบ notification และ SOS ถึงผู้รับที่เชื่อมต่อเท่านั้น
- [ ] ตรวจ backup/restore และระบบแจ้งเตือนเมื่อ service/database ล่ม
- [ ] ใช้เฉพาะข้อมูลจำลองจนกว่ารายการด้านบนจะผ่านทั้งหมด
