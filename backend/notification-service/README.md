# notification-service (ยังไม่เริ่ม — Sprint 4)

รับผิดชอบ:
- Local notification trigger (ผ่าน service worker signal / cron job)
- Push notification (Firebase Cloud Messaging)
- SMS backup (นัดสำคัญ + ฉุกเฉิน เท่านั้น ตาม Sensitive Data Rule — ห้ามส่งข้อมูลสุขภาพตรงๆ ผ่าน SMS)

OTP authentication ถูกถอดออกจาก auth-service แล้ว ส่วน phone+PIN authentication ยังอยู่ใน auth-service โดย Notification service ไม่รับผิดชอบการส่งรหัสยืนยันตัวตน
