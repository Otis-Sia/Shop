import './global.css'; // Might need adjustment if using module bundler or if global.css is linked in HTML
import { getCurrentUser, logout } from './frontend/shared/utils/api/auth.js';

// Common Initialization
const updateHeader = () => {
  const user = getCurrentUser();
  const header = document.getElementById('main-header');
  if (!header) return;

  if (user) {
    header.innerHTML = `
      <nav>
        <a href="/">Home</a>
        <a href="/frontend/products/">Shop</a>
        <a href="/frontend/cart/">Cart</a>
        <span>Hello, ${user.first_name}</span>
        <button id="logout-btn">Logout</button>
      </nav>
    `;
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) logoutBtn.addEventListener('click', logout);
  } else {
    header.innerHTML = `
      <nav>
        <a href="/">Home</a>
        <a href="/frontend/products/">Shop</a>
        <a href="/frontend/login/">Login</a>
        <a href="/frontend/register/">Register</a>
      </nav>
    `;
  }
};

const initFooter = () => {
    const footer = document.getElementById('main-footer');
    if(footer) footer.innerHTML = '<p>&copy; 2026 Ecommerce Shop. All rights reserved.</p>';
}

document.addEventListener('DOMContentLoaded', () => {
    updateHeader();
    initFooter();
});

