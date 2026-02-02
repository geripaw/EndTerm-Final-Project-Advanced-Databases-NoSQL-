const API_URL = "http://localhost:5000/api/products";

let currentPage = 1;
let limit = 5;
let selectedId = null;

async function loadProducts() {
  const res = await fetch(`${API_URL}?page=${currentPage}&limit=${limit}`);
  const data = await res.json();

  const tbody = document.getElementById("productsList");
  tbody.innerHTML = "";

  data.products.forEach(p => {
    tbody.innerHTML += `
      <tr>
        <td>${p.name}</td>
        <td>${p.price}</td>
        <td>${p.category}</td>
        <td>
          <button onclick="editProduct('${p._id}', '${p.name}', ${p.price}, '${p.category}')">Edit</button>
          <button onclick="deleteProduct('${p._id}')">Delete</button>
        </td>
      </tr>
    `;
  });

  document.getElementById("pageInfo").innerText =
    `Page ${data.page} of ${data.totalPages}`;
}

async function createProduct() {
  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name.value,
      price: price.value,
      category: category.value
    })
  });

  loadProducts();
}

function editProduct(id, nameVal, priceVal, categoryVal) {
  selectedId = id;
  name.value = nameVal;
  price.value = priceVal;
  category.value = categoryVal;
  updateBtn.style.display = "inline-block";
}

async function updateProduct() {
  await fetch(`${API_URL}/${selectedId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name.value,
      price: price.value,
      category: category.value
    })
  });

  updateBtn.style.display = "none";
  loadProducts();
}

async function deleteProduct(id) {
  await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  loadProducts();
}

function nextPage() {
  currentPage++;
  loadProducts();
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    loadProducts();
  }
}

function logout() {
  localStorage.removeItem("isLoggedIn");
  window.location.href = "index.html";
}
