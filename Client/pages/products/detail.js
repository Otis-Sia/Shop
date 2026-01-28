import { getProduct } from '../../shared/utils/api/products.js';
import { addToCart } from '../../shared/utils/api/cart.js';

document.addEventListener('DOMContentLoaded', async () => {
    // helpers
    const getQueryParam = (param) => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    };

    const productId = getQueryParam('id');
    const container = document.getElementById('product-content');
    const loading = document.getElementById('loading-indicator');
    const errorEl = document.getElementById('error-message');

    if (!productId) {
        loading.style.display = 'none';
        errorEl.classList.remove('d-none');
        return;
    }

    try {
        const product = await getProduct(productId);
        
        if (!product) {
            throw new Error('Product not found');
        }
        
        renderProduct(product);
        loading.style.display = 'none';
        container.classList.remove('d-none');
        
    } catch (error) {
        console.error(error);
        loading.style.display = 'none';
        errorEl.classList.remove('d-none');
    }
});

let selectedColor = null;
let selectedSize = null;
let quantity = 1;

const renderProduct = (product) => {
    // Basic Info
    document.title = `${product.name} - ShopHub`;
    document.getElementById('breadcrumb-product-name').textContent = product.name;
    document.getElementById('product-category').textContent = product.category;
    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-price').textContent = `$${parseFloat(product.price).toFixed(2)}`;
    document.getElementById('product-description').textContent = product.description;
    
    // Image
    const imgEl = document.getElementById('main-image');
    imgEl.src = product.image_url || `https://via.placeholder.com/600x600?text=${encodeURIComponent(product.name)}`;
    imgEl.alt = product.name;
    
    // Badges
    const badgeContainer = document.getElementById('product-badges');
    if (product.tags && product.tags.length > 0) {
        product.tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = `detail-badge badge-${tag}`; // e.g., badge-new
            span.textContent = tag;
            badgeContainer.appendChild(span);
        });
    }

    // Rating (Randomized for demo as data doesn't have it)
    const rating = (Math.random() * 1.5 + 3.5).toFixed(1); // 3.5 to 5.0
    const reviews = Math.floor(Math.random() * 200) + 10;
    document.getElementById('product-rating').innerHTML = `★ ★ ★ ★ ☆ <span style="font-size: 0.875rem; color: #6b7280; margin-left: 0.5rem;">(${reviews} reviews)</span>`;

    // Options Logic
    renderOptions(product);

    // Quantity Logic
    setupQuantity();

    // Add to Cart
    const addBtn = document.getElementById('add-to-cart-btn');
    addBtn.addEventListener('click', () => handleAddToCart(product));
};

const renderOptions = (product) => {
    // Colors
    const colorContainer = document.getElementById('color-options');
    const colorLabel = document.getElementById('selected-color-name');
    const colorSection = document.getElementById('color-options-container');

    if (product.colors && product.colors.length > 0) {
        // Select first by default
        selectedColor = product.colors[0];
        colorLabel.textContent = selectedColor;

        product.colors.forEach(color => {
            const btn = document.createElement('button');
            btn.className = `color-option ${color === selectedColor ? 'selected' : ''}`;
            btn.title = color;
            
            // Try to map color names to CSS colors, or use a default
            // In a real app, this mapping would be robust or come from DB (hex codes)
            btn.style.backgroundColor = mapColorToCss(color);
            
            btn.addEventListener('click', () => {
                // Update selection
                document.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedColor = color;
                colorLabel.textContent = color;
            });
            
            colorContainer.appendChild(btn);
        });
    } else {
        colorSection.style.display = 'none';
    }

    // Sizes
    const sizeContainer = document.getElementById('size-options');
    const sizeLabel = document.getElementById('selected-size-name');
    const sizeSection = document.getElementById('size-options-container');

    if (product.sizes && product.sizes.length > 0) {
        // Select first by default
        selectedSize = product.sizes[0];
        sizeLabel.textContent = selectedSize;

        product.sizes.forEach(size => {
            const btn = document.createElement('button');
            btn.className = `text-option ${size === selectedSize ? 'selected' : ''}`;
            btn.textContent = size;
            
            btn.addEventListener('click', () => {
                document.querySelectorAll('.text-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedSize = size;
                sizeLabel.textContent = size;
            });
            
            sizeContainer.appendChild(btn);
        });
    } else {
        sizeSection.style.display = 'none';
    }
    
    // Hide options wrapper if neither exist
    if ((!product.colors || product.colors.length === 0) && (!product.sizes || product.sizes.length === 0)) {
        document.getElementById('product-options').style.display = 'none';
    }
};

const setupQuantity = () => {
    const min = document.getElementById('qty-minus');
    const plus = document.getElementById('qty-plus');
    const input = document.getElementById('qty-input');

    min.addEventListener('click', () => {
        let val = parseInt(input.value);
        if (val > 1) {
            input.value = val - 1;
            quantity = val - 1;
        }
    });

    plus.addEventListener('click', () => {
        let val = parseInt(input.value);
        if (val < 10) { // Max limit
            input.value = val + 1;
            quantity = val + 1;
        }
    });

    input.addEventListener('change', (e) => {
        let val = parseInt(e.target.value);
        if (val < 1) val = 1;
        if (val > 10) val = 10;
        e.target.value = val;
        quantity = val;
    });
};

const handleAddToCart = async (product) => {
    const btn = document.getElementById('add-to-cart-btn');
    const originalText = btn.textContent;
    
    btn.disabled = true;
    btn.textContent = 'Adding...';

    // Construct item with options
    // Note: The generic addToCart API might just take ID and Qty. 
    // If we wanted to support options in the cart, we'd need to update the cart logic to store options.
    // For now, we'll assume the basic cart and just add the item.
    // In a real app, we'd pass { id, qty, color: selectedColor, size: selectedSize }
    
    try {
        console.log(`Adding to cart: ${product.name} (Color: ${selectedColor}, Size: ${selectedSize}, Qty: ${quantity})`);
        
        await addToCart(product.id, quantity);
        
        btn.textContent = 'Added! ✓';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-success'); // Assuming we have this class or similar style
        btn.style.backgroundColor = 'var(--color-success-base)'; // Inline fail-safe
        btn.style.borderColor = 'var(--color-success-base)';

        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-success');
            btn.style.backgroundColor = '';
            btn.style.borderColor = '';
        }, 2000);
        
    } catch (error) {
        console.error(error);
        btn.textContent = 'Error';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);
    }
};

// Simple helper to map color names to CSS values
const mapColorToCss = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('black')) return '#000000';
    if (lower.includes('white')) return '#ffffff';
    if (lower.includes('red')) return '#ef4444';
    if (lower.includes('blue')) return '#3b82f6';
    if (lower.includes('green')) return '#22c55e';
    if (lower.includes('gray') || lower.includes('grey') || lower.includes('silver')) return '#9ca3af';
    if (lower.includes('gold') || lower.includes('starlight')) return '#fde047';
    if (lower.includes('pink')) return '#f9a8d4';
    if (lower.includes('purple') || lower.includes('violet')) return '#a855f7';
    if (lower.includes('navy')) return '#1e3a8a';
    if (lower.includes('khaki')) return '#d4d4aa';
    if (lower.includes('olive')) return '#808000';
    // Default fallback
    return '#e5e7eb';
};
