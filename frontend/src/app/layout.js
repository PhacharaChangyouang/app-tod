export const metadata = {
  title: 'AHA - AI Health Assistant',
  description: 'ผู้ช่วยส่วนตัวสำหรับผู้สูงอายุ',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#2563eb',
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
