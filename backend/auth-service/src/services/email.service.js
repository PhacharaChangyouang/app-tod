const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));
}

async function sendPasswordResetEmail({ to, name, token }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) throw new Error('Email service is not configured. Set RESEND_API_KEY and MAIL_FROM.');

  const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const greeting = name ? `คุณ${escapeHtml(name)}` : 'ผู้ใช้งาน AHA';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'AHA Health — คำขอตั้งรหัสผ่านใหม่',
      html: `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,'Noto Sans Thai',sans-serif;color:#111111">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e1e4e8;border-radius:20px;overflow:hidden">
<tr><td style="background:#244fcb;padding:24px 28px;color:#ffffff">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="vertical-align:middle">
<div style="font-size:28px;font-weight:900;color:#ffffff">AHA</div><div style="font-size:12px;color:#ffffff;margin-top:3px">AI Health Assistant</div>
</td><td align="right"><div style="display:inline-block;border:1px solid rgba(255,255,255,.65);border-radius:999px;padding:8px 12px;font-size:11px;font-weight:800;color:#ffffff">SECURE ACCOUNT</div></td></tr></table>
</td></tr>
<tr><td style="padding:30px 28px;color:#111111">
<div style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#111111">ACCOUNT SECURITY</div>
<h1 style="margin:8px 0 16px;font-size:26px;line-height:1.3;color:#111111">ตั้งรหัสผ่านใหม่</h1>
<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#111111">สวัสดี ${greeting}</p>
<p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#111111">เราได้รับคำขอตั้งรหัสผ่านใหม่สำหรับบัญชี AHA ของคุณ หากคุณเป็นผู้ส่งคำขอนี้ ให้กดปุ่มด้านล่าง</p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:12px;background:#244fcb"><a href="${resetUrl}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:800">ตั้งรหัสผ่านใหม่</a></td></tr></table>
<div style="margin-top:24px;padding:15px 16px;background:#f2f3f5;border:1px solid #e1e4e8;border-radius:12px;color:#111111;font-size:13px;line-height:1.65"><strong style="color:#111111">เพื่อความปลอดภัย</strong><br>ลิงก์นี้ใช้ได้เพียงครั้งเดียวและจะหมดอายุภายใน 15 นาที หากคุณไม่ได้เป็นผู้ขอ ไม่ต้องดำเนินการใด ๆ</div>
<p style="margin:22px 0 0;font-size:12px;line-height:1.65;color:#111111">หากปุ่มด้านบนเปิดไม่ได้ ให้คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์:<br><span style="word-break:break-all;color:#111111">${resetUrl}</span></p>
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #e1e4e8;background:#ffffff;color:#111111;font-size:11px;line-height:1.6">อีเมลอัตโนมัติจาก AHA Health · AI Health Assistant<br>ส่งเพื่อความปลอดภัยของบัญชีผู้ใช้งาน AHA</td></tr>
</table></td></tr></table></body></html>`,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Email provider rejected the message: ${text.slice(0, 300)}`);
  }
  return response.json();
}

module.exports = { sendPasswordResetEmail };
