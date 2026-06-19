import { productsData, Product } from '@/lib/data/products-data';

export type { Product };

export interface ProductFilters {
  keyword?: string;
  maxPrice?: number;
  limit?: number;
  category?: string;
  merchantId?: string;
  itemType?: string;
  newArrivals?: boolean;
  includeUnapproved?: boolean;
}

import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const getProducts = async (filters: ProductFilters = {}): Promise<Product[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'products'));
    const productsPromises = snapshot.docs.map(async (docSnap) => {
      const d = docSnap.data();
      const product: Product = {
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
        itemType: d.itemType || 'goods',
        image_url: d.imageUrls && d.imageUrls.length > 0 ? d.imageUrls[0] : (d.image_url || ''),
        additional_images: d.imageUrls && d.imageUrls.length > 1 ? d.imageUrls.slice(1) : (d.additional_images || []),
        merchantId: d.merchantId || 'admin',
        allowMultiplePurchases: d.allowMultiplePurchases !== false,
        hasVariants: d.hasVariants || false,
        variants: [], // We will populate this below
        createdAt: d.createdAt || null,
        trackInventory: d.trackInventory !== false
      };

      if (product.hasVariants) {
        try {
          const variantsSnap = await getDocs(collection(db, 'products', docSnap.id, 'variants'));
          if (variantsSnap.docs.length > 0) {
            product.variants = variantsSnap.docs.map(vDoc => ({
              id: vDoc.id,
              productId: docSnap.id,
              ...vDoc.data()
            })) as any;
          } else {
            // Fallback to embedded variants for products saved before subcollection migration
            product.variants = d.variants || [];
          }
        } catch (err) {
          console.error(`Error fetching variants for product ${docSnap.id}:`, err);
          product.variants = d.variants || [];
        }
      } else {
        product.variants = d.variants || [];
      }
      return product;
    });

    let products: Product[] = await Promise.all(productsPromises);

    const dbProductIds = new Set(products.map(p => p.id));
    
    for (const p of productsData) {
      if (!dbProductIds.has(p.id)) {
        products.push(p);
      }
    }
    
    products.sort((a, b) => b.id - a.id);

    // Fetch merchant profiles to populate merchantName
    const uniqueMerchantIds = Array.from(new Set(products.map(p => p.merchantId).filter(id => id && id !== 'admin'))) as string[];
    const merchantProfiles: Record<string, any> = {};
    
    await Promise.all(uniqueMerchantIds.map(async (uid) => {
      try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          merchantProfiles[uid] = docSnap.data();
        }
      } catch (err) {
        console.error(`Error fetching profile for ${uid}:`, err);
      }
    }));

    products = products.map(p => {
      if (p.merchantId !== 'admin' && p.merchantId && merchantProfiles[p.merchantId]) {
        const profile = merchantProfiles[p.merchantId];
        const storeName = profile.storeName || (profile.first_name ? `${profile.first_name} ${profile.last_name || ''}` : undefined);
        return {
          ...p,
          merchantName: storeName,
          merchantInfo: profile.businessCategory ? `${profile.businessCategory} seller` : undefined,
          merchantStatus: profile.merchantStatus,
          merchantCreatedAt: profile.createdAt
        };
      }
      return p;
    });

    // Only allow products from merchants who are 'approved' or 'verified' (or admin)
    if (!filters.includeUnapproved) {
      products = products.filter(p => 
        p.merchantId === 'admin' || 
        p.merchantStatus === 'approved' || 
        p.merchantStatus === 'verified'
      );
    }

    if (filters.keyword) {
      const searchTerms = filters.keyword.toLowerCase().split(/\s+/).filter(Boolean);
      products = products.filter(p => {
        const searchableText = [
          p.name,
          p.description,
          p.category || '',
          p.brand || '',
          ...(p.tags || [])
        ].join(' ').toLowerCase();

        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    if (filters.maxPrice) {
      products = products.filter(p => p.price <= filters.maxPrice!);
    }

    if (filters.category) {
      products = products.filter(p => p.category === filters.category);
    }

    if (filters.newArrivals) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      products = products.filter(p => {
        if (!p.createdAt) return false;
        let date: Date;
        if (p.createdAt.toDate) {
          date = p.createdAt.toDate();
        } else {
          date = new Date(p.createdAt);
        }
        return date.getTime() >= oneWeekAgo.getTime();
      });
    }

    if (filters.merchantId) {
      products = products.filter(p => p.merchantId === filters.merchantId);
    }

    if (filters.itemType) {
      if (filters.itemType !== 'all') {
        products = products.filter(p => p.itemType === filters.itemType);
      }
    } else {
      // By default, exclude services from products list
      products = products.filter(p => p.itemType !== 'service');
    }

    // Sort verified merchants' products to appear first
    products.sort((a, b) => {
      const aVerified = a.merchantStatus === 'verified' ? 1 : 0;
      const bVerified = b.merchantStatus === 'verified' ? 1 : 0;
      return bVerified - aVerified;
    });

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
