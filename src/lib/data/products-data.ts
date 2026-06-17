import productsJson from './products.json';

export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image_url: string;
  category: string;
  stock: number | null;
  tags: string[];
  colors: string[];
  sizes: string[];
  discount?: number;
  additional_images?: string[];
  imageUrls?: string[];
  brand?: string;
  merchantId?: string;
  merchantName?: string;
  merchantInfo?: string;
  merchantStatus?: 'pending' | 'approved' | 'rejected' | 'verified';
  merchantCreatedAt?: any;
  itemType?: string;
  hasVariants?: boolean;
  variants?: any[];
  allowMultiplePurchases?: boolean;
  createdAt?: any;
  trackInventory?: boolean;
}

export const productsData: Product[] = productsJson as Product[];