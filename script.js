import { getProducts } from './frontend/shared/utils/api/products.js';

const initFeaturedProducts = async () => {
  const container = document.getElementById('featured-products-grid');
  
  const render = async () => {
    try {
      const products = await getProducts({ limit: 8 });
      
      if (products && products.length > 0) {
        container.innerHTML = products.map(product => `
          <div class="product-card">
            <div class="product-image">
              <img src="${product.image_url || 'https://via.placeholder.com/300x200?text=Product'}" alt="${product.name}">
            </div>
            <div class="product-info">
              <h3>${product.name}</h3>
              <p class="product-description">${product.description || 'Premium quality product'}</p>
              <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
              <button class="btn btn-primary" data-action="view-products">View Details</button>
            </div>
          </div>
        `).join('');
        
        // Add event listeners to all View Details buttons
        container.querySelectorAll('[data-action="view-products"]').forEach(btn => {
          btn.addEventListener('click', () => {
            window.location.href = './frontend/products/';
          });
        });
      } else {
        container.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No products available yet. Check back soon!</p>';
      }
    } catch (error) {
      console.error('Error loading products:', error);
      container.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: #ef4444;">Unable to load products. Please try again later.</p>';
    }
  };
  
  await render();
};

document.addEventListener('DOMContentLoaded', initFeaturedProducts);
