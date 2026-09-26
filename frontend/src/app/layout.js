import './globals.css';
import Script from 'next/script';
import { headers } from 'next/headers';
import AhaNavigation from '../components/AhaNavigation';
import MedicationNotificationManager from '../components/MedicationNotificationManager';
import AhaVisualPolish from '../components/AhaVisualPolish';
import AhaResponsiveFix from '../components/AhaResponsiveFix';
import AhaCaregiverEnhancements from '../components/AhaCaregiverEnhancements';
import FamilyHomeShortcut from '../components/FamilyHomeShortcut';
import CookieConsent from '../components/CookieConsent';

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

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get('x-nonce') || undefined;
  return (
    <html lang="th">
      <body>
        <Script id="aha-appearance-init" nonce={nonce} strategy="beforeInteractive">{`
          try {
            var mode = localStorage.getItem('aha_appearance') || 'light';
            var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            document.documentElement.dataset.ahaAppearance = dark ? 'dark' : 'light';
            document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
          } catch (_) {}
        `}</Script>
        {children}
        <AhaNavigation />
        <AhaVisualPolish />
        <AhaResponsiveFix />
        <AhaCaregiverEnhancements />
        <FamilyHomeShortcut />
        <MedicationNotificationManager />
        <CookieConsent />
      </body>
    </html>
  );
}
