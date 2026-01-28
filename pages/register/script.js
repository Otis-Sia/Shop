import { register } from '../../shared/utils/api/auth.js';

const initRegister = () => {
  const form = document.getElementById('register-form');
  const errorDiv = document.getElementById('error-message');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const firstName = document.getElementById('first-name').value;
      const lastName = document.getElementById('last-name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      errorDiv.textContent = '';

      try {
        const { ok, data } = await register(email, password, firstName, lastName);
        if (ok) {
          window.location.href = '/';
        } else {
          errorDiv.textContent = data.message || 'Registration failed';
        }
      } catch (err) {
        errorDiv.textContent = 'An error occurred.';
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', initRegister);
