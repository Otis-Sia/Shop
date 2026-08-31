import { Metadata } from 'next';
import { STORE_CONFIG } from '@/lib/config/store';

export const metadata: Metadata = {
  title: `All Products | ${STORE_CONFIG.name}`,
  description: `Browse the full catalog of premium products at ${STORE_CONFIG.name}. Find the best deals on electronics, fashion, and more.`,
  openGraph: {
    title: `All Products | ${STORE_CONFIG.name}`,
    description: `Browse the full catalog of premium products at ${STORE_CONFIG.name}. Find the best deals on electronics, fashion, and more.`,
    url: 'https://juj4.com/products',
    siteName: STORE_CONFIG.name,
    images: [
      {
        url: '/Logo.svg',
        width: 800,
        height: 600,
        alt: `${STORE_CONFIG.name} Products`,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `All Products | ${STORE_CONFIG.name}`,
    description: `Browse the full catalog of premium products at ${STORE_CONFIG.name}. Find the best deals on electronics, fashion, and more.`,
    images: ['/Logo.svg'],
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
