
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
  window.location.href = "index.html";
}

// Logout
document.getElementById("logoutBtn").addEventListener("click", function() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
});


// ===============================
// GET + SAVE LOST ITEMS
// ===============================
function getLostItems() {
  return JSON.parse(localStorage.getItem("lostItems")) || [];
}

function saveLostItems(items) {
  localStorage.setItem("lostItems", JSON.stringify(items));
}


// ===============================
// ADD LOST ITEM
// ===============================
const form = document.getElementById("lostItemForm");

form.addEventListener("submit", function(e) {
  e.preventDefault();

  const items = getLostItems();

  const newItem = {
    id: Date.now(),
    userId: currentUser.id,
    title: title.value,
    category: category.value,
    description: description.value,
    dateLost: dateLost.value,
    location: location.value,
    status: "active"
  };

  items.push(newItem);
  saveLostItems(items);

  form.reset();
  displayItems();
});


// ===============================
// DISPLAY ITEMS
// ===============================
function displayItems() {
  const items = getLostItems();
  const list = document.getElementById("lostItemsList");
  list.innerHTML = "";

  const searchText = document.getElementById("searchInput").value.toLowerCase();
  const filterCategory = document.getElementById("filterCategory").value;

  const filtered = items.filter(item => {
    return (
      item.title.toLowerCase().includes(searchText) &&
      (filterCategory === "" || item.category === filterCategory)
    );
  });

  filtered.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h3>${item.title}</h3>
      <p><strong>Category:</strong> ${item.category}</p>
      <p><strong>Description:</strong> ${item.description}</p>
      <p><strong>Date Lost:</strong> ${item.dateLost}</p>
      <p><strong>Location:</strong> ${item.location}</p>
      <p><strong>Status:</strong> ${item.status}</p>
      ${
        item.status === "active" && item.userId === currentUser.id
          ? `<button onclick="markAsFound(${item.id})">Mark as Found</button>`
          : ""
      }
    `;

    list.appendChild(card);
  });
}


// ===============================
// MARK AS FOUND
// ===============================
function markAsFound(id) {
  const items = getLostItems();

  const updated = items.map(item => {
    if (item.id === id) {
      item.status = "found";
    }
    return item;
  });

  saveLostItems(updated);
  displayItems();
}


// ===============================
// SEARCH + FILTER EVENTS
// ===============================
document.getElementById("searchInput").addEventListener("input", displayItems);
document.getElementById("filterCategory").addEventListener("change", displayItems);


// Initial Load
displayItems();
