import { productsData } from '../../data/products-data.js';

export const getProducts = async (filters = {}) => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Use the imported data directly
    let products = [...productsData];
    
    // Implement client-side filtering
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(keyword) || 
        p.description.toLowerCase().includes(keyword)
      );
    }
    
    if (filters.maxPrice) {
      products = products.filter(p => p.price <= filters.maxPrice);
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

export const getProduct = async (id) => {
  try {
    // Re-use getProducts to fetch the full list
    const products = await getProducts();
    
    // Find the specific product
    // Note: ID comparison might need to be loose (==) if types mismatch (string vs number)
    const product = products.find(p => p.id == id);
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    return product;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};
