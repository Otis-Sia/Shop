import productsJson from './products.json';

export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image_url: string;
  category: string;
  stock: number;
  tags: string[];
  colors: string[];
  sizes: string[];
  discount?: number;
  additional_images?: string[];
  brand?: string;
  merchantId?: string;
  merchantName?: string;
  merchantInfo?: string;
  merchantStatus?: 'pending' | 'approved' | 'rejected' | 'verified';
  merchantCreatedAt?: any;
  itemType?: string;
}

export const productsData: Product[] = productsJson as Product[];