import { createOrder } from '../../shared/utils/api/order.js';
import { getCart } from '../../shared/utils/api/cart.js';

const initCheckout = async () => {
  const form = document.getElementById('checkout-form');
  const container = document.querySelector('.checkout-container');

  // Display Order Summary
  try {
    const cart = await getCart();
    if (cart && cart.CartItems && cart.CartItems.length > 0) {
      const total = cart.CartItems.reduce((sum, item) => sum + (parseFloat(item.Product.price) * item.quantity), 0);
      
      const summaryHTML = `
        <div class="card" style="margin-bottom: 2rem; background: var(--color-bg-secondary);">
          <div class="card-body">
            <h3>Order Summary</h3>
            <p><strong>${cart.CartItems.length} Items</strong></p>
            <hr style="margin: 1rem 0; border: 0; border-top: 1px solid var(--color-border-base);">
            <div style="display: flex; justify-content: space-between; font-size: 1.25rem; font-weight: bold;">
              <span>Total to Pay:</span>
              <span style="color: var(--color-primary-500);">$${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      `;
      
      const noteEl = document.querySelector('.checkout-note');
      if (noteEl) {
        noteEl.insertAdjacentHTML('afterend', summaryHTML);
      }
    } else {
        // Redirect if cart is empty
        window.location.href = '../cart/';
    }
  } catch (err) {
    console.error('Failed to load cart summary', err);
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (confirm('Confirm order placement?')) {
        const order = await createOrder();
        if (order) {
           alert(`Order #${order.id} placed successfully!`);
           window.location.href = '/'; 
        }
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', initCheckout);
