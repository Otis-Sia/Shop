import { MetadataRoute } from 'next';
import { getProducts } from '@/lib/api/products';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://juj4.com';
  
  // Define core static routes
  const staticRoutes = [
    '',
    '/products',
    
    '/contact',
    '/terms',
    '/privacy',
    '/returns',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  try {
    // Fetch all products to generate dynamic routes
    const products = await getProducts();
    
    const productRoutes = products.map((product) => {
      let lastModified = new Date().toISOString();
      
      // Attempt to parse createdAt if it exists
      if (product.createdAt) {
        if (typeof product.createdAt === 'string' || typeof product.createdAt === 'number') {
          lastModified = new Date(product.createdAt).toISOString();
        } else if (product.createdAt.toDate) {
          lastModified = product.createdAt.toDate().toISOString();
        }
      }

      return {
        url: `${baseUrl}/products/${product.id}`,
        lastModified,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      };
    });

    return [...staticRoutes, ...productRoutes];
  } catch (error) {
    // If fetching fails, gracefully fallback to static routes
    return staticRoutes;
  }
}
