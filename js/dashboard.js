// ========================================
// TOAST NOTIFICATION SYSTEM
// ========================================
function showToast(message, type) {
  type = type || "success";
  var container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  var toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  var icon = type === "success" ? "✓" : "✕";
  toast.innerHTML = '<span class="toast-icon">' + icon + "</span>" + message;
  container.appendChild(toast);
  setTimeout(function () {
    toast.classList.add("toast-out");
    setTimeout(function () { toast.remove(); }, 300);
  }, 3000);
}

// ========================================
// HELPERS
// ========================================
function getInitials(name) {
  if (!name) return "?";
  var parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

function getBadgeClass(status) {
  var map = {
    active: "badge-active",
    available: "badge-available",
    found: "badge-found",
    claimed: "badge-claimed",
    pending: "badge-pending",
    accepted: "badge-accepted",
    rejected: "badge-rejected"
  };
  return map[status] || "badge-found";
}

function showSpinner(container) {
  container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
}

function showEmpty(container, emoji, text) {
  container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">' + emoji + '</div><p>' + text + '</p></div>';
}

// ========================================
// SIDEBAR INIT
// ========================================
function initSidebar() {
  var currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (currentUser) {
    var avatarEl = document.getElementById("userAvatar");
    var nameEl = document.getElementById("userName");
    var emailEl = document.getElementById("userEmail");
    if (avatarEl) avatarEl.textContent = getInitials(currentUser.name);
    if (nameEl) nameEl.textContent = currentUser.name || "—";
    if (emailEl) emailEl.textContent = currentUser.email || "—";
  }

  // Hamburger toggle
  var hamburger = document.getElementById("hamburgerBtn");
  var sidebar = document.getElementById("sidebar");
  var overlay = document.getElementById("sidebarOverlay");

  if (hamburger && sidebar) {
    hamburger.addEventListener("click", function () {
      sidebar.classList.toggle("open");
      if (overlay) overlay.classList.toggle("open");
    });
  }
  if (overlay) {
    overlay.addEventListener("click", function () {
      sidebar.classList.remove("open");
      overlay.classList.remove("open");
    });
  }
}

// ========================================
// SESSION CHECK
// ========================================
var supabase = window.supabaseClient;
var currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
  window.location.href = "index.html";
}

async function init() {
  if (supabase) {
    var _ref = await supabase.auth.getSession();
    var session = _ref.data.session;
    if (!session) {
      localStorage.removeItem("currentUser");
      window.location.href = "index.html";
      return;
    }
  }

  initSidebar();

  var logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function () {
      if (supabase) await supabase.auth.signOut();
      localStorage.removeItem("currentUser");
      window.location.href = "index.html";
    });
  }

  showTab("lost");
}

// ========================================
// TAB SYSTEM
// ========================================
function switchTab(tab, el) {
  // Update sidebar nav
  var navLinks = document.querySelectorAll(".sidebar-nav .nav-link");
  navLinks.forEach(function (link) { link.classList.remove("active"); });
  var navMap = { lost: "navLost", found: "navFound", requests: "navRequests" };
  var navEl = document.getElementById(navMap[tab]);
  if (navEl) navEl.classList.add("active");

  // Update tab bar
  var tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(function (btn) { btn.classList.remove("active"); });
  if (el && el.classList.contains("tab-btn")) {
    el.classList.add("active");
  } else {
    // Match by index
    var idx = tab === "lost" ? 0 : tab === "found" ? 1 : 2;
    if (tabBtns[idx]) tabBtns[idx].classList.add("active");
  }

  showTab(tab);
}

function showTab(tab) {
  var container = document.getElementById("tabContent");
  if (!container) return;
  container.innerHTML = "";
  if (tab === "lost") showLostItems();
  if (tab === "found") showFoundItems();
  if (tab === "requests") showRequests();
}

// ========================================
// MY LOST ITEMS
// ========================================
async function showLostItems() {
  var container = document.getElementById("tabContent");
  if (!supabase) { showEmpty(container, "⚠️", "Supabase not loaded."); return; }
  showSpinner(container);

  var { data: items, error } = await supabase
    .from("lost_items")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = '<p style="color:var(--danger);">Error: ' + error.message + '</p>';
    return;
  }
  if (!items || items.length === 0) {
    showEmpty(container, "📭", "No lost items posted yet.");
    return;
  }

  var grid = document.createElement("div");
  grid.className = "items-grid";

  items.forEach(function (item) {
    var card = document.createElement("div");
    card.className = "card";
    card.innerHTML =
      '<div class="card-title">' + item.title + '</div>' +
      '<span class="badge ' + getBadgeClass(item.status) + '">' + item.status + '</span>' +
      '<p class="card-meta mt-8"><strong>Category:</strong> ' + (item.category || "—") + '</p>' +
      '<p class="card-meta"><strong>Location:</strong> ' + (item.location || "—") + '</p>' +
      '<p class="card-meta"><strong>Date Lost:</strong> ' + (item.date_lost || "—") + '</p>' +
      '<div class="card-actions">' +
        '<button class="btn btn-outline-danger" onclick="deleteLost(' + item.id + ')">Delete</button>' +
      '</div>';
    grid.appendChild(card);
  });
  container.innerHTML = "";
  container.appendChild(grid);
}

async function deleteLost(id) {
  if (!supabase) return;
  var { error } = await supabase
    .from("lost_items")
    .delete()
    .eq("id", id)
    .eq("user_id", currentUser.id);

  if (error) {
    showToast("Could not delete item: " + error.message, "error");
    return;
  }
  showToast("Item deleted.");
  showLostItems();
}

// ========================================
// MY FOUND ITEMS
// ========================================
async function showFoundItems() {
  var container = document.getElementById("tabContent");
  if (!supabase) { showEmpty(container, "⚠️", "Supabase not loaded."); return; }
  showSpinner(container);

  var { data: items, error } = await supabase
    .from("found_items")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = '<p style="color:var(--danger);">Error: ' + error.message + '</p>';
    return;
  }
  if (!items || items.length === 0) {
    showEmpty(container, "📭", "No found items posted yet.");
    return;
  }

  var grid = document.createElement("div");
  grid.className = "items-grid";

  items.forEach(function (item) {
    var card = document.createElement("div");
    card.className = "card";

    var imagesHTML = "";
    if (item.image_paths && item.image_paths.length) {
      imagesHTML = '<div class="card-images">';
      item.image_paths.forEach(function (path) {
        var url = supabase.storage.from("found-images").getPublicUrl(path).data.publicUrl;
        imagesHTML += '<img src="' + url + '" alt="Item">';
      });
      imagesHTML += '</div>';
    }

    card.innerHTML =
      '<div class="card-title">' + item.title + '</div>' +
      '<span class="badge ' + getBadgeClass(item.status) + '">' + item.status + '</span>' +
      imagesHTML +
      '<p class="card-meta mt-8"><strong>Category:</strong> ' + (item.category || "—") + '</p>' +
      '<p class="card-meta"><strong>Location:</strong> ' + (item.location || "—") + '</p>' +
      '<div class="card-actions">' +
        '<button class="btn btn-outline-danger" onclick="deleteFound(' + item.id + ')">Delete</button>' +
        '<button class="btn btn-outline-primary" onclick="viewItemRequests(' + item.id + ')">View Requests</button>' +
      '</div>';
    grid.appendChild(card);
  });
  container.innerHTML = "";
  container.appendChild(grid);
}

async function deleteFound(id) {
  if (!supabase) {
    showToast("Supabase not loaded.", "error");
    return;
  }
  var idNum = typeof id === "number" ? id : parseInt(id, 10);
  if (isNaN(idNum)) {
    showToast("Invalid item.", "error");
    return;
  }
  var { error } = await supabase
    .from("found_items")
    .delete()
    .eq("id", idNum)
    .eq("user_id", currentUser.id);

  if (error) {
    showToast("Could not delete item: " + error.message, "error");
    return;
  }
  showToast("Item deleted.");
  showFoundItems();
}

// ========================================
// VIEW REQUESTS FOR MY ITEMS
// ========================================
async function viewItemRequests(foundItemId) {
  var container = document.getElementById("tabContent");
  showSpinner(container);
  if (!supabase) return;

  var { data: requests, error } = await supabase
    .from("requests")
    .select("*")
    .eq("found_item_id", foundItemId);

  if (error) {
    container.innerHTML = '<p style="color:var(--danger);">Error: ' + error.message + '</p>';
    return;
  }
  if (!requests || requests.length === 0) {
    showEmpty(container, "📭", "No requests for this item yet.");
    return;
  }

  var grid = document.createElement("div");
  grid.className = "items-grid";

  requests.forEach(function (req) {
    var card = document.createElement("div");
    card.className = "card";
    var actions = "";
    if (req.status === "pending") {
      actions =
        '<div class="card-actions">' +
          '<button class="btn btn-primary" onclick="updateRequest(' + req.id + ', \'accepted\')">Accept</button>' +
          '<button class="btn btn-outline-danger" onclick="updateRequest(' + req.id + ', \'rejected\')">Reject</button>' +
        '</div>';
    }
    card.innerHTML =
      '<p class="card-meta"><strong>Message:</strong> ' + req.message + '</p>' +
      '<span class="badge ' + getBadgeClass(req.status) + ' mt-8">' + req.status + '</span>' +
      actions;
    grid.appendChild(card);
  });

  container.innerHTML = '<button class="btn btn-ghost mb-16" onclick="showTab(\'found\')">&larr; Back to Found Items</button>';
  container.appendChild(grid);
}

async function updateRequest(id, status) {
  if (!supabase) return;
  var { error } = await supabase
    .from("requests")
    .update({ status: status })
    .eq("id", id);

  if (error) {
    showToast("Could not update request: " + error.message, "error");
    return;
  }
  showToast("Request " + status + ".");
  showTab("found");
}

// ========================================
// MY REQUESTS (WHAT I SENT)
// ========================================
async function showRequests() {
  var container = document.getElementById("tabContent");
  if (!supabase) { showEmpty(container, "⚠️", "Supabase not loaded."); return; }
  showSpinner(container);

  var { data: requests, error } = await supabase
    .from("requests")
    .select("*")
    .eq("requester_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = '<p style="color:var(--danger);">Error: ' + error.message + '</p>';
    return;
  }
  if (!requests || requests.length === 0) {
    showEmpty(container, "📭", "No requests sent yet.");
    return;
  }

  var grid = document.createElement("div");
  grid.className = "items-grid";

  requests.forEach(function (req) {
    var card = document.createElement("div");
    card.className = "card";
    card.innerHTML =
      '<p class="card-meta"><strong>Message:</strong> ' + req.message + '</p>' +
      '<span class="badge ' + getBadgeClass(req.status) + ' mt-8">' + req.status + '</span>';
    grid.appendChild(card);
  });
  container.innerHTML = "";
  container.appendChild(grid);
}

// ========================================
// START
// ========================================
init();