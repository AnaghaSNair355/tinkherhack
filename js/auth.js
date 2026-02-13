// ========================================
// GET USERS FROM LOCAL STORAGE
// ========================================
function getUsers() {
  return JSON.parse(localStorage.getItem("users")) || [];
}

// ========================================
// SAVE USERS TO LOCAL STORAGE
// ========================================
function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

// ========================================
// REGISTER USER
// ========================================
const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const users = getUsers();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const roll = document.getElementById("roll").value.trim();

    // Check if email already exists
    const existingUser = users.find(user => user.email === email);

    if (existingUser) {
      alert("Email already registered!");
      return;
    }

    const newUser = {
      id: Date.now(),
      name,
      email,
      password,
      phone,
      roll
    };

    users.push(newUser);
    saveUsers(users);

    alert("Registration Successful!");
    window.location.href = "index.html"; // Go to login page
  });
}

// ========================================
// LOGIN USER
// ========================================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const emailInput = document.getElementById("email").value.trim().toLowerCase();
    const passwordInput = document.getElementById("password").value.trim();

    const users = getUsers();

    const user = users.find(
      user => user.email === emailInput && user.password === passwordInput
    );

    if (user) {
      localStorage.setItem("currentUser", JSON.stringify(user));
      alert("Login Successful!");
      window.location.href = "dashboard.html"; // Redirect after login
    } else {
      alert("Invalid Email or Password!");
    }
  });
}
