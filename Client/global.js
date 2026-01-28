import { getCurrentUser, logout } from './pages/shared/utils/api/auth.js';

// Common Initialization
const updateHeader = () => {
  const user = getCurrentUser();
  const header = document.getElementById('main-header');
  if (!header) return;

  if (user) {
    header.innerHTML = `
      <nav style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 2rem; background: var(--color-bg-primary); border-bottom: 1px solid var(--color-border-light); flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 2rem;">
          <a href="/" style="font-size: 1.5rem; font-weight: bold; color: var(--color-primary-500);">ShopHub</a>
          <a href="/" class="nav-link">Home</a>
          <a href="/pages/products/" class="nav-link">Shop</a>
        </div>
        <div style="display: flex; align-items: center; gap: 1.5rem;">
          <a href="/pages/cart/" style="display: flex; align-items: center; gap: 0.5rem;" title="Cart">🛒</a>
          <span style="color: var(--color-text-secondary);">Hello, ${user.first_name}</span>
          <button id="logout-btn" class="btn btn-sm btn-outline">Logout</button>
        </div>
      </nav>
    `;
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) logoutBtn.addEventListener('click', logout);
  } else {
    header.innerHTML = `
      <nav style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 2rem; background: var(--color-bg-primary); border-bottom: 1px solid var(--color-border-light); flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 2rem;">
          <a href="/" style="font-size: 1.5rem; font-weight: bold; color: var(--color-primary-500);">ShopHub</a>
          <a href="/" class="nav-link">Home</a>
          <a href="/pages/products/" class="nav-link">Shop</a>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <a href="/pages/cart/" style="display: flex; align-items: center;" title="Cart">🛒</a>
          <a href="/pages/login/" class="btn btn-sm btn-outline">Login</a>
          <a href="/pages/register/" class="btn btn-sm btn-primary">Register</a>
        </div>
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

