# AHA — AI Health Assistant for the Elderly

ผู้ช่วยส่วนตัว (Voice-first, Offline-first, Simple) สำหรับผู้สูงอายุ
พัฒนาแบบ PWA ก่อน แล้วแพ็กเป็น Android app ทีหลังด้วย Capacitor

## โครงสร้างโปรเจค

```
aha-project/
├── backend/
│   ├── auth-service/         ← Sprint 1: Auth (Phone + Mock OTP + PIN)
│   ├── reminder-service/     ← Sprint 2-3: ยา/นัด/แจ้งเตือน (ยังไม่เริ่ม)
│   └── notification-service/ ← Sprint 4: Push/SMS (ยังไม่เริ่ม)
├── frontend/                 ← Next.js PWA
└── docker-compose.yml        ← orchestrate ทุก service
```

## แนวคิดสถาปัตยกรรม

- **Microservice แยกตามโดเมน** — แต่ละ service มี DB/deploy ของตัวเองได้ ทำให้แก้ทีละส่วนไม่กระทบกัน
  เหมาะกับโปรเจ็คจบที่ต้องโชว์ทั้ง architecture design และโค้ดจริง
- **Auth-service** ทำเสร็จก่อนเป็นตัวแรก เพราะทุก service อื่นต้องพึ่ง JWT ที่ auth-service ออกให้
- **Mock OTP ในช่วง dev** — ยังไม่ต่อ SMS gateway จริง (Twilio/Thai Bulk SMS) จนกว่าฟีเจอร์หลักจะเสร็จ
  ประหยัดเวลา + ค่าใช้จ่ายตอนพัฒนา

## Roadmap (อ้างอิงจาก blueprint)

| Sprint | งาน |
|---|---|
| 1 | Auth (Mock OTP + PIN), UI พื้นฐาน, Local reminder |
| 2 | Voice input, Intent parsing, Save reminder |
| 3 | Caregiver system, Emergency |
| 4 | Sync backend, Push notification (SMS gateway จริง) |

## เริ่มรันโปรเจค (dev)

```bash
# Backend
cd backend/auth-service
cp .env.example .env
npm install
npm run migrate
npm run dev

# หรือรันทั้งหมดผ่าน docker-compose
docker compose up --build
```

```bash
# Frontend
cd frontend
npm install
npm run dev
```
