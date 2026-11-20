import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gym Assistant',
  description: 'Персональный виртуальный тренер для тренажёрного зала',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Gym Assistant' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f5f5f7',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
