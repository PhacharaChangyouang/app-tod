'use client';

export default function AhaIcon({ name, size = 24, stroke = 'currentColor', strokeWidth = 1.9, className = '' }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', className };
  const icons = {
    home:<><path d="m3 10 9-7 9 7"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></>,
    bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    pill:<><rect x="3.5" y="7" width="17" height="10" rx="5" transform="rotate(-35 12 12)"/><path d="m8.3 14.7 7.4-7.4"/></>,
    heart:<path d="M20.8 8.8c0 5.1-8.8 10.3-8.8 10.3S3.2 13.9 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z"/>,
    shield:<><path d="M12 3 20 6v5c0 5-3.2 8.3-8 10-4.8-1.7-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/></>,
    users:<><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 21c.6-3.8 2.5-5.7 5.5-5.7s4.9 1.9 5.5 5.7"/><path d="M14.5 15.5c3.2-.1 5 1.5 5.8 4.5"/></>,
    plus:<><path d="M12 5v14M5 12h14"/></>,
    trash:<><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></>,
    edit:<><path d="m4 20 4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="m13.8 7.2 3 3"/></>,
    arrow:<><path d="M5 12h14M13 6l6 6-6 6"/></>,
    chevron:<path d="m9 6 6 6-6 6"/>,
    mic:<><rect x="8" y="3" width="8" height="12" rx="4"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></>,
    location:<><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    phone:<path d="M7 3.5 4.8 5.1c-.8.6-.9 1.7-.6 2.7 1.4 5 5 8.6 10 10 .9.3 2.1.2 2.7-.6l1.6-2.2-4.1-2.5-1.7 1.6c-2.2-1.2-3.7-2.7-4.9-4.9l1.6-1.7L7 3.5Z"/>,
    logout:<><path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/></>,
    check:<path d="m5 12 4 4L19 6"/>,
    warning:<><path d="m12 3 9 17H3L12 3Z"/><path d="M12 9v4M12 17h.01"/></>,
    moon:<path d="M20 15.2A8 8 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z"/>,
    sun:<><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    activity:<><path d="M3 12h4l2.2-5 4.1 10 2.3-5H21"/></>,
    message:<><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-5.5 4v-4h-1A2.5 2.5 0 0 1 2 13.5v-8A2.5 2.5 0 0 1 4 5.5Z"/></>,
  };
  return <svg {...p}>{icons[name] || icons.activity}</svg>;
}
