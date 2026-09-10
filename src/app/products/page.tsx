import { Metadata } from 'next';
import { getProducts } from '@/lib/api/products';
import ProductsClient from './ProductsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Products | Shop',
  description: 'Browse our collection of products',
};

export default async function ProductsPage() {
  const initialProducts = await getProducts();
  
  return <ProductsClient initialProducts={initialProducts} />;
}
