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
    sitemap: 'https://juj4.com/sitemap.xml',
  };
}
