// ===============================
// SESSION CHECK
// ===============================
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
  window.location.href = "index.html";
}

// Safe logout button check
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", function () {
    localStorage.removeItem("currentUser");
    window.location.href = "index.html";
  });
}

// ===============================
// HELPERS
// ===============================
function getLostItems() {
  return JSON.parse(localStorage.getItem("lostItems")) || [];
}

function saveLostItems(items) {
  localStorage.setItem("lostItems", JSON.stringify(items));
}

function getFoundItems() {
  return JSON.parse(localStorage.getItem("foundItems")) || [];
}

function saveFoundItems(items) {
  localStorage.setItem("foundItems", JSON.stringify(items));
}

function getRequests() {
  return JSON.parse(localStorage.getItem("requests")) || [];
}

function saveRequests(requests) {
  localStorage.setItem("requests", JSON.stringify(requests));
}

// ===============================
// USER INFO
// ===============================
const userInfo = document.getElementById("userInfo");
if (userInfo) {
  userInfo.innerHTML = `
    <h3>${currentUser.name}</h3>
    <p>Email: ${currentUser.email}</p>
    <p>Roll No: ${currentUser.roll}</p>
  `;
}

// ===============================
// TAB SYSTEM
// ===============================
function showTab(tab) {
  const container = document.getElementById("tabContent");
  if (!container) return;

  container.innerHTML = "";

  if (tab === "lost") showLostItems();
  if (tab === "found") showFoundItems();
  if (tab === "requests") showRequests();
}

// ===============================
// MY LOST ITEMS
// ===============================
function showLostItems() {
  const items = getLostItems().filter(
    item => item.userId === currentUser.id
  );

  const container = document.getElementById("tabContent");

  if (items.length === 0) {
    container.innerHTML = "<p>No lost items posted.</p>";
    return;
  }

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${item.title}</h3>
      <p>Status: ${item.status}</p>
      <button onclick="deleteLost(${item.id})">Delete</button>
    `;

    container.appendChild(card);
  });
}

function deleteLost(id) {
  let items = getLostItems();
  items = items.filter(item => item.id !== id);
  saveLostItems(items);
  showLostItems();
}

// ===============================
// MY FOUND ITEMS
// ===============================
function showFoundItems() {
  const items = getFoundItems().filter(
    item => item.userId === currentUser.id
  );

  const container = document.getElementById("tabContent");

  if (items.length === 0) {
    container.innerHTML = "<p>No found items posted.</p>";
    return;
  }

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    let imagesHTML = "";

    // Prevent crash if images undefined
    if (item.images && Array.isArray(item.images)) {
      item.images.forEach(img => {
        imagesHTML += `<img src="${img}" width="100">`;
      });
    }

    card.innerHTML = `
      <h3>${item.title}</h3>
      ${imagesHTML}
      <p>Status: ${item.status}</p>
      <button onclick="deleteFound(${item.id})">Delete</button>
      <button onclick="viewItemRequests(${item.id})">View Requests</button>
    `;

    container.appendChild(card);
  });
}

function deleteFound(id) {
  let items = getFoundItems();
  items = items.filter(item => item.id !== id);
  saveFoundItems(items);
  showFoundItems();
}

// ===============================
// VIEW REQUESTS FOR MY ITEMS
// ===============================
function viewItemRequests(foundItemId) {
  const requests = getRequests().filter(
    req => req.foundItemId === foundItemId
  );

  const container = document.getElementById("tabContent");
  container.innerHTML = "<h3>Requests</h3>";

  if (requests.length === 0) {
    container.innerHTML += "<p>No requests yet.</p>";
    return;
  }

  requests.forEach(req => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <p><strong>Message:</strong> ${req.message}</p>
      <p>Status: ${req.status}</p>
      ${
        req.status === "pending"
          ? `
            <button onclick="updateRequest(${req.id}, 'accepted')">Accept</button>
            <button onclick="updateRequest(${req.id}, 'rejected')">Reject</button>
          `
          : ""
      }
    `;

    container.appendChild(card);
  });
}

function updateRequest(id, status) {
  let requests = getRequests();

  requests = requests.map(req => {
    if (req.id === id) {
      req.status = status;
    }
    return req;
  });

  saveRequests(requests);
  showTab("found");
}

// ===============================
// MY REQUESTS (WHAT I SENT)
// ===============================
function showRequests() {
  const requests = getRequests().filter(
    req => req.requesterId === currentUser.id
  );

  const container = document.getElementById("tabContent");

  if (requests.length === 0) {
    container.innerHTML = "<p>No requests sent.</p>";
    return;
  }

  requests.forEach(req => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <p><strong>Message:</strong> ${req.message}</p>
      <p>Status: ${req.status}</p>
    `;

    container.appendChild(card);
  });
}

// ===============================
// DEFAULT TAB
// ===============================
showTab("lost");
