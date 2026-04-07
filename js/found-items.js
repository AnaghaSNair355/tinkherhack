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

  var reportToggle = document.getElementById("reportToggle");
  var reportPanel = document.getElementById("reportPanel");
  if (reportToggle && reportPanel) {
    reportToggle.addEventListener("click", function () {
      reportToggle.classList.toggle("open");
      reportPanel.classList.toggle("open");
    });
  }

  var uploadZone = document.getElementById("uploadZone");
  var imageUploadInput = document.getElementById("imageUpload");
  var uploadPreview = document.getElementById("uploadPreview");

  if (uploadZone && imageUploadInput) {
    uploadZone.addEventListener("click", function () { imageUploadInput.click(); });
    uploadZone.addEventListener("dragover", function (e) { e.preventDefault(); uploadZone.classList.add("drag-over"); });
    uploadZone.addEventListener("dragleave", function () { uploadZone.classList.remove("drag-over"); });
    uploadZone.addEventListener("drop", function (e) {
      e.preventDefault();
      uploadZone.classList.remove("drag-over");
      if (e.dataTransfer.files.length) {
        imageUploadInput.files = e.dataTransfer.files;
        showUploadPreview(e.dataTransfer.files);
      }
    });

    imageUploadInput.addEventListener("change", function () {
      showUploadPreview(imageUploadInput.files);
    });
  }

  function showUploadPreview(files) {
    if (!uploadPreview) return;
    uploadPreview.innerHTML = "";
    for (var i = 0; i < files.length; i++) {
      if (!files[i].type.startsWith("image/")) continue;
      var img = document.createElement("img");
      img.src = URL.createObjectURL(files[i]);
      img.alt = "Preview";
      uploadPreview.appendChild(img);
    }
  }

  var form = document.getElementById("foundItemForm");
  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      var tEl = document.getElementById("title");
      var cEl = document.getElementById("category");
      var dEl = document.getElementById("description");
      var dfEl = document.getElementById("dateFound");
      var lEl = document.getElementById("location");

      if (!tEl || !cEl || !dEl || !dfEl || !lEl) return;

      var title = tEl.value.trim();
      var category = cEl.value;
      var description = dEl.value.trim();
      var dateFound = dfEl.value;
      var location = lEl.value.trim();
      
      var imgInput = document.getElementById("imageUpload");
      var files = imgInput ? imgInput.files : [];

      var allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      var maxSize = 5 * 1024 * 1024; // 5MB

      for (var i = 0; i < files.length; i++) {
        if (!allowedTypes.includes(files[i].type)) {
          showToast("Only image files are allowed.", "error"); return;
        }
        if (files[i].size > maxSize) {
          showToast("Images must be under 5MB.", "error"); return;
        }
      }

      if (!supabase) { showToast("Supabase not loaded.", "error"); return; }

      var { data: newItem, error: insertError } = await supabase.from("found_items").insert({
        user_id: currentUser.id, title: title, category: category,
        description: description, date_found: dateFound,
        location: location, image_paths: [], status: "available"
      }).select("id").single();

      if (insertError) { showToast("Error: " + insertError.message, "error"); return; }

      var imagePaths = [];
      if (files && files.length > 0) {
        var basePath = currentUser.id + "/" + newItem.id + "/";
        var uploadTimestamp = Date.now();
        for (var idx = 0; idx < files.length; idx++) {
          var file = files[idx];
          var fileName = basePath + uploadTimestamp + "_" + idx + "_" + (file.name || "img");
          var { error: uploadError } = await supabase.storage.from("found-images").upload(fileName, file, { upsert: true });
          if (!uploadError) imagePaths.push(fileName);
        }
        if (imagePaths.length > 0) {
          await supabase.from("found_items").update({ image_paths: imagePaths }).eq("id", newItem.id);
        }
      }

      showToast("Found item reported!");
      form.reset();
      if (uploadPreview) uploadPreview.innerHTML = "";
      displayItems();
    });
  }

  window.displayItems = async function() {
    var list = document.getElementById("foundItemsList");
    if (!list) return;
    showSpinner(list);

    var sInput = document.getElementById("searchInput");
    var slInput = document.getElementById("searchLocation");
    var fCat = document.getElementById("filterCategory");

    var searchText = sInput ? (sInput.value || "").toLowerCase() : "";
    var searchLoc = slInput ? (slInput.value || "").toLowerCase() : "";
    var filterCategory = fCat ? fCat.value : "";

    if (!supabase) { showEmpty(list, "⚠️", "Supabase not loaded."); return; }

    var { data: items, error } = await supabase.from("found_items").select("*").order("created_at", { ascending: false });

    if (error) { list.innerHTML = '<p>Error: ' + sanitize(error.message) + '</p>'; return; }

    var filtered = (items || []).filter(function (item) {
      var matchSearch = !searchText || ((item.title||"").toLowerCase().indexOf(searchText) !== -1);
      var matchLocation = !searchLoc || ((item.location||"").toLowerCase().indexOf(searchLoc) !== -1);
      var matchCategory = !filterCategory || item.category === filterCategory;
      return matchSearch && matchLocation && matchCategory;
    });

    if (!filtered || filtered.length === 0) { showEmpty(list, "📭", "No found items yet."); return; }

    list.innerHTML = "";
    filtered.forEach(function (item) {
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

      var requestBtn = "";
      if (item.user_id !== currentUser.id && item.status === "available") {
        requestBtn = '<button class="btn btn-primary-full mt-8" onclick="openModal(' + item.id + ', \'' + sanitize(item.title).replace(/'/g, "\\'") + '\', \'' + item.user_id + '\')">Request Item</button>';
      }

      card.innerHTML =
        imagesHTML +
        '<div class="card-title">' + sanitize(item.title) + '</div>' +
        '<span class="badge ' + getBadgeClass(item.status) + '">' + sanitize(item.status) + '</span>' +
        '<p class="card-meta mt-8"><strong>Category:</strong> ' + sanitize(item.category) + '</p>' +
        '<p class="card-meta"><strong>Description:</strong> ' + sanitize(item.description || "—") + '</p>' +
        '<p class="card-meta"><strong>Date Found:</strong> ' + sanitize(item.date_found) + '</p>' +
        '<p class="card-meta"><strong>Location:</strong> ' + sanitize(item.location) + '</p>' +
        requestBtn;
      list.appendChild(card);
    });
  }

  var selectedItemId = null;
  var selectedItemTitle = null;
  var selectedItemOwnerId = null;

  window.openModal = function(id, title, ownerId) {
    selectedItemId = id;
    selectedItemTitle = title;
    selectedItemOwnerId = ownerId;
    var rm = document.getElementById("requestModal");
    if (rm) rm.classList.add("active");
  }

  window.closeModal = function() {
    var rm = document.getElementById("requestModal");
    var reqMsg = document.getElementById("requestMessage");
    if (rm) rm.classList.remove("active");
    if (reqMsg) reqMsg.value = "";
    selectedItemId = null;
    selectedItemTitle = null;
    selectedItemOwnerId = null;
  }

  var sendReq = document.getElementById("sendRequestBtn");
  if (sendReq) {
    sendReq.addEventListener("click", async function () {
      var reqMsgEl = document.getElementById("requestMessage");
      if(!reqMsgEl) return;
      var message = reqMsgEl.value.trim();
      if (!message) { showToast("Please enter a message.", "error"); return; }
      if (!selectedItemId || !supabase) return;

      var { error: reqError } = await supabase.from("requests").insert({
        found_item_id: selectedItemId, requester_id: currentUser.id, message: message, status: "pending"
      });

      if (reqError) { showToast("Error: " + reqError.message, "error"); return; }

      if (selectedItemOwnerId) {
        await supabase.from("notifications").insert({
          receiver_id: selectedItemOwnerId, sender_id: currentUser.id,
          title: "New Request for: " + selectedItemTitle, message: message
        });
      }

      showToast("Request sent!");
      closeModal();
    });
  }

  var searchInp = document.getElementById("searchInput");
  if (searchInp) searchInp.addEventListener("input", displayItems);
  var searchLocInp = document.getElementById("searchLocation");
  if (searchLocInp) searchLocInp.addEventListener("input", displayItems);
  var filterCat = document.getElementById("filterCategory");
  if (filterCat) filterCat.addEventListener("change", displayItems);

  displayItems();
}