// frontend/app.js - ФИНАЛЬНАЯ ВЕРСИЯ ДЛЯ ПРОЕКТА
const API_URL = "http://localhost:5000/api";
let currentPage = 1;
let limit = 5;
let selectedId = null;

// ========== УЛУЧШЕННАЯ ФУНКЦИЯ ДЛЯ API ==========
async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    console.log(`📡 [${options.method || 'GET'}] ${API_URL}${endpoint}`);
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });
    
    console.log(`📡 Ответ: ${response.status}`);
    
    if (response.status === 401) {
      localStorage.clear();
      window.location.href = 'auth.html';
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('❌ API Error:', error);
    
    if (error.message.includes('Failed to fetch')) {
      showAlert('❌ Сервер не отвечает. Запусти backend: npm run dev в папке backend', 'error');
    } else {
      showAlert(`❌ Ошибка: ${error.message}`, 'error');
    }
    
    // Возвращаем демо-данные для тестирования
    return getDemoData(endpoint);
  }
}

// Демо-данные для тестирования
function getDemoData(endpoint) {
  if (endpoint.includes('/products')) {
    return {
      success: true,
      products: [
        { _id: 'demo1', name: 'iPhone Demo', price: 999, category: 'electronics' },
        { _id: 'demo2', name: 'Jeans Demo', price: 79, category: 'clothing' }
      ],
      page: 1,
      totalPages: 1
    };
  }
  
  if (endpoint.includes('/stats')) {
    return {
      success: true,
      totalProducts: 42,
      totalOrders: 156,
      totalRevenue: 12450
    };
  }
  
  return { success: false, message: 'Demo data' };
}

// ========== PRODUCT FUNCTIONS ==========
// В frontend/app.js обнови loadProducts():
async function loadProducts() {
  try {
    const data = await fetchAPI(`/products?page=${currentPage}&limit=${limit}`);
    if (!data) return;
    
    const tbody = document.getElementById("productsList");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    if (data.products && data.products.length > 0) {
      data.products.forEach(p => {
        // АДАПТАЦИЯ ДЛЯ ТВОЕГО ДАТАСЕТА
        const name = p.Description || p.name || p.StockCode || "No Name";
        const price = p.UnitPrice || p.price || 0;
        const category = p.Country || p.category || "Unknown";
        const stock = p.Quantity || p.stock || 0;
        
        tbody.innerHTML += `
          <tr>
            <td>
              <div style="font-weight: 600;">${name}</div>
              <div style="font-size: 0.85rem; color: #666;">Stock Code: ${p.StockCode || 'N/A'}</div>
            </td>
            <td>$${price.toFixed(2)}</td>
            <td>
              <span class="category-badge">${category}</span>
              <div style="font-size: 0.8rem; margin-top: 3px; color: #888;">
                Qty: ${stock}
              </div>
            </td>
            <td>
              <button class="btn-secondary" onclick="editProduct('${p._id}', '${name}', ${price}, '${category}', ${stock})">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button class="btn-danger" onclick="deleteProduct('${p._id}')">
                <i class="fas fa-trash"></i> Delete
              </button>
            </td>
          </tr>
        `;
      });
      
      if (document.getElementById("pageInfo")) {
        document.getElementById("pageInfo").innerText = `Page ${data.page || 1} of ${data.totalPages || 1}`;
      }
    } else {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:40px;">No products found.</td></tr>`;
    }
  } catch (error) {
    console.error("Error loading products:", error);
    showAlert("Error loading products", "error");
  }
}

async function createProduct() {
  const name = document.getElementById("name");
  const price = document.getElementById("price");
  const category = document.getElementById("category");
  
  if (!name.value || !price.value) {
    showAlert("Please fill name and price fields", "error");
    return;
  }
  
  try {
    const data = await fetchAPI('/products', {
      method: "POST",
      body: JSON.stringify({
        name: name.value,
        price: parseFloat(price.value),
        category: category.value || 'electronics'
      })
    });
    
    if (data && data.success) {
      name.value = "";
      price.value = "";
      category.value = "";
      
      showAlert("✅ Product added successfully!", "success");
      loadProducts();
    }
  } catch (error) {
    console.error("Error creating product:", error);
    showAlert("Error creating product", "error");
  }
}

// Демо-функция для тестирования
async function createDemoProduct() {
  const demoProducts = [
    { name: "Laptop", price: 1299, category: "electronics" },
    { name: "T-Shirt", price: 25, category: "clothing" },
    { name: "Book", price: 35, category: "books" }
  ];
  
  const randomProduct = demoProducts[Math.floor(Math.random() * demoProducts.length)];
  
  const data = await fetchAPI('/products', {
    method: "POST",
    body: JSON.stringify(randomProduct)
  });
  
  if (data && data.success) {
    showAlert(`✅ Demo product "${randomProduct.name}" added!`, "success");
    loadProducts();
  }
}

function editProduct(id, nameVal, priceVal, categoryVal, stockVal = 10) {
  selectedId = id;
  
  // Убедись что поля существуют
  const nameField = document.getElementById("name");
  const priceField = document.getElementById("price");
  const categoryField = document.getElementById("category");
  
  if (nameField) nameField.value = nameVal || "";
  if (priceField) priceField.value = priceVal || "";
  if (categoryField) categoryField.value = categoryVal || "";
  
  // Показываем кнопку Update
  const updateBtn = document.getElementById("updateBtn");
  if (updateBtn) {
    updateBtn.style.display = "inline-block";
    updateBtn.scrollIntoView({ behavior: 'smooth' });
  }
  
  // Фокус на первое поле
  if (nameField) nameField.focus();
  
  showAlert(`✏️ Editing product: ${nameVal || id}`, "success");
  console.log("Editing product ID:", id, "Values:", { nameVal, priceVal, categoryVal });
}

async function updateProduct() {
  const nameField = document.getElementById("name");
  const priceField = document.getElementById("price");
  const categoryField = document.getElementById("category");
  const updateBtn = document.getElementById("updateBtn");
  
  if (!selectedId) {
    showAlert("❌ No product selected for update", "error");
    return;
  }
  
  const name = nameField?.value?.trim();
  const price = parseFloat(priceField?.value);
  const category = categoryField?.value?.trim();
  
  if (!name || !price || isNaN(price)) {
    showAlert("❌ Please enter valid name and price", "error");
    return;
  }
  
  try {
    console.log("Updating product ID:", selectedId, "Data:", { name, price, category });
    
    const data = await fetchAPI(`/products/${selectedId}`, {
      method: "PUT",
      body: JSON.stringify({
        name: name,
        price: price,
        category: category || 'electronics',
        updatedAt: new Date()
      })
    });
    
    if (data && data.success) {
      // Очищаем форму
      if (nameField) nameField.value = "";
      if (priceField) priceField.value = "";
      if (categoryField) categoryField.value = "";
      
      // Скрываем кнопку Update
      if (updateBtn) updateBtn.style.display = "none";
      
      // Сбрасываем selectedId
      selectedId = null;
      
      showAlert("✅ Product updated successfully!", "success");
      
      // Перезагружаем продукты
      setTimeout(() => {
        loadProducts();
      }, 500);
      
    } else {
      showAlert("❌ Failed to update product", "error");
    }
  } catch (error) {
    console.error("Error updating product:", error);
    showAlert(`❌ Update error: ${error.message}`, "error");
  }
}

async function deleteProduct(id) {
  if (!confirm("Are you sure you want to delete this product?")) return;
  
  try {
    const data = await fetchAPI(`/products/${id}`, { method: "DELETE" });
    if (data && data.success) {
      showAlert("✅ Product deleted successfully!", "success");
      loadProducts();
    }
  } catch (error) {
    console.error("Error deleting product:", error);
    showAlert("Error deleting product", "error");
  }
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

// ========== ORDER FUNCTIONS ==========
async function loadOrders() {
  try {
    const data = await fetchAPI('/orders');
    
    const ordersList = document.getElementById("ordersList");
    if (!ordersList) return;
    
    ordersList.innerHTML = "";
    
    if (data && data.orders && data.orders.length > 0) {
      data.orders.forEach(order => {
        const orderDate = new Date(order.createdAt).toLocaleDateString();
        const total = order.total || order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
        
        ordersList.innerHTML += `
          <div class="order-card">
            <div class="order-header">
              <span><strong>${order.orderNumber || 'ORD-' + order._id?.slice(-6)}</strong></span>
              <span class="order-status ${order.status}">${order.status}</span>
            </div>
            <div class="order-details">
              <p><i class="fas fa-calendar"></i> ${orderDate}</p>
              <p><i class="fas fa-user"></i> ${order.customerName || "Customer"}</p>
              <p><i class="fas fa-dollar-sign"></i> Total: $${total.toFixed(2)}</p>
            </div>
            <button class="btn-secondary" onclick="viewOrderDetails('${order._id}')">
              <i class="fas fa-eye"></i> View Details
            </button>
          </div>
        `;
      });
    } else {
      ordersList.innerHTML = `
        <div style="text-align:center; padding:40px; color:#666;">
          <i class="fas fa-clipboard-list" style="font-size:3rem; margin-bottom:15px;"></i>
          <p>No orders found</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading orders:", error);
    ordersList.innerHTML = `<div class="alert alert-error">Error loading orders</div>`;
  }
}

function viewOrderDetails(orderId) {
  alert(`Order ID: ${orderId}\n\nThis is a demo. In real app, detailed view would open.`);
}

// ========== ANALYTICS FUNCTIONS ==========
async function loadAnalytics() {
  try {
    const data = await fetchAPI('/analytics/dashboard');
    
    const revenueEl = document.getElementById("revenue");
    if (!revenueEl) return;
    
    if (data && data.stats) {
      const s = data.stats;
      revenueEl.innerHTML = `
        <div class="stats-container">
          <div class="stat-card">
            <i class="fas fa-chart-line"></i>
            <div class="stat-label">Total Revenue</div>
            <div class="stat-value">$${s.revenue?.totalRevenue?.toLocaleString() || '0'}</div>
          </div>
          <div class="stat-card">
            <i class="fas fa-shopping-cart"></i>
            <div class="stat-label">Orders</div>
            <div class="stat-value">${s.revenue?.orderCount || '0'}</div>
          </div>
          <div class="stat-card">
            <i class="fas fa-box"></i>
            <div class="stat-label">Products</div>
            <div class="stat-value">${s.products?.totalProducts || '0'}</div>
          </div>
          <div class="stat-card">
            <i class="fas fa-users"></i>
            <div class="stat-label">Users</div>
            <div class="stat-value">${s.users?.totalUsers || '0'}</div>
          </div>
        </div>
      `;
    } else {
      revenueEl.innerHTML = `
        <div class="stats-container">
          <div class="stat-card">
            <div class="stat-label">Total Revenue</div>
            <div class="stat-value">$12,450</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Orders This Month</div>
            <div class="stat-value">42</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Products</div>
            <div class="stat-value">156</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Active Users</div>
            <div class="stat-value">89</div>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading analytics:", error);
    document.getElementById("revenue").innerHTML = "<p>Error loading analytics</p>";
  }
}

// ========== DASHBOARD FUNCTIONS ==========
async function loadDashboard() {
  await loadAnalytics();
}

// ========== DEMO LOGIN ==========
async function demoLogin() {
  try {
    const data = await fetchAPI('/auth/demo', {
      method: 'POST'
    });
    
    if (data && data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('isLoggedIn', 'true');
      
      showAlert('✅ Login successful!', 'success');
      setTimeout(() => {
        window.location.href = 'products.html';
      }, 1000);
    }
  } catch (error) {
    console.error('Login error:', error);
    showAlert('Login failed. Starting in demo mode...', 'error');
    
    // Демо-режим если сервер не отвечает
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', JSON.stringify({
      name: 'Demo User',
      email: 'demo@final.project',
      role: 'admin'
    }));
    
    setTimeout(() => {
      window.location.href = 'products.html';
    }, 1500);
  }
}

// ========== UTILITY FUNCTIONS ==========
function logout() {
  localStorage.clear();
  showAlert('👋 Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
}

function showAlert(message, type = "success") {
  const oldAlert = document.querySelector('.alert');
  if (oldAlert) oldAlert.remove();
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    ${message}
  `;
  
  const container = document.querySelector('.container');
  if (container) {
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
      if (alertDiv.parentElement) alertDiv.remove();
    }, 5000);
  }
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
  // Проверка авторизации
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const currentPageName = window.location.pathname.split('/').pop();
  
  const protectedPages = ['products.html', 'dashboard.html', 'orders.html', 'analytics.html'];
  
  if (protectedPages.includes(currentPageName) && isLoggedIn !== "true") {
    window.location.href = "auth.html";
    return;
  }
  
  // Обновление кнопки Login/Logout
  const authLink = document.getElementById('authLink');
  if (authLink) {
    if (isLoggedIn === 'true') {
      authLink.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
      authLink.href = '#';
      authLink.onclick = function(e) {
        e.preventDefault();
        logout();
      };
    } else {
      authLink.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
      authLink.href = 'auth.html';
    }
  }
  
  // Загрузка статистики для главной страницы
  if (currentPageName === 'index.html' || currentPageName === '') {
    fetchAPI('/stats').then(data => {
      if (data && data.success) {
        if (data.totalProducts) document.getElementById('totalProducts').textContent = data.totalProducts;
        if (data.totalOrders) document.getElementById('totalOrders').textContent = data.totalOrders;
        if (data.totalRevenue) document.getElementById('totalRevenue').textContent = '$' + data.totalRevenue;
      }
    });
  }
  
  // Автозагрузка функций для страниц
  if (document.getElementById('productsList')) loadProducts();
  if (document.getElementById('ordersList')) loadOrders();
  if (document.getElementById('revenue')) loadAnalytics();
});