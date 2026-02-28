// signup.js — compatible with new signup.html design

const signupBtn = document.getElementById("btn");
const signupErr = document.getElementById("error");
const signupErrTxt = document.getElementById("error-text");

// Show / hide error helpers
function showSignupError(msg) {
  signupErrTxt.textContent = msg;
  signupErr.classList.add("show");
}

function hideSignupError() {
  signupErr.classList.remove("show");
}

// Main signup handler
async function handleSignup() {
  hideSignupError();

  const name     = document.getElementById("name").value.trim();
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  // Frontend validation
  if (!name || !email || !password) {
    showSignupError("Please fill all fields.");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showSignupError("Please enter a valid email address.");
    return;
  }

  if (password.length < 8) {
    showSignupError("Password must be at least 8 characters.");
    return;
  }

  // Loading state on
  signupBtn.classList.add("loading");
  signupBtn.disabled = true;

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showSignupError(data.message || "Registration failed. Please try again.");
      return;
    }

    // ✅ Success — redirect to login
    window.location.href = "index.html";

  } catch (err) {
    showSignupError("Server error. Please try again.");
  } finally {
    signupBtn.classList.remove("loading");
    signupBtn.disabled = false;
  }
}

// Button click
signupBtn.addEventListener("click", handleSignup);

// Enter key support
document.getElementById("password").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSignup();
});

document.getElementById("email").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSignup();
});

document.getElementById("name").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSignup();
});