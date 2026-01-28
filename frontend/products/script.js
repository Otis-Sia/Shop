import { getProducts } from '../../shared/utils/api/products.js';

const initProducts = async () => {
  const container = document.getElementById('products-grid');
  const searchInput = document.getElementById('search-input');
  const maxPriceInput = document.getElementById('max-price-input');
  const applyBtn = document.getElementById('apply-filters-btn');
  const clearBtn = document.getElementById('clear-filters-btn');
  const countEl = document.getElementById('product-count');

  const render = async (filterParams = {}) => {
    container.innerHTML = '<p style="text-align: center; grid-column: 1/-1;"><span class="loading"></span> Loading products...</p>';
    
    try {
      const products = await getProducts(filterParams);
      
      if (!products || products.length === 0) {
        container.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: #6b7280;">No products found. Try adjusting your filters.</p>';
        countEl.textContent = 'No products found';
        return;
      }
      
      countEl.textContent = `Showing ${products.length} product${products.length !== 1 ? 's' : ''}`;
      
      container.innerHTML = products.map(product => `
        <div class="product-card">
          <div class="product-image">
            <img src="${product.image_url || 'https://via.placeholder.com/300x200?text=Product'}" alt="${product.name}">
          </div>
          <div class="product-info">
            <h3>${product.name}</h3>
            <p class="product-description">${product.description || 'Premium quality product'}</p>
            <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
            <button class="btn btn-primary" data-action="add-to-cart">Add to Cart</button>
          </div>
        </div>
      `).join('');
      
      // Add event listeners to all Add to Cart buttons
      container.querySelectorAll('[data-action="add-to-cart"]').forEach(btn => {
        btn.addEventListener('click', () => {
          alert('Add to cart feature coming soon!');
        });
      });
    } catch (error) {
      console.error('Error loading products:', error);
      container.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: #ef4444;">Failed to load products. Please try again.</p>';
      countEl.textContent = 'Error loading products';
    }
  };

  await render();

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const keyword = searchInput.value.trim();
      const maxPrice = maxPriceInput.value;
      render({ keyword, maxPrice });
    });
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      maxPriceInput.value = '';
      render();
    });
  }
  
  // Allow Enter key to apply filters
  [searchInput, maxPriceInput].forEach(input => {
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          applyBtn.click();
        }
      });
    }
  });
};

document.addEventListener('DOMContentLoaded', initProducts);
