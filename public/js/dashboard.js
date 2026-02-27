// ===============================
// 🔐 TOKEN CHECK
// ===============================
const token = localStorage.getItem("token");

const checkTokenExpiry = (token) => {
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiry = payload.exp * 1000;

    if (Date.now() > expiry) {
      localStorage.removeItem("token");
      window.location.href = "/index.html";
    }
  } catch (err) {
    localStorage.removeItem("token");
    window.location.href = "/index.html";
  }
};

checkTokenExpiry(token);

// ===============================
// 📅 DATE FORMATTER
// ===============================
const formatDate = (date) =>
  new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

// ===============================
// 📡 FETCH DASHBOARD DATA
// ===============================
fetch("/api/dashboard", {
  headers: { Authorization: "Bearer " + token }
})
  .then(res => {
    if (!res.ok) {
        localStorage.removeItem("token");
        window.location.href = "/index.html";
        return;  // ← return
    }
    return res.json();
    })
  .then(data => {

    // username
    document.getElementById("username").innerText =
      "Welcome, " + (data.user.username || data.user.name || "User");

    // avatar first letter
    const avatar = document.getElementById("avatar");
    const name = data.user.name || "User";
    avatar.innerText = name.charAt(0).toUpperCase();


    // role badge with icon
    const roleBadge = document.getElementById("roleBadge");
    const role = data.user.role;

    let icon = "👤";

    if (role === "admin") icon = "🛡️";
    if (role === "superadmin") icon = "👑";

    roleBadge.className = "role-badge role-" + role;
    roleBadge.innerText = `${icon} ${role}`;

    // account created
    document.getElementById("created").innerText =
      formatDate(data.user.createdAt);

    // last login
    document.getElementById("lastLogin").innerText =
      data.user.lastLogin
        ? formatDate(data.user.lastLogin)
        : "Not available";

    // ===============================
    // QUICK STATS
    // ===============================

    // account age
    const created = new Date(data.user.createdAt);
    const days =
    Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));

    document.getElementById("accountAge").innerText =
    days + " days";

    // indicates last active time
    document.getElementById("lastActive").innerText =
    data.user.lastLogin
        ? formatDate(data.user.lastLogin)
        : "—";

    // ===============================
    // 📋 RECENT ACTIVITIES
    // ===============================
   
    const list = document.getElementById("activityList");
    list.innerHTML = "";
    document.getElementById("totalActivities").innerText =
        (data.totalActivities ?? 0) + " actions";

    /* ---------- EMPTY STATE ---------- */
    if (!data.recentActivities || data.recentActivities.length === 0) {
        list.innerHTML = `
            <li class="no-activity">
            <div class="activity-row">
                <div class="activity-action empty-text">
                No recent activity
                </div>
            </div>
            </li>
        `;
        return;
        }

    data.recentActivities.forEach((act, index) => {

    const li = document.createElement("li");
    const date = new Date(act.createdAt);

    // 👇 YAHAN add karo
    if (index !== data.recentActivities.length - 1) {
        li.classList.add("has-separator");
    }

    li.innerHTML = `
        <div class="activity-row">
            <div class="activity-action">${act.action}</div>

            <div class="activity-time">
                ${date.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                })}
                ${date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                })}
            </div>
        </div>
    `;

    list.appendChild(li);
    });
  })

  .catch(err => {
    console.log(err);
    localStorage.removeItem("token");
    window.location.href = "/index.html";
  });

// ===============================
// 🚪 LOGOUT BUTTON
// ===============================
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/index.html";
});

// ===============================
// 🟢 SYSTEM STATUS CHECK
// ===============================
async function checkSystemStatus() {
  try {
    const res = await fetch("/status");
    const data = await res.json();

    document.getElementById("systemStatus").innerHTML =
      "🟢 System Online";
  } catch {
    document.getElementById("systemStatus").innerHTML =
      "🔴 System Offline";
  }
}

checkSystemStatus();