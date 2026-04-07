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

// Init sidebar + logout
initSidebar();

document.getElementById("logoutBtn").addEventListener("click", async function () {
  if (supabase) await supabase.auth.signOut();
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
});

// ========================================
// ADD LOST ITEM (Supabase)
// ========================================
var form = document.getElementById("lostItemForm");

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  var title = document.getElementById("title").value.trim();
  var category = document.getElementById("category").value;
  var description = document.getElementById("description").value.trim();
  var dateLost = document.getElementById("dateLost").value;
  var location = document.getElementById("location").value.trim();

  if (!supabase) {
    showToast("Supabase not loaded.", "error");
    return;
  }

  var { data, error } = await supabase.from("lost_items").insert({
    user_id: currentUser.id,
    title: title,
    category: category,
    description: description,
    date_lost: dateLost,
    location: location,
    status: "active"
  }).select("id").single();

  if (error) {
    showToast("Error: " + error.message, "error");
    return;
  }

  showToast("Lost item reported!");
  form.reset();
  displayItems();
});

// ========================================
// DISPLAY LOST ITEMS
// ========================================
async function displayItems() {
  var list = document.getElementById("lostItemsList");
  showSpinner(list);

  var searchText = (document.getElementById("searchInput").value || "").toLowerCase();
  var filterCategory = document.getElementById("filterCategory").value;

  if (!supabase) {
    showEmpty(list, "⚠️", "Supabase not loaded.");
    return;
  }

  var { data: items, error } = await supabase.from("lost_items").select("*").order("created_at", { ascending: false });

  if (error) {
    list.innerHTML = '<p style="color:var(--danger);">Error: ' + error.message + '</p>';
    return;
  }

  var filtered = (items || []).filter(function (item) {
    var matchSearch = !searchText || (item.title && item.title.toLowerCase().indexOf(searchText) !== -1);
    var matchCategory = !filterCategory || item.category === filterCategory;
    return matchSearch && matchCategory;
  });

  if (filtered.length === 0) {
    showEmpty(list, "📭", "No lost items found.");
    return;
  }

  list.innerHTML = "";
  filtered.forEach(function (item) {
    var card = document.createElement("div");
    card.className = "card";

    var markBtn = "";
    if (item.status === "active" && item.user_id === currentUser.id) {
      markBtn = '<button class="btn btn-primary" onclick="markAsFound(' + item.id + ')">Mark as Found</button>';
    }

    card.innerHTML =
      '<div class="card-title">' + item.title + '</div>' +
      '<span class="badge ' + getBadgeClass(item.status) + '">' + item.status + '</span>' +
      '<p class="card-meta mt-8"><strong>Category:</strong> ' + item.category + '</p>' +
      '<p class="card-meta"><strong>Description:</strong> ' + (item.description || "—") + '</p>' +
      '<p class="card-meta"><strong>Date Lost:</strong> ' + item.date_lost + '</p>' +
      '<p class="card-meta"><strong>Location:</strong> ' + item.location + '</p>' +
      '<div class="card-actions">' + markBtn + '</div>';
    list.appendChild(card);
  });
}

// ========================================
// MARK AS FOUND
// ========================================
async function markAsFound(id) {
  if (!supabase) return;
  var { error } = await supabase
    .from("lost_items")
    .update({ status: "found" })
    .eq("id", id)
    .eq("user_id", currentUser.id);

  if (error) {
    showToast("Could not update status: " + error.message, "error");
    return;
  }
  showToast("Item marked as found!");
  displayItems();
}

// ========================================
// SEARCH + FILTER EVENTS
// ========================================
document.getElementById("searchInput").addEventListener("input", displayItems);
document.getElementById("filterCategory").addEventListener("change", displayItems);

// Initial load
displayItems();