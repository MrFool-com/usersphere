// reset-password.js

const urlParams = new URLSearchParams(window.location.search);
const token     = urlParams.get("token");

// Agar token URL mein nahi → expired box dikhao
if (!token) {
  showExpired();
}

const resetBtn   = document.getElementById("btn");
const resetArrow = document.getElementById("btn-arrow");

resetBtn.addEventListener("mouseenter", () => resetArrow.style.transform = "translateX(3px)");
resetBtn.addEventListener("mouseleave", () => resetArrow.style.transform = "translateX(0)");

function showError(msg) {
  document.getElementById("error-text").textContent = msg;
  document.getElementById("error").classList.add("show");
}

function hideError() {
  document.getElementById("error").classList.remove("show");
}

function getStrength(pwd) {
  let s = 0;
  if (pwd.length >= 8)          s++;
  if (/[A-Z]/.test(pwd))        s++;
  if (/[0-9]/.test(pwd))        s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

resetBtn.addEventListener("click", async () => {
  hideError();

  const password = document.getElementById("password").value;
  const confirm  = document.getElementById("confirm").value;

  if (!password) {
    showError("Please enter a new password.");
    return;
  }

  if (getStrength(password) < 2) {
    showError("Password is too weak. Add uppercase letters, numbers, or symbols.");
    return;
  }

  if (password !== confirm) {
    showError("Passwords do not match.");
    return;
  }

  resetBtn.classList.add("loading");
  resetBtn.disabled = true;

  try {
    const res = await fetch(`/api/auth/reset-password/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    const data = await res.json();

    if (res.ok) {
      showSuccess();
    } else {
      if (data.message && data.message.includes("expired")) {
        showExpired();
      } else {
        showError(data.message || "Something went wrong. Please try again.");
        resetBtn.classList.remove("loading");
        resetBtn.disabled = false;
      }
    }

  } catch (err) {
    showError("Network error. Please check your connection.");
    resetBtn.classList.remove("loading");
    resetBtn.disabled = false;
  }
});

// Enter key support
document.getElementById("confirm").addEventListener("keydown", (e) => {
  if (e.key === "Enter") resetBtn.click();
});