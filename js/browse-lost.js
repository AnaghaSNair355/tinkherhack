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
  if(container) container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">' + sanitize(emoji) + '</div><p>' + sanitize(text) + '</p></div>';
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
      if(sidebar) sidebar.classList.remove("open");
      overlay.classList.remove("open");
    });
  }
}

var supabase = window.supabaseClient;
var currentUser = JSON.parse(localStorage.getItem("currentUser"));

// Public File: DO NOT strictly force login redirect.
// BUT since functions require auth (I Found it!), check currentUser for those.

initSidebar();

var logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async function () {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem("currentUser");
    window.location.href = "index.html";
  });
}

window.displayItems = async function() {
  var list = document.getElementById("lostItemsList");
  if(!list) return;
  showSpinner(list);

  var sInput = document.getElementById("searchInput");
  var slInput = document.getElementById("searchLocation");
  var fCat = document.getElementById("filterCategory");

  var searchText = sInput ? (sInput.value || "").toLowerCase() : "";
  var searchLoc = slInput ? (slInput.value || "").toLowerCase() : "";
  var filterCategory = fCat ? fCat.value : "";

  if (!supabase) { showEmpty(list, "⚠️", "Supabase not loaded."); return; }

  var query = supabase.from("lost_items").select("*, profiles:user_id(name)").eq("status", "active").order("created_at", { ascending: false });
  if (currentUser) {
    query = query.neq("user_id", currentUser.id);
  }

  var { data: items, error } = await query;
  if (error) { list.innerHTML = '<p>Error: ' + sanitize(error.message) + '</p>'; return; }

  var filtered = (items || []).filter(function (item) {
    var matchSearch = !searchText || ((item.title || "").toLowerCase().indexOf(searchText) !== -1);
    var matchLocation = !searchLoc || ((item.location || "").toLowerCase().indexOf(searchLoc) !== -1);
    var matchCategory = !filterCategory || item.category === filterCategory;
    return matchSearch && matchLocation && matchCategory;
  });

  if (!filtered || filtered.length === 0) { showEmpty(list, "📭", "No lost items to browse."); return; }

  list.innerHTML = "";
  filtered.forEach(function (item) {
    var card = document.createElement("div");
    card.className = "card";
    
    var ownerName = item.profiles ? item.profiles.name : "Unknown User";

    var foundBtn = "";
    if (currentUser) {
      foundBtn = '<button class="btn btn-primary-full mt-8" onclick="openFoundModal(' + item.id + ', \'' + item.user_id + '\', \'' + sanitize(item.title).replace(/'/g, "\\'") + '\')">I Found It!</button>';
    } else {
      foundBtn = '<p class="mt-8" style="font-size:12px;color:var(--text-light);">Log in to claim you found this.</p>';
    }

    card.innerHTML =
      '<div class="card-title">' + sanitize(item.title) + '</div>' +
      '<span class="badge ' + getBadgeClass(item.status) + '">' + sanitize(item.status) + '</span>' +
      '<p class="card-meta mt-8"><strong>Lost By:</strong> ' + sanitize(ownerName) + '</p>' +
      '<p class="card-meta"><strong>Category:</strong> ' + sanitize(item.category) + '</p>' +
      '<p class="card-meta"><strong>Description:</strong> ' + sanitize(item.description || "—") + '</p>' +
      '<p class="card-meta"><strong>Date Lost:</strong> ' + sanitize(item.date_lost) + '</p>' +
      '<p class="card-meta"><strong>Location:</strong> ' + sanitize(item.location) + '</p>' +
      foundBtn;
    list.appendChild(card);
  });
}

var selectedItemId = null;
var selectedItemOwnerId = null;
var selectedItemTitle = null;

window.openFoundModal = function(itemId, ownerId, title) {
  selectedItemId = itemId; selectedItemOwnerId = ownerId; selectedItemTitle = title;
  var fModal = document.getElementById("foundModal");
  if(fModal) fModal.classList.add("active");
}

window.closeFoundModal = function() {
  var fModal = document.getElementById("foundModal");
  var fmInp = document.getElementById("foundMessage");
  if(fModal) fModal.classList.remove("active");
  if(fmInp) fmInp.value = "";
  selectedItemId = null; selectedItemOwnerId = null; selectedItemTitle = null;
}

var sendFb = document.getElementById("sendFoundBtn");
if (sendFb) {
  sendFb.addEventListener("click", async function () {
    var fmInp = document.getElementById("foundMessage");
    if(!fmInp) return;
    var msg = fmInp.value.trim();
    if (!msg) { showToast("Please enter a message.", "error"); return; }
    if (!selectedItemId || !selectedItemOwnerId || !supabase || !currentUser) return;

    var { error } = await supabase.from("notifications").insert({
      receiver_id: selectedItemOwnerId, sender_id: currentUser.id,
      title: "Someone found your item: " + selectedItemTitle, message: msg
    });

    if (error) { showToast("Error: " + error.message, "error"); return; }
    
    showToast("Owner has been notified and sent your contact details!");
    window.closeFoundModal();
  });
}

var sInp = document.getElementById("searchInput");
var slInp = document.getElementById("searchLocation");
var fcInp = document.getElementById("filterCategory");

if(sInp) sInp.addEventListener("input", displayItems);
if(slInp) slInp.addEventListener("input", displayItems);
if(fcInp) fcInp.addEventListener("change", displayItems);

displayItems();
