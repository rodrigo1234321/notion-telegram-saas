import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/ui/Navbar';

export const metadata: Metadata = {
  title: 'Notion SaaS Telegram Mini App',
  description: 'SaaS de Productividad Personal alojado dentro de Telegram',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-[var(--tg-theme-bg-color,#0f172a)] text-[var(--tg-theme-text-color,#f8fafc)] min-h-screen pb-20 selection:bg-sky-500/30">
        <main className="max-w-md mx-auto p-4">
          {children}
        </main>
        <Navbar />
      </body>
    </html>
  );
}
