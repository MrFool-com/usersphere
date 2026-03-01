// profile.js

const token = localStorage.getItem("token");

// ===== TOKEN CHECK =====
if (!token) {
  window.location.href = "/index.html";
} else {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (Date.now() > payload.exp * 1000) {
      localStorage.removeItem("token");
      window.location.href = "/index.html";
    }
  } catch {
    localStorage.removeItem("token");
    window.location.href = "/index.html";
  }
}

// ===== LOAD USER DATA =====
fetch("/api/protected/profile/me", {
  headers: { Authorization: "Bearer " + token }
})
  .then(res => {
    if (!res.ok) { localStorage.removeItem("token"); window.location.href = "/index.html"; return; }
    return res.json();
  })
  .then(data => {
    if (!data) return;
    const name = data.user.name || "User";
    const role = data.user.role || "user";

    document.getElementById("username").innerText  = name;
    document.getElementById("avatar").innerText    = name.charAt(0).toUpperCase();
    document.getElementById("newName").value       = name;

    // Email
    const emailEl = document.getElementById("userEmail");
    if (data.user.email) {
      emailEl.innerText      = data.user.email;
      emailEl.style.display  = "block";
    } else {
      emailEl.style.display  = "none";
    }

    // Role badge
    const roleBadge = document.getElementById("roleBadge");
    const icon = role === "superadmin" ? "👑" : role === "admin" ? "🛡️" : "👤";
    roleBadge.className = "role-badge role-" + role;
    roleBadge.innerText = `${icon} ${role}`;

    // Dates
    const fmt = (d) => d
      ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "—";
    document.getElementById("memberSince").innerText = fmt(data.user.createdAt);
    document.getElementById("lastLogin").innerText   = fmt(data.user.lastLogin);
  })
  .catch(() => { localStorage.removeItem("token"); window.location.href = "/index.html"; });

// ===== HELPERS =====
function showAlert(id, msg) {
  const el = document.getElementById(id);
  el.querySelector("span").textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 4000);
}
function hideAlert(id) { document.getElementById(id).classList.remove("show"); }

function setLoading(btn, loading) {
  btn.classList.toggle("loading", loading);
  btn.disabled = loading;
}

// ===== UPDATE NAME =====
document.getElementById("nameBtn").addEventListener("click", async () => {
  hideAlert("name-error"); hideAlert("name-success");

  const newName = document.getElementById("newName").value.trim();
  if (!newName)          return showAlert("name-error", "Name cannot be empty.");
  if (newName.length < 2) return showAlert("name-error", "Name must be at least 2 characters.");

  const btn = document.getElementById("nameBtn");
  setLoading(btn, true);

  try {
    const res  = await fetch("/api/protected/profile/update-name", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ name: newName })
    });
    const data = await res.json();
    if (!res.ok) return showAlert("name-error", data.message || "Update failed.");

    document.getElementById("username").innerText = newName;
    document.getElementById("avatar").innerText   = newName.charAt(0).toUpperCase();
    showAlert("name-success", "Name updated successfully!");
  } catch {
    showAlert("name-error", "Server error. Please try again.");
  } finally {
    setLoading(btn, false);
  }
});

document.getElementById("newName").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("nameBtn").click();
});

// ===== UPDATE PASSWORD =====
document.getElementById("pwdBtn").addEventListener("click", async () => {
  hideAlert("pwd-error"); hideAlert("pwd-success");

  const currentPwd = document.getElementById("currentPwd").value;
  const newPwd     = document.getElementById("newPwd").value;
  const confirmPwd = document.getElementById("confirmPwd").value;

  if (!currentPwd || !newPwd || !confirmPwd) return showAlert("pwd-error", "Please fill all password fields.");
  if (newPwd.length < 8)   return showAlert("pwd-error", "New password must be at least 8 characters.");
  if (newPwd !== confirmPwd) return showAlert("pwd-error", "New passwords do not match.");
  if (currentPwd === newPwd) return showAlert("pwd-error", "New password must be different from current.");

  const btn = document.getElementById("pwdBtn");
  setLoading(btn, true);

  try {
    const res  = await fetch("/api/protected/profile/update-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd })
    });
    const data = await res.json();
    if (!res.ok) return showAlert("pwd-error", data.message || "Update failed.");

    document.getElementById("currentPwd").value = "";
    document.getElementById("newPwd").value     = "";
    document.getElementById("confirmPwd").value = "";
    showAlert("pwd-success", "Password updated! Logging you out...");

    setTimeout(() => {
      localStorage.removeItem("token");
      window.location.href = "/index.html";
    }, 2000);
  } catch {
    showAlert("pwd-error", "Server error. Please try again.");
  } finally {
    setLoading(btn, false);
  }
});