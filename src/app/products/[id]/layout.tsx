import { Metadata } from 'next';
import { getProduct } from '@/lib/api/products';
import { STORE_CONFIG } from '@/lib/config/store';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // In Next.js 15+, params should be awaited if we follow the new async params signature, 
  // though Next 16 might enforce it. Let's try awaiting it.
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  try {
    const product = await getProduct(id);
    
    if (!product) {
      return {
        title: `Product Not Found - ${STORE_CONFIG.name}`,
      };
    }

    const title = `${product.name} | ${STORE_CONFIG.name}`;
    const description = product.description ? (product.description.length > 160 ? product.description.substring(0, 157) + '...' : product.description) : `Buy ${product.name} at ${STORE_CONFIG.name}. Discover amazing products at unbeatable prices.`;
    const image = product.image_url || product.additional_images?.[0] || STORE_CONFIG.defaultFallbackImage;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        images: image ? [
          { 
            url: image,
            width: 1200,
            height: 630,
            alt: product.name,
          }
        ] : [],
        siteName: STORE_CONFIG.name,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: image ? [image] : [],
      },
    };
  } catch (error) {
    return {
      title: `Product - ${STORE_CONFIG.name}`,
    };
  }
}

export default function ProductLayout({ children }: Props) {
  return <>{children}</>;
}
