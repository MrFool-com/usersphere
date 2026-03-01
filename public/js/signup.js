// signup.js — with OTP verification step

let userEmail = ""; // signup ke baad store karenge

// ===== HELPERS =====
function showError(msg) {
  const el = document.getElementById("error");
  document.getElementById("error-text").textContent = msg;
  el.classList.add("show");
}
function hideError() {
  document.getElementById("error").classList.remove("show");
}

// ===== STEP 1: SIGNUP =====
const signupBtn = document.getElementById("btn");

async function handleSignup() {
  hideError();

  const name     = document.getElementById("name").value.trim();
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!name || !email || !password) {
    showError("Please fill all fields.");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError("Please enter a valid email address.");
    return;
  }
  if (password.length < 8) {
    showError("Password must be at least 8 characters.");
    return;
  }

  signupBtn.classList.add("loading");
  signupBtn.disabled = true;

  try {
    const res  = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.message || "Registration failed. Please try again.");
      return;
    }

    // ✅ OTP sent — show OTP step
    userEmail = data.email || email;
    showOtpStep();

  } catch (err) {
    showError("Server error. Please try again.");
  } finally {
    signupBtn.classList.remove("loading");
    signupBtn.disabled = false;
  }
}

signupBtn.addEventListener("click", handleSignup);
["name", "email", "password"].forEach(id => {
  document.getElementById(id).addEventListener("keydown", e => {
    if (e.key === "Enter") handleSignup();
  });
});

// ===== SHOW OTP STEP =====
function showOtpStep() {
  document.getElementById("signup-form").style.display  = "none";
  document.getElementById("otp-step").style.display     = "block";
  document.getElementById("otp-email-display").textContent = userEmail;
  // Auto-focus first OTP box
  document.getElementById("otp-0").focus();
}

// ===== STEP 2: OTP VERIFY =====
async function handleVerifyOtp() {
  hideError();

  const otpInputs = document.querySelectorAll(".otp-box");
  const otp = Array.from(otpInputs).map(i => i.value).join("");

  if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    showError("Please enter the complete 6-digit OTP.");
    return;
  }

  const verifyBtn = document.getElementById("verify-btn");
  verifyBtn.classList.add("loading");
  verifyBtn.disabled = true;

  try {
    const res  = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, otp })
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.message || "Verification failed. Please try again.");
      return;
    }

    // ✅ Verified — redirect to login
    window.location.href = "index.html?verified=1";

  } catch (err) {
    showError("Server error. Please try again.");
  } finally {
    verifyBtn.classList.remove("loading");
    verifyBtn.disabled = false;
  }
}

// ===== RESEND OTP =====
async function handleResendOtp() {
  hideError();
  const resendBtn = document.getElementById("resend-btn");
  resendBtn.disabled = true;
  resendBtn.textContent = "Sending...";

  try {
    const res  = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, name: "resend", password: "resend-trigger" })
    });

    // backend will resend OTP if user is unverified
    const data = await res.json();

    resendBtn.textContent = "Code Resent!";
    setTimeout(() => {
      resendBtn.textContent = "Resend Code";
      resendBtn.disabled = false;
    }, 30000); // 30 sec cooldown

    // Clear OTP boxes
    document.querySelectorAll(".otp-box").forEach(b => b.value = "");
    document.getElementById("otp-0").focus();

  } catch (err) {
    resendBtn.textContent = "Resend Code";
    resendBtn.disabled = false;
    showError("Could not resend OTP. Please try again.");
  }
}

// ===== OTP BOX AUTO-ADVANCE =====
document.addEventListener("DOMContentLoaded", () => {
  const boxes = document.querySelectorAll(".otp-box");

  boxes.forEach((box, i) => {
    box.addEventListener("input", () => {
      // Only allow digits
      box.value = box.value.replace(/\D/g, "").slice(0, 1);
      if (box.value && i < boxes.length - 1) {
        boxes[i + 1].focus();
      }
    });

    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && i > 0) {
        boxes[i - 1].focus();
      }
      if (e.key === "Enter") {
        handleVerifyOtp();
      }
    });

    // Handle paste (e.g. paste "123456")
    box.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      [...text].forEach((char, j) => {
        if (boxes[j]) boxes[j].value = char;
      });
      const next = Math.min(text.length, boxes.length - 1);
      boxes[next].focus();
    });
  });

  // Verify button
  document.getElementById("verify-btn").addEventListener("click", handleVerifyOtp);

  // Resend button
  document.getElementById("resend-btn").addEventListener("click", handleResendOtp);
});