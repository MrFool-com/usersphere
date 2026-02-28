// forgot-password.js

const forgotBtn   = document.getElementById('btn');
const forgotArrow = document.getElementById('btn-arrow');

// Button arrow nudge on hover
forgotBtn.addEventListener('mouseenter', () => forgotArrow.style.transform = 'translateX(3px)');
forgotBtn.addEventListener('mouseleave', () => forgotArrow.style.transform = 'translateX(0)');

// Helper functions
function showError(msg) {
  document.getElementById('error-text').textContent = msg;
  document.getElementById('error').classList.add('show');
  document.getElementById('success').classList.remove('show');
}

function showSuccess(email) {
  document.getElementById('success-text').textContent =
    `If ${email} is registered, a reset link has been sent. Check your inbox.`;
  document.getElementById('success').classList.add('show');
  document.getElementById('error').classList.remove('show');
  document.getElementById('email').value = '';

  forgotBtn.disabled = true;
  forgotBtn.style.opacity = '0.6';
  forgotBtn.style.cursor  = 'not-allowed';
}

function hideAll() {
  document.getElementById('error').classList.remove('show');
  document.getElementById('success').classList.remove('show');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Main handler
forgotBtn.addEventListener('click', async () => {
  hideAll();

  const email = document.getElementById('email').value.trim();

  if (!email) {
    showError('Please enter your email address.');
    return;
  }

  if (!isValidEmail(email)) {
    showError('Please enter a valid email address.');
    return;
  }

  forgotBtn.classList.add('loading');
  forgotBtn.disabled = true;

  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    // Always success dikhao — security best practice
    showSuccess(email);

  } catch (err) {
    showError('Something went wrong. Please try again.');
  } finally {
    forgotBtn.classList.remove('loading');
  }
});

// Enter key support
document.getElementById('email').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') forgotBtn.click();
});