const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

async function sendPasswordResetEmail({ to, name, token }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) {
    throw new Error('Email service is not configured. Set RESEND_API_KEY and MAIL_FROM.');
  }

  const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const greeting = name ? `คุณ${name}` : 'ผู้ใช้งาน AHA';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'AHA — ตั้งรหัสผ่านใหม่',
      html: `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f5f8f8;padding:24px;color:#20343c"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #dbe6e8;border-radius:18px;padding:28px"><div style="font-size:26px;font-weight:900;color:#2085b1">AHA</div><h2>ตั้งรหัสผ่านใหม่</h2><p>สวัสดี ${greeting}</p><p>มีการขอตั้งรหัสผ่านใหม่สำหรับบัญชี AHA ของคุณ หากเป็นคุณ ให้กดปุ่มด้านล่าง</p><p><a href="${resetUrl}" style="display:inline-block;background:#2085b1;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">ตั้งรหัสผ่านใหม่</a></p><p style="color:#71858c;font-size:13px">ลิงก์นี้ใช้ได้ครั้งเดียวและหมดอายุภายใน 15 นาที หากคุณไม่ได้เป็นผู้ขอ สามารถละเว้นอีเมลนี้ได้</p></div></body></html>`,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Email provider rejected the message: ${text.slice(0, 300)}`);
  }
  return response.json();
}

module.exports = { sendPasswordResetEmail };
