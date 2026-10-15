import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/store';
import { ModalProvider } from '@/components/ui/CustomModal';

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

const bodyFont = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '600', '700'],
});

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f5f3ed' }, { media: '(prefers-color-scheme: dark)', color: '#191c18' }],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'CelenganGenZ — Smart Money & Financial Safety Net',
  description: 'Aplikasi pencatat keuangan, budget planner, dan dana darurat paling aesthetic untuk Gen Z.',
  authors: [{ name: 'CelenganGenZ Team' }],
  keywords: ['money tracker', 'dana darurat', 'keuangan', 'budgeting', 'gen z finance'],
  openGraph: {
    title: 'CelenganGenZ — Smart Money & Financial Safety Net',
    description: 'Aplikasi pencatat keuangan, budget planner, dan dana darurat paling aesthetic untuk Gen Z.',
    type: 'website',
    locale: 'id_ID',
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} light`}>
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased selection:bg-[var(--accent-primary)] selection:text-[var(--on-accent)]">
        <AppProvider>
          <ModalProvider>
            {children}
          </ModalProvider>
        </AppProvider>
      </body>
    </html>
  );
}
