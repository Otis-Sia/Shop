import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/', 
        '/merchant/', 
        '/api/', 
        '/cart/', 
        '/checkout/', 
        '/orders/', 
        '/wishlist/'
      ],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://juj4.cepine.com'}/sitemap.xml`,
  };
}
