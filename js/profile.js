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

if (!currentUser) {
  window.location.href = "index.html";
} else {
  // Safe init bounds
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
        await supabase.auth.signOut();
        localStorage.removeItem("currentUser");
        window.location.href = "index.html";
      });
    }

    // Now safe to load profile
    var form = document.getElementById("profileForm");
    var profName = document.getElementById("profName");
    var profPhone = document.getElementById("profPhone");
    var profRoll = document.getElementById("profRoll");

    if (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        if (!profName || !profPhone || !profRoll) return;

        var nameStr = profName.value.trim();
        if (nameStr === "") {
          showToast("Name cannot be empty", "error");
          return;
        }

        var { error } = await supabase.from("profiles").update({
          name: nameStr,
          phone: profPhone.value.trim(),
          roll: profRoll.value.trim()
        }).eq("id", currentUser.id);

        if (error) { showToast("Error updating profile: " + error.message, "error"); return; }
        
        currentUser.name = nameStr;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        initSidebar(); 
        showToast("Profile updated successfully!");
      });
    }

    if (profName && profPhone && profRoll) {
      var { data, error } = await supabase.from("profiles").select("*").eq("id", currentUser.id).single();
      if (data && !error) {
        profName.value = data.name || "";
        profPhone.value = data.phone || "";
        profRoll.value = data.roll || "";
      }
    }
  }

  init();
}
