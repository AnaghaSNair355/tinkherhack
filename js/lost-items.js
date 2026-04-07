function sanitize(str) {
  var d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

function showToast(message, type) {
  type = type || "success";
  var container = document.getElementById("toast-container");
  if (!container) return;
  var toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  var icon = type === "success" ? "✓ " : "✕ ";
  toast.textContent = icon + message;
  container.appendChild(toast);
  setTimeout(function () {
    toast.classList.add("toast-out");
    setTimeout(function () { toast.remove(); }, 300);
  }, 3000);
}

function getInitials(name) {
  if (!name) return "?";
  var parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

function getBadgeClass(status) {
  var map = {
    active: "badge-active", available: "badge-available", found: "badge-found",
    claimed: "badge-claimed", pending: "badge-pending",
    accepted: "badge-accepted", rejected: "badge-rejected"
  };
  return map[status] || "badge-found";
}

function showSpinner(container) {
  if (container) container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
}

function showEmpty(container, emoji, text) {
  if (container) container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">' + sanitize(emoji) + '</div><p>' + sanitize(text) + '</p></div>';
}

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
      if (sidebar) sidebar.classList.remove("open");
      overlay.classList.remove("open");
    });
  }
}

var supabase = window.supabaseClient;
var currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
  window.location.href = "index.html";
} else {
  initSidebar();

  var logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async function () {
      if (supabase) await supabase.auth.signOut();
      localStorage.removeItem("currentUser");
      window.location.href = "index.html";
    });
  }

  var form = document.getElementById("lostItemForm");
  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var tEl = document.getElementById("title");
      var cEl = document.getElementById("category");
      var dEl = document.getElementById("description");
      var dlEl = document.getElementById("dateLost");
      var lEl = document.getElementById("location");

      if (!tEl || !cEl || !dEl || !dlEl || !lEl) return;

      var title = tEl.value.trim();
      var category = cEl.value;
      var description = dEl.value.trim();
      var dateLost = dlEl.value;
      var location = lEl.value.trim();

      if (!supabase) { showToast("Supabase not loaded.", "error"); return; }

      var { data, error } = await supabase.from("lost_items").insert({
        user_id: currentUser.id, title: title, category: category,
        description: description, date_lost: dateLost,
        location: location, status: "active"
      }).select("id").single();

      if (error) { showToast("Error: " + error.message, "error"); return; }
      showToast("Lost item reported!");
      form.reset();
      displayItems();
    });
  }

  window.displayItems = async function() {
    var list = document.getElementById("lostItemsList");
    if (!list) return;
    showSpinner(list);

    var sInput = document.getElementById("searchInput");
    var slInput = document.getElementById("searchLocation");
    var fCat = document.getElementById("filterCategory");

    var searchText = sInput ? (sInput.value || "").toLowerCase() : "";
    var searchLoc = slInput ? (slInput.value || "").toLowerCase() : "";
    var filterCategory = fCat ? fCat.value : "";

    if (!supabase) { showEmpty(list, "⚠️", "Supabase not loaded."); return; }

    var { data: items, error } = await supabase.from("lost_items").select("*").order("created_at", { ascending: false });
    if (error) { list.innerHTML = '<p>Error: ' + sanitize(error.message) + '</p>'; return; }

    var filtered = (items || []).filter(function (item) {
      var matchSearch = !searchText || ((item.title||"").toLowerCase().indexOf(searchText) !== -1);
      var matchLocation = !searchLoc || ((item.location||"").toLowerCase().indexOf(searchLoc) !== -1);
      var matchCategory = !filterCategory || item.category === filterCategory;
      return matchSearch && matchLocation && matchCategory;
    });

    if (!filtered || filtered.length === 0) {
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
        '<div class="card-title">' + sanitize(item.title) + '</div>' +
        '<span class="badge ' + getBadgeClass(item.status) + '">' + sanitize(item.status) + '</span>' +
        '<p class="card-meta mt-8"><strong>Category:</strong> ' + sanitize(item.category) + '</p>' +
        '<p class="card-meta"><strong>Description:</strong> ' + sanitize(item.description || "—") + '</p>' +
        '<p class="card-meta"><strong>Date Lost:</strong> ' + sanitize(item.date_lost) + '</p>' +
        '<p class="card-meta"><strong>Location:</strong> ' + sanitize(item.location) + '</p>' +
        '<div class="card-actions">' + markBtn + '</div>';
      list.appendChild(card);
    });
  }

  window.markAsFound = async function(id) {
    if (!supabase) return;
    var { error } = await supabase.from("lost_items").update({ status: "found" }).eq("id", id).eq("user_id", currentUser.id);
    if (error) { showToast("Could not update status", "error"); return; }
    showToast("Item marked as found!");
    displayItems();
  }

  var searchInp = document.getElementById("searchInput");
  if (searchInp) searchInp.addEventListener("input", displayItems);
  
  var searchLocInp = document.getElementById("searchLocation");
  if (searchLocInp) searchLocInp.addEventListener("input", displayItems);
  
  var filterCat = document.getElementById("filterCategory");
  if (filterCat) filterCat.addEventListener("change", displayItems);

  displayItems();
}