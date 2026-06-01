import { productsData, Product } from '@/lib/data/products-data';

export type { Product };

export interface ProductFilters {
  keyword?: string;
  maxPrice?: number;
  limit?: number;
  category?: string;
}

import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const getProducts = async (filters: ProductFilters = {}): Promise<Product[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'products'));
    let products: Product[] = snapshot.docs.map(docSnap => {
      const d = docSnap.data();
      return {
        id: Number(docSnap.id),
        name: d.name || '',
        price: d.price || 0,
        description: d.description || '',
        category: d.category || '',
        stock: d.stock || 0,
        tags: d.tags || [],
        colors: d.colors || [],
        sizes: d.sizes || [],
        discount: d.discount || 0,
        brand: d.brand || '',
        image_url: d.imageUrls && d.imageUrls.length > 0 ? d.imageUrls[0] : (d.image_url || ''),
        additional_images: d.imageUrls && d.imageUrls.length > 1 ? d.imageUrls.slice(1) : (d.additional_images || [])
      } as Product;
    });

    if (products.length === 0) {
      products = [...productsData];
    } else {
      products.sort((a, b) => b.id - a.id);
    }

    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(keyword) ||
        p.description.toLowerCase().includes(keyword) ||
        (p.category && p.category.toLowerCase().includes(keyword)) ||
        (p.tags && p.tags.some(tag => tag.toLowerCase().includes(keyword)))
      );
    }

    if (filters.maxPrice) {
      products = products.filter(p => p.price <= filters.maxPrice!);
    }

    if (filters.category) {
      products = products.filter(p => p.category === filters.category);
    }

    if (filters.limit) {
      products = products.slice(0, filters.limit);
    }

    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

export const getCategories = async (): Promise<string[]> => {
  const products = await getProducts();
  return Array.from(new Set(products.map(p => p.category))).filter(Boolean) as string[];
};

export const getProduct = async (id: number | string): Promise<Product> => {
  try {
    const products = await getProducts();
    const product = products.find(p => p.id == Number(id));

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};
