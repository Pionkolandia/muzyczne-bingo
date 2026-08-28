import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist', subsets: ['latin', 'latin-ext'] });

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin', 'latin-ext'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://muzyczne-bingo.vercel.app'),
  title: 'Muzyczne Bingo — gra na lekcję muzyki',
  description: 'Interaktywne muzyczne bingo z kołem kategorii, timerem i historią rund do prowadzenia lekcji w szkole.',
  openGraph: {
    title: 'Muzyczne Bingo',
    description: 'Zakręć kołem, słuchaj i baw się muzyką z całą klasą.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Muzyczne Bingo — gra na lekcję muzyki' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Muzyczne Bingo',
    description: 'Interaktywna gra muzyczna dla całej klasy.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
