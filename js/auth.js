// ========================================
// TOAST NOTIFICATION SYSTEM (replaces alert)
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
// PASSWORD STRENGTH INDICATOR
// ========================================
var passwordInput = document.getElementById("password");
var strengthFill = document.getElementById("passwordStrengthFill");

if (passwordInput && strengthFill) {
  passwordInput.addEventListener("input", function () {
    var val = passwordInput.value;
    strengthFill.className = "password-strength-fill";
    if (val.length === 0) return;
    if (val.length < 6) {
      strengthFill.classList.add("weak");
    } else if (val.length < 10 || !/[A-Z]/.test(val) || !/[0-9]/.test(val)) {
      strengthFill.classList.add("medium");
    } else {
      strengthFill.classList.add("strong");
    }
  });
}

// ========================================
// SUPABASE AUTH - Register & Login
// ========================================
var supabase = window.supabaseClient;

// ========================================
// REGISTER USER
// ========================================
var registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    var name = document.getElementById("name").value.trim();
    var email = document.getElementById("email").value.trim().toLowerCase();
    var password = document.getElementById("password").value.trim();
    var phone = document.getElementById("phone").value.trim();
    var roll = document.getElementById("roll").value.trim();

    if (!supabase) {
      showToast("Supabase not loaded. Check console.", "error");
      return;
    }

    var { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { name: name, phone: phone, roll: roll }
      }
    });

    if (authError) {
      showToast(authError.message || "Registration failed.", "error");
      return;
    }

    if (authData.user) {
      var { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: authData.user.id,
          name: name,
          phone: phone,
          roll: roll
        }, { onConflict: "id" });

      if (profileError) {
        console.warn("Profile upsert:", profileError.message);
      }
      showToast("Registration successful! Please login.");
      setTimeout(function () {
        window.location.href = "index.html";
      }, 1500);
    }
  });
}

// ========================================
// LOGIN USER
// ========================================
var loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    var emailInput = document.getElementById("email").value.trim().toLowerCase();
    var passwordInput = document.getElementById("password").value.trim();

    if (!supabase) {
      showToast("Supabase not loaded. Check console.", "error");
      return;
    }

    var { data, error } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password: passwordInput
    });

    if (error) {
      var isEmailNotConfirmed = (error.message || "").toLowerCase().indexOf("email not confirmed") !== -1;
      if (isEmailNotConfirmed) {
        showToast("Please confirm your email first. Check your inbox and spam folder.", "error");
        var resendEl = document.getElementById("resendConfirmBtn");
        if (resendEl) resendEl.style.display = "inline";
      } else {
        showToast(error.message || "Invalid Email or Password!", "error");
      }
      return;
    }

    if (data.user) {
      var { data: profile } = await supabase
        .from("profiles")
        .select("name, phone, roll")
        .eq("id", data.user.id)
        .single();

      var currentUser = {
        id: data.user.id,
        email: data.user.email,
        name: (profile && profile.name) ? profile.name : "",
        phone: (profile && profile.phone) ? profile.phone : "",
        roll: (profile && profile.roll) ? profile.roll : ""
      };

      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      showToast("Login successful!");
      setTimeout(function () {
        window.location.href = "dashboard.html";
      }, 800);
    }
  });
}

// ========================================
// RESEND CONFIRMATION EMAIL
// ========================================
var resendBtn = document.getElementById("resendConfirmBtn");
if (resendBtn) {
  resendBtn.addEventListener("click", async function (e) {
    e.preventDefault();
    var emailEl = document.getElementById("email");
    var email = emailEl ? emailEl.value.trim().toLowerCase() : "";
    if (!email) {
      showToast("Enter your email above first, then click Resend.", "error");
      return;
    }
    if (!supabase) {
      showToast("Supabase not loaded.", "error");
      return;
    }
    var { error } = await supabase.auth.resend({
      type: "signup",
      email: email
    });
    if (error) {
      showToast("Could not resend: " + error.message, "error");
    } else {
      showToast("If an account exists, a new confirmation link was sent.");
    }
  });
}
