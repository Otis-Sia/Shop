import { productsData, Product } from '@/lib/data/products-data';

export type { Product };

export interface ProductFilters {
  keyword?: string;
  maxPrice?: number;
  limit?: number;
  category?: string;
  adminId?: string;

  newArrivals?: boolean;
  includeUnapproved?: boolean;
}

export const getProducts = async (filters: ProductFilters = {}): Promise<Product[]> => {
  try {
    const params = new URLSearchParams();
    if (filters.keyword) params.append('keyword', filters.keyword);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.category) params.append('category', filters.category);
    if (filters.adminId) params.append('adminId', filters.adminId);

    if (filters.newArrivals) params.append('newArrivals', 'true');
    if (filters.includeUnapproved) params.append('includeUnapproved', 'true');

    const res = await fetch(`/api/products?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return (data.products || []) as Product[];
    }
    return productsData;
  } catch (error) {
    console.error('Error fetching products from API:', error);
    return productsData;
  }
};

export const getCategories = async (): Promise<string[]> => {
  const products = await getProducts();
  return Array.from(new Set(products.map(p => p.category))).filter(Boolean) as string[];
};

export const getAvailableTags = async (): Promise<string[]> => {
  const products = await getProducts();
  const tags = new Set<string>();
  products.forEach(p => {
    if (p.tags && Array.isArray(p.tags)) {
      p.tags.forEach(t => tags.add(t));
    }
  });
  return Array.from(tags);
};

export const getProduct = async (id: number | string): Promise<Product> => {
  try {
    const res = await fetch(`/api/products/${id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.product) return data.product as Product;
    }

    const fallback = productsData.find(p => p.id == Number(id));
    if (fallback) return fallback;

    throw new Error('Product not found');
  } catch (error) {
    const fallback = productsData.find(p => p.id == Number(id));
    if (fallback) return fallback;
    throw error;
  }
};
