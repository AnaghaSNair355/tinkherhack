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
// COLLAPSIBLE REPORT PANEL
// ========================================
var reportToggle = document.getElementById("reportToggle");
var reportPanel = document.getElementById("reportPanel");

if (reportToggle && reportPanel) {
  reportToggle.addEventListener("click", function () {
    reportToggle.classList.toggle("open");
    reportPanel.classList.toggle("open");
  });
}

// ========================================
// DRAG-AND-DROP UPLOAD ZONE
// ========================================
var uploadZone = document.getElementById("uploadZone");
var imageUploadInput = document.getElementById("imageUpload");
var uploadPreview = document.getElementById("uploadPreview");

if (uploadZone && imageUploadInput) {
  uploadZone.addEventListener("click", function () {
    imageUploadInput.click();
  });

  uploadZone.addEventListener("dragover", function (e) {
    e.preventDefault();
    uploadZone.classList.add("drag-over");
  });

  uploadZone.addEventListener("dragleave", function () {
    uploadZone.classList.remove("drag-over");
  });

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

// ========================================
// ADD FOUND ITEM (Supabase + Storage)
// ========================================
var form = document.getElementById("foundItemForm");

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  var title = document.getElementById("title").value.trim();
  var category = document.getElementById("category").value;
  var description = document.getElementById("description").value.trim();
  var dateFound = document.getElementById("dateFound").value;
  var location = document.getElementById("location").value.trim();
  var files = imageUploadInput.files;

  if (!supabase) {
    showToast("Supabase not loaded.", "error");
    return;
  }

  var { data: newItem, error: insertError } = await supabase
    .from("found_items")
    .insert({
      user_id: currentUser.id,
      title: title,
      category: category,
      description: description,
      date_found: dateFound,
      location: location,
      image_paths: [],
      status: "available"
    })
    .select("id")
    .single();

  if (insertError) {
    showToast("Error: " + insertError.message, "error");
    return;
  }

  var imagePaths = [];
  if (files && files.length > 0) {
    var basePath = currentUser.id + "/" + newItem.id + "/";
    var uploadTimestamp = Date.now();
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var fileName = basePath + uploadTimestamp + "_" + i + "_" + (file.name || "img");
      var { error: uploadError } = await supabase.storage.from("found-images").upload(fileName, file, { upsert: true });
      if (!uploadError) {
        imagePaths.push(fileName);
      }
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

// ========================================
// DISPLAY FOUND ITEMS
// ========================================
async function displayItems() {
  var list = document.getElementById("foundItemsList");
  showSpinner(list);

  var searchText = (document.getElementById("searchInput").value || "").toLowerCase();
  var filterCategory = document.getElementById("filterCategory").value;

  if (!supabase) {
    showEmpty(list, "⚠️", "Supabase not loaded.");
    return;
  }

  var { data: items, error } = await supabase.from("found_items").select("*").order("created_at", { ascending: false });

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
    showEmpty(list, "📭", "No found items yet.");
    return;
  }

  list.innerHTML = "";

  filtered.forEach(function (item) {
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

    var requestBtn = "";
    if (item.user_id !== currentUser.id && item.status === "available") {
      requestBtn = '<button class="btn btn-primary-full mt-8" onclick="openModal(' + item.id + ')">Request Item</button>';
    }

    card.innerHTML =
      imagesHTML +
      '<div class="card-title">' + item.title + '</div>' +
      '<span class="badge ' + getBadgeClass(item.status) + '">' + item.status + '</span>' +
      '<p class="card-meta mt-8"><strong>Category:</strong> ' + item.category + '</p>' +
      '<p class="card-meta"><strong>Description:</strong> ' + (item.description || "—") + '</p>' +
      '<p class="card-meta"><strong>Date Found:</strong> ' + item.date_found + '</p>' +
      '<p class="card-meta"><strong>Location:</strong> ' + item.location + '</p>' +
      requestBtn;
    list.appendChild(card);
  });
}

// ========================================
// MODAL - REQUEST ITEM
// ========================================
var selectedItemId = null;

function openModal(id) {
  selectedItemId = id;
  document.getElementById("requestModal").classList.add("active");
}

function closeModal() {
  document.getElementById("requestModal").classList.remove("active");
  document.getElementById("requestMessage").value = "";
  selectedItemId = null;
}

document.getElementById("sendRequestBtn").addEventListener("click", async function () {
  var message = document.getElementById("requestMessage").value.trim();
  if (!message) {
    showToast("Please enter a message.", "error");
    return;
  }
  if (!selectedItemId || !supabase) return;

  var { error } = await supabase.from("requests").insert({
    found_item_id: selectedItemId,
    requester_id: currentUser.id,
    message: message,
    status: "pending"
  });

  if (error) {
    showToast("Error: " + error.message, "error");
    return;
  }
  showToast("Request sent!");
  closeModal();
});

// ========================================
// SEARCH + FILTER EVENTS
// ========================================
document.getElementById("searchInput").addEventListener("input", displayItems);
document.getElementById("filterCategory").addEventListener("change", displayItems);

// Initial Load
displayItems();