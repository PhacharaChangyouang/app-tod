import './globals.css';

export const metadata = {
  title: 'AHA — AI Health Assistant',
  description: 'ผู้ช่วยสุขภาพอัจฉริยะสำหรับผู้สูงอายุและผู้ดูแล',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#29ABE2',
  initialScale: 1,
  width: 'device-width',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
