// ===============================
// SESSION CHECK
// ===============================
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
  window.location.href = "index.html";
}

document.getElementById("logoutBtn").addEventListener("click", function() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
});


// ===============================
// GET + SAVE FOUND ITEMS
// ===============================
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
// IMAGE UPLOAD → BASE64
// ===============================
function convertImagesToBase64(files) {
  const promises = [];

  for (let file of files) {
    const promise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        resolve(e.target.result);
      };
      reader.readAsDataURL(file);
    });
    promises.push(promise);
  }

  return Promise.all(promises);
}


// ===============================
// ADD FOUND ITEM
// ===============================
const form = document.getElementById("foundItemForm");

form.addEventListener("submit", async function(e) {
  e.preventDefault();

  const items = getFoundItems();

  const files = document.getElementById("imageUpload").files;
  const images = await convertImagesToBase64(files);

  const newItem = {
    id: Date.now(),
    userId: currentUser.id,
    title: title.value,
    category: category.value,
    description: description.value,
    dateFound: dateFound.value,
    location: location.value,
    images: images,
    status: "available"
  };

  items.push(newItem);
  saveFoundItems(items);

  form.reset();
  displayItems();
});


// ===============================
// DISPLAY ITEMS
// ===============================
function displayItems() {
  const items = getFoundItems();
  const list = document.getElementById("foundItemsList");
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

    let imagesHTML = "";
    item.images.forEach(img => {
      imagesHTML += `<img src="${img}" alt="Item Image">`;
    });

    card.innerHTML = `
      <h3>${item.title}</h3>
      <p><strong>Category:</strong> ${item.category}</p>
      <p><strong>Description:</strong> ${item.description}</p>
      <p><strong>Date Found:</strong> ${item.dateFound}</p>
      <p><strong>Location:</strong> ${item.location}</p>
      ${imagesHTML}
      ${
        item.userId !== currentUser.id && item.status === "available"
          ? `<button onclick="openModal(${item.id})">Request Item</button>`
          : ""
      }
    `;

    list.appendChild(card);
  });
}


// ===============================
// MODAL SYSTEM
// ===============================
let selectedItemId = null;

function openModal(id) {
  selectedItemId = id;
  document.getElementById("requestModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("requestModal").style.display = "none";
  document.getElementById("requestMessage").value = "";
}

document.getElementById("sendRequestBtn").addEventListener("click", function() {
  const message = document.getElementById("requestMessage").value;

  if (!message) {
    alert("Please enter message");
    return;
  }

  const requests = getRequests();

  const newRequest = {
    id: Date.now(),
    foundItemId: selectedItemId,
    requesterId: currentUser.id,
    message: message,
    status: "pending"
  };

  requests.push(newRequest);
  saveRequests(requests);

  alert("Request Sent!");
  closeModal();
});


// ===============================
// SEARCH + FILTER EVENTS
// ===============================
document.getElementById("searchInput").addEventListener("input", displayItems);
document.getElementById("filterCategory").addEventListener("change", displayItems);


// Initial Load
displayItems();
