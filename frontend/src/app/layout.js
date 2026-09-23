import './globals.css';
import AhaNavigation from '../components/AhaNavigation';
import MedicationNotificationManager from '../components/MedicationNotificationManager';
import AhaVisualPolish from '../components/AhaVisualPolish';
import AhaResponsiveFix from '../components/AhaResponsiveFix';
import FamilyHomeShortcut from '../components/FamilyHomeShortcut';

export const metadata = {
  title: 'AHA — AI Health Assistant',
  description: 'ผู้ช่วยสุขภาพอัจฉริยะสำหรับผู้สูงอายุและผู้ดูแล',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/aha-icon.svg',
    shortcut: '/icons/aha-icon.svg',
    apple: '/icons/aha-icon.svg',
  },
};

export const viewport = {
  themeColor: '#0EA9E9',
  initialScale: 1,
  width: 'device-width',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        {children}
        <AhaNavigation />
        <AhaVisualPolish />
        <AhaResponsiveFix />
        <FamilyHomeShortcut />
        <MedicationNotificationManager />
      </body>
    </html>
  );
}
