# notification-service (ยังไม่เริ่ม — Sprint 4)

รับผิดชอบ:
- Local notification trigger (ผ่าน service worker signal / cron job)
- Push notification (Firebase Cloud Messaging)
- SMS backup (นัดสำคัญ + ฉุกเฉิน เท่านั้น ตาม Sensitive Data Rule — ห้ามส่งข้อมูลสุขภาพตรงๆ ผ่าน SMS)

OTP/PIN authentication ถูกถอดออกจาก auth-service แล้ว Notification service ไม่รับผิดชอบการส่งรหัสยืนยันตัวตน
