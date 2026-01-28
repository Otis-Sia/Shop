import { getProducts } from '../../shared/utils/api/products.js';
import { addToCart } from '../../shared/utils/api/cart.js';

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
      
      container.innerHTML = products.map((product, index) => {
        const discount = Math.random() > 0.7 ? Math.floor(Math.random() * 40) + 10 : 0;
        const originalPrice = discount ? (parseFloat(product.price) / (1 - discount/100)).toFixed(2) : null;
        const isExpress = Math.random() > 0.6;
        const rating = (Math.random() * 2 + 3).toFixed(1);
        const reviews = Math.floor(Math.random() * 500) + 10;
        
        return `
        <article class="product-card" data-product-id="${product.id}" data-category="${product.category || 'general'}">
          <a href="./detail.html?id=${product.id}" class="product-link" data-product-id="${product.id}">
            <div class="product-image">
              <img 
                ${index > 3 ? 'data-src' : 'src'}="${product.image_url || 'https://via.placeholder.com/400x400?text=' + encodeURIComponent(product.name)}"
                alt="${product.name}"
                loading="${index > 3 ? 'lazy' : 'eager'}"
                decoding="async"
                ${index > 3 ? 'class="skeleton"' : ''}
              >
              ${isExpress ? '<span class="badge badge-express">Express</span>' : ''}
              ${discount > 0 ? `<span class="badge badge-deal">-${discount}%</span>` : ''}
            </div>
            <div class="product-info">
              <h3 class="product-name">${product.name}</h3>
              <div class="product-pricing">
                <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
                ${originalPrice ? `<span class="price-original">$${originalPrice}</span>` : ''}
                <button class="btn btn-primary" data-action="add-to-cart" data-product-id="${product.id}">Add to Cart</button>
              </div>
              <div class="product-meta">
                <span class="rating" title="${rating} out of 5 stars">★★★★☆ (${reviews})</span>
              </div>
            </div>
          </a>
        </article>
      `;
      }).join('');
      
      // Initialize lazy loading for images
      initLazyLoading();
      
      // Add event listeners to product links
      container.querySelectorAll('.product-link').forEach(link => {
        link.addEventListener('click', (e) => {
          // Prevent navigation if the click was on the "Add to Cart" button
          if (e.target.closest('[data-action="add-to-cart"]')) {
            return;
          }
          // Allow native navigation to the details page
          // e.preventDefault(); // Removed to allow navigation
        });
      });

      // Add event listeners to all Add to Cart buttons
      container.querySelectorAll('[data-action="add-to-cart"]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const originalText = btn.textContent;
          const productId = btn.dataset.productId;
          
          btn.disabled = true;
          btn.textContent = 'Adding...';
          
          try {
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

// Lazy Loading Implementation
const initLazyLoading = () => {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.classList.remove('skeleton');
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px'
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  } else {
    // Fallback for browsers without IntersectionObserver
    document.querySelectorAll('img[data-src]').forEach(img => {
      img.src = img.dataset.src;
      img.classList.remove('skeleton');
    });
  }
};

// Search debouncing
let searchDebounceTimer;
const initSearchAutocomplete = (searchInput) => {
  if (!searchInput) return;
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    const value = e.target.value.trim();
    
    if (value.length > 2) {
      searchDebounceTimer = setTimeout(() => {
        console.log('Search for:', value);
        // Future: Implement autocomplete API call
      }, 300);
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  initProducts();
  initSearchAutocomplete(document.getElementById('search-input'));
});
