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
      alert("Supabase not loaded. Check console.");
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
      alert(authError.message || "Registration failed.");
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
      alert("Registration Successful! Please login.");
      window.location.href = "index.html";
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
      alert("Supabase not loaded. Check console.");
      return;
    }

    var { data, error } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password: passwordInput
    });

    if (error) {
      // Supabase requires email confirmation by default
      var isEmailNotConfirmed = (error.message || "").toLowerCase().indexOf("email not confirmed") !== -1;
      if (isEmailNotConfirmed) {
        alert("Please confirm your email first.\n\nCheck your inbox (and spam folder) for the confirmation link from Supabase.\n\nUse the \"Resend confirmation email\" link below if you didn't receive it.");
        var resendEl = document.getElementById("resendConfirmBtn");
        if (resendEl) resendEl.style.display = "inline";
      } else {
        alert(error.message || "Invalid Email or Password!");
      }
      return;
    }

    if (data.user) {
      var { data: profile, error: profileError } = await supabase
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
      alert("Login Successful!");
      window.location.href = "dashboard.html";
    }
  });
}

// ========================================
// RESEND CONFIRMATION EMAIL
// ========================================
var resendBtn = document.getElementById("resendConfirmBtn");
if (resendBtn) {
  resendBtn.style.display = "none";
  resendBtn.addEventListener("click", async function (e) {
    e.preventDefault();
    var emailEl = document.getElementById("email");
    var email = emailEl ? emailEl.value.trim().toLowerCase() : "";
    if (!email) {
      alert("Enter your email above first, then click Resend.");
      return;
    }
    if (!supabase) {
      alert("Supabase not loaded.");
      return;
    }
    var { error } = await supabase.auth.resend({
      type: "signup",
      email: email
    });
    if (error) {
      alert("Could not resend: " + error.message);
    } else {
      alert("If an account exists for this email, a new confirmation link was sent. Check your inbox and spam folder.");
    }
  });
}
