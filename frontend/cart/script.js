import { getCart, removeFromCart } from '../../shared/utils/api/cart.js';

const initCart = async () => {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  const subtotalEl = document.getElementById('cart-subtotal');

  const render = async () => {
    try {
      const cart = await getCart();
      
      if (!cart || !cart.CartItems || cart.CartItems.length === 0) {
        container.innerHTML = `
          <div class="empty-cart">
            <div class="empty-cart-icon">🛒</div>
            <h3>Your cart is empty</h3>
            <p>Add some products to get started!</p>
            <a href="../products/" class="btn btn-primary" style="margin-top: 1rem; display: inline-block;">Browse Products</a>
          </div>
        `;
        totalEl.textContent = '$0.00';
        if (subtotalEl) subtotalEl.textContent = '$0.00';
        return;
      }

      let total = 0;
      
      container.innerHTML = cart.CartItems.map(item => {
        const product = item.Product;
        const itemTotal = parseFloat(product.price) * item.quantity;
        total += itemTotal;
        
        return `
          <div class="cart-item">
            <img src="${product.image_url || 'https://via.placeholder.com/80?text=Product'}" alt="${product.name}">
            <div class="item-details">
              <h4>${product.name}</h4>
              <p>$${parseFloat(product.price).toFixed(2)} × ${item.quantity} = $${itemTotal.toFixed(2)}</p>
            </div>
            <button class="btn btn-danger btn-sm" data-product-id="${product.id}">Remove</button>
          </div>
        `;
      }).join('');
      
      container.querySelectorAll('[data-product-id]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const productId = e.target.getAttribute('data-product-id');
          if (confirm('Remove this item from your cart?')) {
            await removeFromCart(productId);
            await render();
          }
        });
      });

      totalEl.textContent = `$${total.toFixed(2)}`;
      if (subtotalEl) subtotalEl.textContent = `$${total.toFixed(2)}`;
    } catch (error) {
      console.error('Error loading cart:', error);
      container.innerHTML = '<p style="text-align: center; color: #ef4444;">Failed to load cart. Please try again.</p>';
    }
  };

  await render();
};

document.addEventListener('DOMContentLoaded', initCart);
