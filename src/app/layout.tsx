import type { Metadata, Viewport } from 'next';
import { Toaster } from "@/components/ui/toaster"
import { LanguageProvider } from '@/lib/i18n/language-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vicky Medical POS',
  description: 'A complete inventory and Point of Sale (POS) application for a medical store.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#4DB6AC', // Updated theme color
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Space+Grotesk:wght@300..700&family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <Toaster />
      </body>
    </html>
  );
}
