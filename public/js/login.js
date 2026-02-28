// login.js — compatible with new index.html design

const loginBtn      = document.getElementById("btn");
const errorEl       = document.getElementById("error");
const errorTxt      = document.getElementById("error-text");

// Show / hide error helpers
function showError(msg) {
  errorTxt.textContent = msg;
  errorEl.classList.add("show");
}

function hideError() {
  errorEl.classList.remove("show");
}

// Main login handler
async function handleLogin() {
  hideError();

  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    showError("Please fill all fields.");
    return;
  }

  // Loading state on
  loginBtn.classList.add("loading");
  loginBtn.disabled = true;

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.message || "Login failed. Please try again.");
      return;
    }

    // Save auth data
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    // Role based redirect
    if (["admin", "superadmin"].includes(data.user.role)) {
      window.location.href = "admin.html";
    } else {
      window.location.href = "dashboard.html";
    }

  } catch (err) {
    showError("Server error. Please try again.");
  } finally {
    loginBtn.classList.remove("loading");
    loginBtn.disabled = false;
  }
}

// Button click
loginBtn.addEventListener("click", handleLogin);

// Enter key support
document.getElementById("password").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleLogin();
});

document.getElementById("email").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleLogin();
});