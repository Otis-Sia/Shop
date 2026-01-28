import { getProducts } from '../shared/utils/api/products.js';
import { addToCart } from '../shared/utils/api/cart.js';

const initFeaturedProducts = async () => {
  const container = document.getElementById('featured-products-grid');
  
  const render = async () => {
    try {
      const products = await getProducts({ limit: 8 });
      
      if (products && products.length > 0) {
        container.innerHTML = products.map((product, index) => {
          const isNew = index < 3;
          const isBestSeller = Math.random() > 0.5;
          const rating = (Math.random() * 2 + 3).toFixed(1);
          const reviews = Math.floor(Math.random() * 300) + 20;
          
          return `
          <article class="product-card" data-product-id="${product.id}">
            <a href="./pages/products/detail.html?id=${product.id}" class="product-link">
              <div class="product-image">
                <img 
                  src="${product.image_url || 'https://via.placeholder.com/400x400?text=' + encodeURIComponent(product.name)}"
                  alt="${product.name}"
                  loading="${index > 3 ? 'lazy' : 'eager'}"
                  decoding="async"
                >
                ${isNew ? '<span class="badge badge-new">New</span>' : ''}
                ${isBestSeller ? '<span class="badge badge-sale">Best Seller</span>' : ''}
              </div>
              <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-pricing">
                  <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
                  <button class="btn btn-primary btn-sm" data-action="add-to-cart" data-product-id="${product.id}" style="margin-top: auto;">Add to Cart</button>
                </div>
                <div class="product-meta">
                  <span class="rating">★★★★☆ (${reviews})</span>
                </div>
              </div>
            </a>
          </article>
        `;
        }).join('');
        
        // Add event listeners to all Add to Cart buttons
        container.querySelectorAll('[data-action="add-to-cart"]').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.preventDefault(); // Prevent link navigation
            const originalText = btn.textContent;
            const productId = btn.dataset.productId;
            
            btn.disabled = true;
            btn.textContent = 'Adding...';
            
            try {
              // Note: We need to handle path differences for the homepage import
              // Since cart.js is imported from root script.js, we might need to adjust logic inside addToCart 
              // but addToCart uses getLocalCart which is path-agnostic (localStorage).
              await addToCart(productId, 1);
              
              btn.textContent = 'Added! ✓';
              btn.classList.add('btn-success');
              setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
                btn.classList.remove('btn-success');
              }, 2000);
            } catch (err) {
              console.error(err);
              btn.textContent = 'Error';
              setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
              }, 2000);
            }
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
