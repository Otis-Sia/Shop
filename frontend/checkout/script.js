import { createOrder } from '../../shared/utils/api/order.js';

const initCheckout = () => {
  const form = document.getElementById('checkout-form');
  
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
