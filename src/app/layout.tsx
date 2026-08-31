import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://juj4.com'),
  title: 'JUJ4 - Your Premium Shopping Destination',
  description: 'Discover amazing products at unbeatable prices. Your premium shopping experience starts here.',
  icons: {
    icon: '/Logo.svg',
    apple: '/Logo.svg',
  },
  openGraph: {
    title: 'JUJ4 - Your Premium Shopping Destination',
    description: 'Discover amazing products at unbeatable prices. Your premium shopping experience starts here.',
    url: 'https://juj4.com',
    siteName: 'JUJ4',
    images: [
      {
        url: '/Logo.svg',
        width: 800,
        height: 600,
        alt: 'JUJ4 Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JUJ4 - Your Premium Shopping Destination',
    description: 'Discover amazing products at unbeatable prices. Your premium shopping experience starts here.',
    images: ['/Logo.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  keywords: ['e-commerce', 'shopping', 'premium products', 'JUJ4', 'online store'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ToastProvider>
            <Header />
            <main>{children}</main>
            <Footer />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
