'use client';

export function passwordChecks(value = '') {
  return {
    length: value.length >= 8 && new TextEncoder().encode(value).length <= 72,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /\d/.test(value),
  };
}

export function isValidPassword(value = '') {
  return Object.values(passwordChecks(value)).every(Boolean);
}

export default function PasswordRequirements({ value }) {
  const checks = passwordChecks(value);
  const rows = [
    ['length', 'อย่างน้อย 8 ตัวอักษร (ไม่เกิน 72 ไบต์)'],
    ['uppercase', 'มีตัวอักษรภาษาอังกฤษพิมพ์ใหญ่ อย่างน้อย 1 ตัว'],
    ['lowercase', 'มีตัวอักษรภาษาอังกฤษพิมพ์เล็ก อย่างน้อย 1 ตัว'],
    ['number', 'มีตัวเลข อย่างน้อย 1 ตัว'],
  ];

  return (
    <ul className="aha-password-rules" aria-label="เงื่อนไขรหัสผ่าน">
      {rows.map(([key, label]) => (
        <li key={key} className={checks[key] ? 'valid' : ''}>
          <span aria-hidden="true">{checks[key] ? '✓' : '○'}</span>{label}
        </li>
      ))}
      <style jsx>{`
        .aha-password-rules{list-style:none;margin:1px 0 0;padding:9px 11px;display:grid;gap:5px;border-radius:10px;background:#f6f8f8;color:#667980;font-size:12px;line-height:1.35}
        .aha-password-rules li{display:flex;gap:7px;align-items:flex-start;transition:color .15s ease}.aha-password-rules li span{width:15px;flex:0 0 15px;font-weight:900}.aha-password-rules li.valid{color:#087a56;font-weight:800}
      `}</style>
    </ul>
  );
}
