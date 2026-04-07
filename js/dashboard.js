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
  // Safe closure mapped inside else
  async function init() {
    if (!supabase) return;
    var _ref = await supabase.auth.getSession();
    var session = _ref.data.session;
    if (!session) {
      localStorage.removeItem("currentUser");
      window.location.href = "index.html";
      return;
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
    loadNotifications();
  }

  function switchTab(tab, el) {
    var navLinks = document.querySelectorAll(".sidebar-nav .nav-link");
    navLinks.forEach(function (link) { link.classList.remove("active"); });
    var navMap = { lost: "navLost", found: "navFound", requests: "navRequests" };
    var navEl = document.getElementById(navMap[tab]);
    if (navEl) navEl.classList.add("active");
    
    var tabBtns = document.querySelectorAll(".tab-btn");
    tabBtns.forEach(function (btn) { btn.classList.remove("active"); });
    if (el && el.classList.contains("tab-btn")) {
      el.classList.add("active");
    } else {
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

  async function showLostItems() {
    var container = document.getElementById("tabContent");
    if (!container) return;
    if (!supabase) { showEmpty(container, "⚠️", "Supabase not loaded."); return; }
    showSpinner(container);

    var { data: items, error } = await supabase.from("lost_items").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false });

    if (error) { container.innerHTML = '<p>Error: ' + sanitize(error.message) + '</p>'; return; }
    if (!items || items.length === 0) { showEmpty(container, "📭", "No lost items posted yet."); return; }

    var grid = document.createElement("div");
    grid.className = "items-grid";

    items.forEach(function (item) {
      var card = document.createElement("div");
      card.className = "card";
      var markBtn = "";
      if (item.status === "active") {
        markBtn = '<button class="btn btn-primary" onclick="markAsFound(' + item.id + ')">Mark as Found</button>';
      }
      card.innerHTML =
        '<div class="card-title">' + sanitize(item.title) + '</div>' +
        '<span class="badge ' + getBadgeClass(item.status) + '">' + sanitize(item.status) + '</span>' +
        '<p class="card-meta mt-8"><strong>Category:</strong> ' + sanitize(item.category || "—") + '</p>' +
        '<p class="card-meta"><strong>Location:</strong> ' + sanitize(item.location || "—") + '</p>' +
        '<p class="card-meta"><strong>Date Lost:</strong> ' + sanitize(item.date_lost || "—") + '</p>' +
        '<div class="card-actions">' + markBtn + '<button class="btn btn-outline-danger" onclick="deleteLost(' + item.id + ')">Delete</button></div>';
      grid.appendChild(card);
    });
    container.innerHTML = "";
    container.appendChild(grid);
  }

  window.markAsFound = async function(id) {
    if (!supabase) return;
    var { error } = await supabase.from("lost_items").update({ status: "found" }).eq("id", id).eq("user_id", currentUser.id);
    if (error) { showToast("Could not update status", "error"); return; }
    showToast("Item marked as found!");
    showLostItems();
  }

  window.deleteLost = async function(id) {
    if (!supabase) return;
    var { error } = await supabase.from("lost_items").delete().eq("id", id).eq("user_id", currentUser.id);
    if (error) { showToast("Could not delete item", "error"); return; }
    showToast("Item deleted.");
    showLostItems();
  }

  async function showFoundItems() {
    var container = document.getElementById("tabContent");
    if (!container) return;
    if (!supabase) { showEmpty(container, "⚠️", "Supabase not loaded."); return; }
    showSpinner(container);

    var { data: items, error } = await supabase.from("found_items").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false });

    if (error) { container.innerHTML = '<p>Error: ' + sanitize(error.message) + '</p>'; return; }
    if (!items || items.length === 0) { showEmpty(container, "📭", "No found items posted yet."); return; }

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
          imagesHTML += '<img src="' + sanitize(url) + '" alt="Item">';
        });
        imagesHTML += '</div>';
      }
      card.innerHTML =
        '<div class="card-title">' + sanitize(item.title) + '</div>' +
        '<span class="badge ' + getBadgeClass(item.status) + '">' + sanitize(item.status) + '</span>' +
        imagesHTML +
        '<p class="card-meta mt-8"><strong>Category:</strong> ' + sanitize(item.category || "—") + '</p>' +
        '<p class="card-meta"><strong>Location:</strong> ' + sanitize(item.location || "—") + '</p>' +
        '<div class="card-actions">' +
          '<button class="btn btn-outline-danger" onclick="deleteFound(' + item.id + ')">Delete</button>' +
          '<button class="btn btn-outline-primary" onclick="viewItemRequests(' + item.id + ')">View Requests</button>' +
        '</div>';
      grid.appendChild(card);
    });
    container.innerHTML = "";
    container.appendChild(grid);
  }

  window.deleteFound = async function(id) {
    if (!supabase) return;
    var { error } = await supabase.from("found_items").delete().eq("id", parseInt(id)).eq("user_id", currentUser.id);
    if (error) { showToast("Could not delete item", "error"); return; }
    showToast("Item deleted.");
    showFoundItems();
  }

  window.viewItemRequests = async function(foundItemId) {
    var container = document.getElementById("tabContent");
    if (!container) return;
    showSpinner(container);
    if (!supabase) return;

    var { data: requests, error } = await supabase.from("requests").select("*, profiles:requester_id(name, phone, roll)").eq("found_item_id", foundItemId);

    if (error) { container.innerHTML = '<p>Error: ' + sanitize(error.message) + '</p>'; return; }
    if (!requests || requests.length === 0) { showEmpty(container, "📭", "No requests for this item yet."); return; }

    var grid = document.createElement("div");
    grid.className = "items-grid";

    requests.forEach(function (req) {
      var card = document.createElement("div");
      card.className = "card";
      var contactHTML = "";
      var profile = req.profiles;
      if (profile) {
        contactHTML =
          '<div class="contact-info mt-8">' +
            '<p class="contact-info-title">📞 Requester Contact</p>' +
            '<p class="card-meta"><strong>Name:</strong> ' + sanitize(profile.name || "—") + '</p>' +
            '<p class="card-meta"><strong>Phone:</strong> ' + sanitize(profile.phone || "—") + '</p>' +
            '<p class="card-meta"><strong>Roll No:</strong> ' + sanitize(profile.roll || "—") + '</p>' +
          '</div>';
      }
      var actions = "";
      if (req.status === "pending") {
        actions =
          '<div class="card-actions">' +
            '<button class="btn btn-primary" onclick="updateRequest(' + req.id + ', \'accepted\')">Accept</button>' +
            '<button class="btn btn-outline-danger" onclick="updateRequest(' + req.id + ', \'rejected\')">Reject</button>' +
          '</div>';
      }
      card.innerHTML =
        '<p class="card-meta"><strong>Message:</strong> ' + sanitize(req.message) + '</p>' +
        '<span class="badge ' + getBadgeClass(req.status) + ' mt-8">' + sanitize(req.status) + '</span>' +
        contactHTML + actions;
      grid.appendChild(card);
    });
    container.innerHTML = '<button class="btn btn-ghost mb-16" onclick="switchTab(\'found\')">&larr; Back to Found Items</button>';
    container.appendChild(grid);
  }

  window.updateRequest = async function(id, status) {
    if (!supabase) return;

    var { data: reqData } = await supabase.from("requests").select("*, found_items(title)").eq("id", id).single();

    var { error } = await supabase.from("requests").update({ status: status }).eq("id", id);
    if (error) { showToast("Could not update request", "error"); return; }

    if (reqData && reqData.requester_id) {
      var itemTitle = (reqData.found_items && reqData.found_items.title) ? reqData.found_items.title : "an item";
      var msg = "Your request for '" + itemTitle + "' has been " + status + ". Check the finder's contact details in the request tab or notification.";
      await supabase.from("notifications").insert({
        receiver_id: reqData.requester_id,
        sender_id: currentUser.id,
        title: "Request " + (status.charAt(0).toUpperCase() + status.slice(1)),
        message: msg
      });
    }

    showToast("Request " + status + ".");
    showTab("found");
  }

  async function showRequests() {
    var container = document.getElementById("tabContent");
    if (!container) return;
    if (!supabase) { showEmpty(container, "⚠️", "Supabase not loaded."); return; }
    showSpinner(container);

    var { data: requests, error } = await supabase.from("requests").select("*").eq("requester_id", currentUser.id).order("created_at", { ascending: false });

    if (error) { container.innerHTML = '<p>Error: ' + sanitize(error.message) + '</p>'; return; }
    if (!requests || requests.length === 0) { showEmpty(container, "📭", "No requests sent yet."); return; }

    var grid = document.createElement("div");
    grid.className = "items-grid";

    requests.forEach(function (req) {
      var card = document.createElement("div");
      card.className = "card";
      card.innerHTML =
        '<p class="card-meta"><strong>Message:</strong> ' + sanitize(req.message) + '</p>' +
        '<span class="badge ' + getBadgeClass(req.status) + ' mt-8">' + sanitize(req.status) + '</span>';
      grid.appendChild(card);
    });
    container.innerHTML = "";
    container.appendChild(grid);
  }

  async function loadNotifications() {
    if (!supabase) return;
    var { data, error } = await supabase.from("notifications").select("*, profiles:sender_id(name, phone, roll)").eq("receiver_id", currentUser.id).order("created_at", { ascending: false });

    if (error) return;

    var unreadCount = data ? data.filter(function(n) { return !n.is_read; }).length : 0;
    var badge = document.getElementById("notifBadge");
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? "inline-block" : "none";
    }

    var list = document.getElementById("notifList");
    if (!list) return;
    list.innerHTML = "";

    if (!data || data.length === 0) {
      list.innerHTML = '<p style="text-align:center; padding:16px;">No notifications yet.</p>';
      return;
    }

    data.forEach(function(notif) {
      var card = document.createElement("div");
      card.style.background = notif.is_read ? "#fff" : "#F8FAFC";
      card.style.border = "1px solid var(--border)";
      card.style.borderRadius = "var(--radius)";
      card.style.padding = "12px";

      var senderInfo = "";
      if (notif.profiles) {
        senderInfo = '<div style="margin-top:8px; font-size:12px; color:var(--text);">' +
          '<strong>Finder / Sender:</strong> ' + sanitize(notif.profiles.name) + '<br>' +
          '<strong>Phone:</strong> ' + sanitize(notif.profiles.phone || "—") + '<br>' +
          '<strong>Roll:</strong> ' + sanitize(notif.profiles.roll || "—") +
          '</div>';
      }

      card.innerHTML = 
        '<strong style="display:block; font-size:14px; margin-bottom:4px;">' + sanitize(notif.title) + '</strong>' +
        '<p style="font-size:13px; margin:0;">' + sanitize(notif.message) + '</p>' + senderInfo;
      list.appendChild(card);
    });
  }

  var notifModal = document.getElementById("notifModal");
  var notifBtn = document.getElementById("notifBtn");
  var clearNotifBtn = document.getElementById("clearNotifBtn");

  if (notifBtn) {
    notifBtn.addEventListener("click", async function() {
      if(notifModal) notifModal.classList.add("active");
      if (supabase) {
        await supabase.from("notifications").update({ is_read: true }).eq("receiver_id", currentUser.id);
        loadNotifications();
      }
    });
  }

  window.closeNotifModal = function() {
    if(notifModal) notifModal.classList.remove("active");
  }

  if (clearNotifBtn) {
    clearNotifBtn.addEventListener("click", async function() {
      if (!supabase) return;
      var { error } = await supabase.from("notifications").delete().eq("receiver_id", currentUser.id);
      if (!error) {
        showToast("Notifications cleared.");
        loadNotifications();
        closeNotifModal();
      } else {
        showToast("Error clearing notifications: " + error.message, "error");
      }
    });
  }

  window.switchTab = switchTab; // Globals
  init(); // Start!
}