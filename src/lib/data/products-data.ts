import productsJson from './products.json';

export interface Product {
  id: number;
  name: string;
  price: number;
  salePrice?: number;
  saleStartDate?: any;
  saleEndDate?: any;
  description: string;
  shortDescription?: string;
  image_url: string;
  category: string;
  groupCategory?: string;
  subcategories?: string[];
  stock: number | null;
  tags: string[];
  labels?: string[];
  colors: string[];
  sizes: string[];
  grades?: string[];
  capacity?: string;
  power?: string;
  discount?: number;
  additional_images?: string[];
  imageUrls?: string[];
  imageAltTexts?: Record<string, string>;
  videoUrl?: string;
  brand?: string;
  currency?: string;
  adminId?: string;
  merchant_id?: string;
  merchantName?: string;
  merchantInfo?: string;
  merchantStatus?: 'pending' | 'approved' | 'rejected' | 'verified';
  merchantCreatedAt?: any;

  hasVariants?: boolean;
  variants?: any[];
  sku?: string;
  supplierName?: string;
  costPrice?: number;
  allowMultiplePurchases?: boolean;
  lowStockAlert?: boolean;
  allowBackorders?: boolean;
  duration?: number;
  createdAt?: any;
  updatedAt?: any;
  trackInventory?: boolean;
}

export const productsData: Product[] = productsJson as Product[];
