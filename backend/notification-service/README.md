# notification-service (ยังไม่เริ่ม — Sprint 4)

รับผิดชอบ:
- Local notification trigger (ผ่าน service worker signal / cron job)
- Push notification (Firebase Cloud Messaging)
- SMS backup (นัดสำคัญ + ฉุกเฉิน เท่านั้น ตาม Sensitive Data Rule — ห้ามส่งข้อมูลสุขภาพตรงๆ ผ่าน SMS)

ตอนนี้ mock OTP อยู่ใน auth-service/src/services/otp.service.js ไปก่อน
พอถึง Sprint 4 ค่อยแยก SMS gateway logic มาไว้ที่นี่จริงจัง
