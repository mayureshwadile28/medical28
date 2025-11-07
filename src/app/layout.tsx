import type { Metadata, Viewport } from 'next';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Fira_Code } from 'next/font/google';

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fontMono = Fira_Code({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Vicky Medical POS',
  description: 'A complete inventory and Point of Sale (POS) application for a medical store.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("font-sans", fontSans.variable, fontMono.variable)}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
