// ===============================
// ADMIN DASHBOARD SCRIPT
// ===============================

// AUTH GUARD
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user"));

if (!token || !user || !["admin", "superadmin"].includes(user.role)) {
  window.location.href = "/";
}

// ===============================
// DISABLED BUTTON HELPER
// ===============================
function disabledBtn(label, reason) {
  return `<button class="btn btn-disabled" disabled title="${reason}">${label}</button>`;
}

// DOM ELEMENTS
const statusEl        = document.getElementById("status");
const usersCountEl    = document.getElementById("users");
const usersTable      = document.getElementById("usersTable");
const logoutBtn       = document.getElementById("logoutBtn");
const statUsers       = document.getElementById("statUsers");
const statAdmins      = document.getElementById("statAdmins");
const statSuperAdmins = document.getElementById("statSuperAdmins");
const statLogs        = document.getElementById("statLogs");
document.getElementById("adminRoleBadge").className = "role-badge role-" + user.role;
document.getElementById("adminRoleBadge").innerText = user.role;

// ===============================
// NUMBER ANIMATION
// ===============================
function animateValue(element, start, end, duration = 400) {
  let startTime = null;
  function animation(currentTime) {
    if (!startTime) startTime = currentTime;
    const progress = Math.min((currentTime - startTime) / duration, 1);
    element.textContent = Math.floor(progress * (end - start) + start);
    if (progress < 1) requestAnimationFrame(animation);
  }
  requestAnimationFrame(animation);
}

// ===============================
// CARD FLASH EFFECT
// ===============================
function flashCard(element) {
  const card = element.closest(".stat-card");
  if (!card) return;
  card.classList.add("flash");
  setTimeout(() => card.classList.remove("flash"), 900);
}

// ===============================
// ROLE BADGE HELPER
// ===============================
function roleBadge(role) {
  const icons = { user: "👤", admin: "🛡️", superadmin: "👑" };
  return `<span class="role-badge role-${role}">${icons[role] || ""} ${role}</span>`;
}

// ===============================
// LOAD STATS
// ===============================
function loadStats() {
  fetch("/api/admin/stats", {
    headers: { Authorization: "Bearer " + token }
  })
    .then(res => {
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    })
    .then(data => {
      statusEl.textContent = data.system.status;
      usersCountEl.textContent = data.stats.totalUsers + " users";

      const prevUsers       = Number(statUsers.textContent)       || 0;
      const prevAdmins      = Number(statAdmins.textContent)      || 0;
      const prevSuperAdmins = Number(statSuperAdmins.textContent) || 0;
      const prevLogs        = Number(statLogs.textContent)        || 0;

      animateValue(statUsers,       prevUsers,       data.stats.totalUsers);
      animateValue(statAdmins,      prevAdmins,      data.stats.totalAdmins);
      animateValue(statSuperAdmins, prevSuperAdmins, data.stats.totalSuperAdmins);
      animateValue(statLogs,        prevLogs,        data.stats.totalLogs);

      if (prevUsers       !== data.stats.totalUsers)       flashCard(statUsers);
      if (prevAdmins      !== data.stats.totalAdmins)      flashCard(statAdmins);
      if (prevSuperAdmins !== data.stats.totalSuperAdmins) flashCard(statSuperAdmins);
      if (prevLogs        !== data.stats.totalLogs)        flashCard(statLogs);
    })
    .catch(() => {
      localStorage.clear();
      window.location.href = "/";
    });
}

// ===============================
// LOAD USERS
// ===============================
function loadUsers() {
  usersTable.innerHTML = `<tr class="loading-row"><td colspan="4">Loading users...</td></tr>`;

  fetch("/api/admin/users", {
    headers: { Authorization: "Bearer " + token }
  })
    .then(res => {
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    })
    .then(users => {
      usersTable.innerHTML = "";

      if (users.length === 0) {
        usersTable.innerHTML = `<tr class="loading-row"><td colspan="4">No users found</td></tr>`;
        return;
      }

      users.forEach(u => {
        const tr = document.createElement("tr");
        let actions = "";

        // SELF ROW
        if (u._id === user.id) {
          actions = disabledBtn("Self", "You cannot modify your own account");
        }

        // ADMIN LOGGED IN
        else if (user.role === "admin") {
          if (u.role === "superadmin") {
            actions =
              disabledBtn("Make Admin", "SuperAdmin role is protected") +
              disabledBtn("Delete", "SuperAdmin account cannot be deleted");
          } else if (u.role === "admin") {
            actions =
              `<button class="btn btn-demote" onclick="changeRole('${u._id}','user')">Make User</button>` +
              disabledBtn("Delete", "Admins cannot delete other admins");
          } else {
            actions =
              `<button class="btn btn-promote" onclick="changeRole('${u._id}','admin')">Make Admin</button>` +
              `<button class="btn btn-delete" onclick="deleteUser('${u._id}')">Delete</button>`;
          }
        }

        // SUPERADMIN LOGGED IN
        else if (user.role === "superadmin") {
          if (u.role !== "superadmin") {
            actions =
              (u.role === "admin"
                ? `<button class="btn btn-demote" onclick="changeRole('${u._id}','user')">Make User</button>`
                : `<button class="btn btn-promote" onclick="changeRole('${u._id}','admin')">Make Admin</button>`) +
              `<button class="btn btn-delete" onclick="deleteUser('${u._id}')">Delete</button>`;
          } else {
            actions = disabledBtn("Self", "You cannot modify your own account");
          }
        }

        tr.innerHTML = `
          <td><div class="user-name">${u.name}</div></td>
          <td><div class="user-email">${u.email}</div></td>
          <td>${roleBadge(u.role)}</td>
          <td><div class="actions">${actions || "—"}</div></td>
        `;

        usersTable.appendChild(tr);
      });
    })
    .catch(() => {
      localStorage.clear();
      window.location.href = "/";
    });
}

// ===============================
// DELETE USER
// ===============================
function deleteUser(userId) {
  if (!confirm("Are you sure you want to delete this user?")) return;

  fetch(`/api/admin/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token }
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message || "User deleted");
      loadUsers();
      loadStats();
    })
    .catch(() => alert("Delete failed"));
}

// ===============================
// CHANGE ROLE
// ===============================
function changeRole(userId, newRole) {
  if (!confirm(`Change role to ${newRole}?`)) return;

  fetch(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ role: newRole })
  })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      loadUsers();
      loadStats();
    })
    .catch(() => alert("Role change failed"));
}

// ===============================
// LOGOUT
// ===============================
logoutBtn.onclick = () => {
  localStorage.clear();
  window.location.href = "/";
};

// INITIAL LOAD
loadStats();
loadUsers();
