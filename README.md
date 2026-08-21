# AHA - AI Health Assistant

ระบบช่วยจัดการยาและการดูแลผู้สูงอายุ โดยมีสองเป้าหมายคู่ขนาน:

1. `mobile_app/` เป็น Flutter app สำหรับพัฒนาและเตรียม build เป็น Android/iOS ในอนาคต
2. `frontend/` เป็น React/Next.js web app สำหรับ deploy และทดสอบกับผู้ใช้กลุ่มเล็กก่อนขึ้น Store

## สถานะปัจจุบัน

**Phase 2 - Controlled Web Pilot / Sprint 3-4**

ฟังก์ชันหลักของ Flutter app เชื่อมกับ backend และทดสอบ end-to-end บนเครื่องแล้ว:

- สมัครสมาชิกด้วยเบอร์โทร, OTP mock และ PIN 4 หลัก
- ผู้ใช้เดิมยืนยัน OTP แล้วเข้าสู่ระบบด้วย PIN ได้โดยไม่ต้องสมัครใหม่
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

เว็บ React เป็นเป้าหมายสำหรับ pilot และ deploy บน Vercel แต่ขณะนี้ยังมีฟังก์ชันน้อยกว่า Flutter app จึงต้องทำหน้าจอ reminders, caregiver และ family ให้เทียบเท่าก่อนใช้เป็นช่องทางหลัก

## Backend architecture

```text
React/Next.js web app or Flutter app
                 |
             Nginx API gateway :8080
       _________|______________
      |                        |
 auth-service :3001   reminder-service :3002
      |                        |
 auth PostgreSQL       reminder PostgreSQL
                               |
                    notification-service :3003
                         notification PostgreSQL
```

บริการที่มีอยู่:

- `auth-service`: OTP flow, PIN, JWT access/refresh token, user และ family connections
- `reminder-service`: CRUD รายการยา, selected days, scheduler และ retry
- `notification-service`: notification history, deduplication และ delivery audit timestamps
- `nginx/`: gateway และ CORS สำหรับ local/LAN development

รัน backend ทั้งชุด:

```powershell
docker compose up -d --build
docker compose ps
```

## Reminder delivery

scheduler ใช้เวลา `Asia/Bangkok` และตรวจทุก 5 วินาที ไม่ใช้การเทียบเวลานาทีเดียวแบบเดิม

- `last_triggered_key` กันการเตือนรอบเดิมซ้ำหลัง restart
- ถ้าส่งไม่สำเร็จจะ retry รอบถัดไป
- `dedupe_key` กัน notification ซ้ำ
- `scheduled_at` และ `delivered_at` ใช้ตรวจ latency และทำเอกสารสรุปผล
- ระบบส่ง notification ให้ผู้ใช้เจ้าของรายการและ family connection ที่มีสถานะ `accepted`

ความแม่นยำใน pilot ขึ้นกับ server, database, network, browser และการเปิดหน้าแอพ จึงยังไม่ควรอ้างการรับประกัน 100%

## OTP status

ปัจจุบันยังใช้ **mock OTP** สำหรับ development:

```text
OTP_MOCK_MODE=true
OTP_MOCK_CODE=123456
```

ยังไม่ได้ integrate SMSMKT หรือ Firebase Phone Authentication ใน repository นี้ การทดสอบกลุ่มเล็กควรเริ่มด้วย mock OTP ก่อน แล้วค่อยเปิด SMS จริงกับเบอร์ที่ยินยอมแล้ว โดยต้องเพิ่ม rate limit, spending limit, audit log และ privacy consent

## Database และ deployment plan

แผน pilot ที่แนะนำ:

```text
Vercel       React/Next.js web app
Backend      Node.js services แยกจาก Vercel
Database     Supabase Free หรือ Neon Free PostgreSQL
SMS          SMSMKT แบบคิดตามจำนวนข้อความ เมื่อพร้อมทดสอบเบอร์จริง
```

Vercel เหมาะกับ frontend แต่ไม่เหมาะกับ scheduler ที่ต้องทำงานต่อเนื่องทุก 5 วินาที ส่วน free database เหมาะกับข้อมูลทดสอบเท่านั้นและอาจ sleep หรือมี quota จำกัด

## Readiness assessment

คะแนนเป็นการประเมินจากสถานะโค้ดและการทดสอบในเครื่อง ไม่ใช่การรับรองความปลอดภัย:

| ด้าน | คะแนน | หมายเหตุ |
|---|---:|---|
| Backend สำหรับ controlled pilot | 65/100 | flow หลักและ service integration ใช้งานได้ แต่ยังต้อง harden ก่อน production |
| Backend สำหรับ production | 35/100 | ยังขาด HTTPS deployment, secret management, observability, backup/restore และ security review |
| Flutter app | 70/100 | ฟังก์ชันหลักเชื่อม backend แล้ว แต่ยังต้องทดสอบ device จริงและปรับ UX |
| React web app | 35/100 | เหมาะเป็นฐานสำหรับ pilot แต่ feature parity กับ Flutter ยังไม่ครบ |
| ความพร้อมขึ้น Store | 25/100 | มี project Android/iOS แต่ยังต้องทำ signing, privacy, release testing และ Store compliance |

## Security baseline ก่อนรับข้อมูลจริง

ข้อมูลสุขภาพและข้อมูลครอบครัวเป็น sensitive data ดังนั้น pilot ควรใช้ข้อมูลจำลองก่อน:

- ใช้ HTTPS ทุก environment ที่มีผู้ใช้จริง
- ย้าย JWT secrets, database credentials และ internal API key ไป secret manager/environment variables
- เปลี่ยน internal development key ใน `docker-compose.yml`
- ใช้ least-privilege database users และแยก database test/production
- เพิ่ม rate limit ให้ auth, OTP และ notification endpoints
- เพิ่ม request validation, audit log, monitoring และ alerting
- ทำ backup/restore drill และกำหนด data retention
- ตรวจ access control ของ family, reminder และ notification ทุก endpoint
- เพิ่ม automated security/integration tests
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

### Sprint 5 - Real OTP and security hardening

- Integrate SMSMKT หลังยืนยัน API contract
- เพิ่ม quota, rate limit และค่าใช้จ่ายต่อผู้ใช้
- เปิด HTTPS และจัดการ secrets อย่างถูกต้อง
- เพิ่ม automated tests และ security review

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
