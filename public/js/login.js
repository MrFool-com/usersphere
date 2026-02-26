const loginForm = document.getElementById("loginForm");
const errorBox = document.getElementById("error");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.style.display = "none";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    errorBox.textContent = "Please fill all fields";
    errorBox.style.display = "block";
    return;
  }

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorBox.textContent = data.message || "Login failed";
      errorBox.style.display = "block";
      return;
    }

    // ✅ SAVE AUTH DATA
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    // ✅ ROLE BASED REDIRECT
    if (["admin", "superadmin"].includes(data.user.role)) {
      window.location.href = "admin.html";
    } else {
      window.location.href = "dashboard.html";
    }

  } catch (err) {
    errorBox.textContent = "Server error. Try again.";
    errorBox.style.display = "block";
  }
});
