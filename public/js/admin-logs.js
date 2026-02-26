const token = localStorage.getItem("token");

if (!token) {
  alert("Unauthorized");
  window.location.href = "/index.html";
}

const logsTable = document.getElementById("logsTable");
const actionFilter = document.getElementById("actionFilter");
let allLogs = [];
let currentLimit = 10;
const adminFilter = document.getElementById("adminFilter");
const limitSelect = document.getElementById("limitSelect");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");
const userSearch = document.getElementById("userSearch");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const exportLogsBtn = document.getElementById("exportLogsBtn");
const datePreset = document.getElementById("datePreset");

const user = JSON.parse(localStorage.getItem("user"));
const titleEl = document.getElementById("logsTitle");

if (user?.role === "superadmin") {
  titleEl.textContent = "Showing all admin activity logs";
} else {
  titleEl.textContent = "Showing your activity logs";
}

fetch("/api/admin/logs", {
  headers: {
    Authorization: "Bearer " + token
  }
})
  .then(res => res.json())
  .then(logs => {
  allLogs = logs;
  applyFilters();
  updateLoadMoreState();

  // action dropdown
  const actions = [...new Set(logs.map(l => l.action))];
  actions.forEach(action => {
    const opt = document.createElement("option");
    opt.value = action;
    opt.textContent = action;
    actionFilter.appendChild(opt);
  });

  // ✅ admin dropdown (YAHAN hona chahiye)
  const adminMap = new Map();

logs.forEach(l => {
  if (l.adminId?._id) {
    adminMap.set(l.adminId._id, l.adminId.name);
  }
});

adminMap.forEach((name, id) => {
  const opt = document.createElement("option");
  opt.value = id;        // ✅ ObjectId
  opt.textContent = name;
  adminFilter.appendChild(opt);
});


  applyFilters();
})


  // admin dropdown me unique admins bharo


  .catch(err => {
    console.error(err);
    alert("Failed to load logs");
  });

function renderLogs(logs) {
  logsTable.innerHTML = "";

  if (!logs.length) {
    logsTable.innerHTML =
      "<tr><td colspan='5'>No logs found</td></tr>";
    return;
  }

  logs.forEach((log, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="td-num">${index + 1}</td>
      <td class="td-admin">${log.adminId?.name || "Admin"}</td>
      <td class="td-action">${log.action}</td>
      <td class="td-target">${log.targetUserId?.email || "-"}</td>
      <td class="td-time">
        <span class="time-full">${new Date(log.createdAt).toLocaleString()}</span>
        <span class="time-short">${new Date(log.createdAt).toLocaleDateString('en-GB', {day:'2-digit',month:'2-digit',year:'2-digit'})+', '+new Date(log.createdAt).toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'})}</span>
      </td>
    `;

    logsTable.appendChild(tr);
  });
}

function applyFilters() {
  let filteredLogs = [...allLogs];

  const actionValue = actionFilter.value;
  const adminValue = adminFilter.value;

  if (actionValue !== "all") {
    filteredLogs = filteredLogs.filter(
      log => log.action === actionValue
    );
  }

  if (adminValue !== "all") {
    filteredLogs = filteredLogs.filter(
      log => log.adminId?._id === adminValue
    );
  }

  if (fromDate.value) {
  const from = new Date(fromDate.value);
  filteredLogs = filteredLogs.filter(
    log => new Date(log.createdAt) >= from
  );
}

if (toDate.value) {
  const to = new Date(toDate.value);
  to.setHours(23, 59, 59, 999);
  filteredLogs = filteredLogs.filter(
    log => new Date(log.createdAt) <= to
  );
}

if (userSearch.value.trim()) {
  const q = userSearch.value.trim().toLowerCase();

  filteredLogs = filteredLogs.filter(log => {

    const targetEmail =
      log.targetUserId && log.targetUserId.email
        ? log.targetUserId.email.toLowerCase()
        : "";

    const adminName =
      log.adminId && log.adminId.name
        ? log.adminId.name.toLowerCase()
        : "";

    const adminEmail =
      log.adminId && log.adminId.email
        ? log.adminId.email.toLowerCase()
        : "";

    return (
      targetEmail.includes(q) ||
      adminName.includes(q) ||
      adminEmail.includes(q)
    );
  });
}

  // 👉 pagination (latest logs first)
  const sortedLogs = [...filteredLogs].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const paginated = sortedLogs.slice(0, currentLimit);
  renderLogs(paginated);

  // load more visibility control
  if (currentLimit >= sortedLogs.length) {
  } else {
    loadMoreBtn.style.display = "inline-block";
  }

}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function updateLoadMoreState() {
  // Default text hamesha reset
  loadMoreBtn.innerText = "Load older logs";
  loadMoreBtn.style.display = "inline-block";

  // Jab user 10 pe ho
  if (currentLimit < 20) {
    loadMoreBtn.disabled = true;
    return;
  }

  // Jab saare logs load ho chuke ho
  if (currentLimit >= allLogs.length) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.innerText = "No more logs";
    return;
  }

  // Normal case
  loadMoreBtn.disabled = false;
}


actionFilter.addEventListener("change", applyFilters);
adminFilter.addEventListener("change", applyFilters);
userSearch.addEventListener("input", applyFilters);

fromDate.addEventListener("change", () => {
  datePreset.value = "custom";
  applyFilters();
});

toDate.addEventListener("change", () => {
  datePreset.value = "custom";
  applyFilters();
});



limitSelect.addEventListener("change", () => {
  currentLimit = Number(limitSelect.value);
  applyFilters();
  updateLoadMoreState();
});



loadMoreBtn.addEventListener("click", () => {
  if (currentLimit < allLogs.length) {
    currentLimit += 10;
    applyFilters();
  }

  updateLoadMoreState();

  // Disable if all logs are already shown
  if (currentLimit >= allLogs.length) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.innerText = "No more logs";
  }
});

clearFiltersBtn.addEventListener("click", () => {
  // reset filters
  actionFilter.value = "all";
  adminFilter.value = "all";
  fromDate.value = "";
  toDate.value = "";
  userSearch.value = "";
  datePreset.value = "all";

  // reset pagination
  currentLimit = Number(limitSelect.value);

  // reset load more button properly
  updateLoadMoreState();

  // re-render logs
  applyFilters();
});

datePreset.addEventListener("change", () => {
  const value = datePreset.value;
  const today = new Date();

  if (value === "all") {
    fromDate.value = "";
    toDate.value = "";
  }

  if (value === "today") {
    const d = formatDate(today);
    fromDate.value = d;
    toDate.value = d;
  }

  if (value === "7") {
    const from = new Date();
    from.setDate(today.getDate() - 6);

    fromDate.value = formatDate(from);
    toDate.value = formatDate(today);
  }

  if (value === "30") {
    const from = new Date();
    from.setDate(today.getDate() - 29);

    fromDate.value = formatDate(from);
    toDate.value = formatDate(today);
  }

  // custom = user manually selects dates
  if (value === "custom") {
    // do nothing intentionally
  }

  applyFilters();
});

exportLogsBtn.addEventListener("click", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Not authenticated");
    return;
  }

  const params = new URLSearchParams();

  // admin filter (backend)
  if (adminFilter.value && adminFilter.value !== "all") {
    params.append("adminId", adminFilter.value);
  }

  // action filter
  if (actionFilter.value && actionFilter.value !== "all") {
    params.append("action", actionFilter.value);
  }

  // date range
  if (fromDate.value) params.append("from", fromDate.value);
  if (toDate.value) params.append("to", toDate.value);

  // search
  if (userSearch.value.trim()) {

    params.append("search", userSearch.value.trim());
  }

  params.append("limit", currentLimit);

  const query = params.toString();
  const url = query
    ? `/api/admin/logs/export?${query}`
    : `/api/admin/logs/export`;

  fetch(url, {
    headers: {
      Authorization: "Bearer " + token
    }
  })
    .then(res => res.text())
    .then(csv => {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "admin-logs.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    })
    .catch(err => {
      console.error(err);
      alert("Export failed");
    });
});

// Initial state sync
//loadMoreBtn.disabled = currentLimit !== 20;