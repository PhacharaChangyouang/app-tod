# reminder-service (ยังไม่เริ่ม — Sprint 2-3)

รับผิดชอบ:
- Medications, Schedules, Reminders, Appointments (CRUD)
- Logic คำนวณเวลาแจ้งเตือนตาม repeat_type (daily/weekly)
- Endpoint ให้ frontend query "วันนี้กินยาหรือยัง" สำหรับ caregiver dashboard

จะ mount เป็น container แยกใน docker-compose เหมือน auth-service
เชื่อม auth ผ่าน JWT ที่ auth-service ออกให้ (verify ผ่าน shared JWT_SECRET)
