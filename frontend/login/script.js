import { login } from '../../shared/utils/api/auth.js';

const initLogin = () => {
  const form = document.getElementById('login-form');
  const errorDiv = document.getElementById('error-message');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      errorDiv.textContent = '';
      
      try {
        const { ok, data } = await login(email, password);
        if (ok) {
          window.location.href = '/'; 
        } else {
          errorDiv.textContent = data.message || 'Login failed';
        }
      } catch (err) {
        errorDiv.textContent = 'An error occurred. Please try again.';
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', initLogin);
