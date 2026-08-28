// Supabase Configuration
const SUPABASE_URL = "https://xiooplqvxxormahtbqtc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpb29wbHF2eHhvcm1haHRicXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4OTAwMzcsImV4cCI6MjEwMzQ2NjAzN30.hJJFLg_qkZ_VQeCxGsfMiVML-WIemfPfU5gTc9-8OjU";
let supabaseClient = null;

// Initialize Supabase client if SDK is loaded
if (typeof supabase !== 'undefined' && supabase.createClient) {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// State
let products = [];
let cart = [];
let wishlist = [];
let activeCategory = "all";
let searchQuery = "";
let sortBy = "default";
let appliedCoupon = null;

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  loadSavedState();
  initEventListeners();
  renderCategoryPills();
  
  // Try loading from Supabase first
  await fetchProductsFromSupabase();
  
  renderProducts();
  updateCartUI();
  updateWishlistUI();
});

// Fetch from Supabase
async function fetchProductsFromSupabase() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      // Map database schema to frontend properties
      products = data.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        categoryLabel: p.category_label || p.category,
        price: p.price,
        originalPrice: p.original_price,
        rating: p.rating || 5.0,
        reviewsCount: p.reviews_count || 10,
        badge: p.badge,
        description: p.description,
        image: p.image,
        inStock: p.in_stock,
        features: p.features || []
      }));
      console.log("Loaded products dynamically from Supabase!");
    }
  } catch (err) {
    console.warn("Could not load from Supabase database. Falling back to local catalog:", err.message);
  }
}

// Load State from LocalStorage
function loadSavedState() {
  const savedProducts = localStorage.getItem("tsp_products");
  if (savedProducts) {
    try {
      products = JSON.parse(savedProducts);
    } catch (e) {
      products = [...initialProducts];
    }
  } else {
    products = [...initialProducts];
  }

  const savedCart = localStorage.getItem("tsp_cart");
  if (savedCart) {
    try {
      cart = JSON.parse(savedCart);
    } catch (e) {
      cart = [];
    }
  }

  const savedWishlist = localStorage.getItem("tsp_wishlist");
  if (savedWishlist) {
    try {
      wishlist = JSON.parse(savedWishlist);
    } catch (e) {
      wishlist = [];
    }
  }

  const savedTheme = localStorage.getItem("tsp_theme");
  if (savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    const themeIcon = document.getElementById("theme-toggle-icon");
    if (themeIcon) themeIcon.textContent = "☀️";
  }
}

// Save State
function saveProducts() {
  localStorage.setItem("tsp_products", JSON.stringify(products));
}
function saveCart() {
  localStorage.setItem("tsp_cart", JSON.stringify(cart));
}
function saveWishlist() {
  localStorage.setItem("tsp_wishlist", JSON.stringify(wishlist));
}

// Categories Definition
const categories = [
  { id: "all", label: "✨ All Products", count: 0 },
  { id: "pen", label: "🖊️ Pens", count: 0 },
  { id: "pencil", label: "✏️ Pencils", count: 0 },
  { id: "slipper", label: "🩴 Slippers", count: 0 },
  { id: "bag", label: "🎒 Bags", count: 0 },
  { id: "fancies", label: "🎀 Fancies & Gifts", count: 0 }
];

// Render Category Pills
function renderCategoryPills() {
  const container = document.getElementById("category-pills");
  if (!container) return;

  container.innerHTML = categories.map(cat => `
    <button class="category-pill-btn ${activeCategory === cat.id ? 'active' : ''}" onclick="setCategory('${cat.id}')">
      ${cat.label}
    </button>
  `).join("");
}

function setCategory(catId) {
  activeCategory = catId;
  renderCategoryPills();
  renderProducts();
}

// Render Products Grid
function renderProducts() {
  const grid = document.getElementById("products-grid");
  const countLabel = document.getElementById("products-count");
  if (!grid) return;

  let filtered = products.filter(p => {
    const matchCategory = activeCategory === "all" || p.category === activeCategory;
    const matchSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Sorting
  if (sortBy === "price-low") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortBy === "price-high") {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortBy === "rating") {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  if (countLabel) {
    countLabel.textContent = `Showing ${filtered.length} of ${products.length} items`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No products found</h3>
        <p style="color: var(--text-muted); margin-top: 6px;">Try adjusting your search query or category filter.</p>
        <button class="btn btn-white" style="margin-top: 16px; border: 1px solid var(--border);" onclick="resetFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const isWishlisted = wishlist.includes(p.id);
    const discount = p.originalPrice ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
    
    return `
      <div class="product-card">
        <div class="card-image-wrap" onclick="openQuickView('${p.id}')">
          <img src="${p.image}" alt="${p.name}" class="card-img" onerror="this.src='https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80'">
          ${p.badge ? `<span class="card-badge ${p.badge.toLowerCase()}">${p.badge}</span>` : ''}
          <button class="card-wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="event.stopPropagation(); toggleWishlist('${p.id}')" title="Add to wishlist">
            ${isWishlisted ? '❤️' : '🤍'}
          </button>
          <div class="quick-view-overlay">👁️ Click for Quick View</div>
        </div>
        <div class="card-body">
          <span class="card-category">${p.categoryLabel || p.category}</span>
          <h3 class="card-title" onclick="openQuickView('${p.id}')" title="${p.name}">${p.name}</h3>
          <div class="card-rating">
            <span class="stars">★ ${p.rating}</span>
            <span>(${p.reviewsCount || 10} reviews)</span>
          </div>
          <div class="card-price-row">
            <div class="price-wrap">
              <span class="current-price">₹${p.price}</span>
              ${p.originalPrice ? `<span class="original-price">₹${p.originalPrice} (${discount}% OFF)</span>` : ''}
            </div>
            <button class="add-cart-btn" onclick="addToCart('${p.id}')">
              <span>+ Add</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Reset filters
function resetFilters() {
  activeCategory = "all";
  searchQuery = "";
  sortBy = "default";
  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.value = "";
  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) sortSelect.value = "default";
  renderCategoryPills();
  renderProducts();
}

// Cart Operations
function addToCart(productId, qty = 1) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.categoryLabel,
      quantity: qty
    });
  }

  saveCart();
  updateCartUI();
  showToast(`Added "${product.name}" to cart! 🛍️`);
}

function updateCartQty(productId, delta) {
  const itemIndex = cart.findIndex(i => i.id === productId);
  if (itemIndex === -1) return;

  cart[itemIndex].quantity += delta;
  if (cart[itemIndex].quantity <= 0) {
    cart.splice(itemIndex, 1);
    showToast("Item removed from cart");
  }

  saveCart();
  updateCartUI();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCart();
  updateCartUI();
  showToast("Item removed from cart");
}

function updateCartUI() {
  const badge = document.getElementById("cart-badge");
  const drawerList = document.getElementById("cart-items-list");
  const subtotalEl = document.getElementById("cart-subtotal");
  const discountEl = document.getElementById("cart-discount");
  const totalEl = document.getElementById("cart-total");

  const totalCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  if (badge) badge.textContent = totalCount;

  if (!drawerList) return;

  if (cart.length === 0) {
    drawerList.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
        <div style="font-size: 40px; margin-bottom: 10px;">🛒</div>
        <h4>Your cart is empty</h4>
        <p style="font-size: 13px; margin-top: 4px;">Explore our pens, pencils, slippers, bags & fancy items!</p>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = "₹0";
    if (discountEl) discountEl.textContent = "- ₹0";
    if (totalEl) totalEl.textContent = "₹0";
    return;
  }

  drawerList.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" class="cart-item-img" onerror="this.src='https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80'">
      <div class="cart-item-info">
        <h4 class="cart-item-title">${item.name}</h4>
        <div class="cart-item-price">₹${item.price} × ${item.quantity} = ₹${item.price * item.quantity}</div>
        <div class="cart-qty-controls">
          <button class="qty-btn" onclick="updateCartQty('${item.id}', -1)">-</button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn" onclick="updateCartQty('${item.id}', 1)">+</button>
        </div>
      </div>
      <button class="remove-item-btn" onclick="removeFromCart('${item.id}')" title="Remove item">🗑️</button>
    </div>
  `).join("");

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  let discount = 0;

  if (appliedCoupon === "TRENDY10") {
    discount = Math.round(subtotal * 0.10);
  }

  const finalTotal = Math.max(0, subtotal - discount);

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
  if (discountEl) discountEl.textContent = `- ₹${discount}`;
  if (totalEl) totalEl.textContent = `₹${finalTotal}`;
}

// Coupon Handling
function applyCoupon() {
  const input = document.getElementById("coupon-code");
  if (!input) return;
  const code = input.value.trim().toUpperCase();

  if (code === "TRENDY10") {
    appliedCoupon = "TRENDY10";
    showToast("🎉 Coupon TRENDY10 applied! 10% discount added.");
    updateCartUI();
  } else if (code === "") {
    showToast("Please enter a coupon code");
  } else {
    showToast("❌ Invalid coupon. Try 'TRENDY10'");
  }
}

// Wishlist
function toggleWishlist(productId) {
  const index = wishlist.indexOf(productId);
  if (index > -1) {
    wishlist.splice(index, 1);
    showToast("Removed from wishlist");
  } else {
    wishlist.push(productId);
    showToast("❤️ Saved to wishlist!");
  }
  saveWishlist();
  updateWishlistUI();
  renderProducts();
}

function updateWishlistUI() {
  const badge = document.getElementById("wishlist-badge");
  if (badge) badge.textContent = wishlist.length;
  renderWishlistModalContent();
}

function renderWishlistModalContent() {
  const content = document.getElementById("wishlist-content");
  if (!content) return;

  const wishlistedItems = products.filter(p => wishlist.includes(p.id));

  if (wishlistedItems.length === 0) {
    content.innerHTML = `
      <div style="text-align: center; padding: 30px 10px; color: var(--text-muted);">
        <div style="font-size: 36px; margin-bottom: 8px;">🤍</div>
        <h4>Your wishlist is empty</h4>
        <p style="font-size: 13px; margin-top: 4px;">Click the heart icon on any product to save it here!</p>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${wishlistedItems.map(item => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg-page);">
          <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; border-radius: var(--radius-sm); object-fit: cover;">
          <div style="flex: 1;">
            <h5 style="font-size: 13px; font-weight: 700; margin-bottom: 2px;">${item.name}</h5>
            <div style="font-size: 13px; font-weight: 700; color: var(--primary);">₹${item.price}</div>
          </div>
          <button class="btn btn-white" style="padding: 6px 10px; font-size: 12px; border: 1px solid var(--border);" onclick="addToCart('${item.id}'); closeModal('wishlist-modal');">
            🛒 Add
          </button>
          <button class="remove-item-btn" onclick="toggleWishlist('${item.id}')" title="Remove">✕</button>
        </div>
      `).join("")}
    </div>
  `;
}


// Quick View Modal
function openQuickView(productId) {
  const p = products.find(prod => prod.id === productId);
  if (!p) return;

  const modalBody = document.getElementById("quickview-body");
  if (!modalBody) return;

  modalBody.innerHTML = `
    <div class="quick-view-grid">
      <div>
        <img src="${p.image}" alt="${p.name}" class="quick-view-img" onerror="this.src='https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80'">
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <span class="card-category">${p.categoryLabel || p.category}</span>
        <h2 style="font-size: 20px; font-weight: 800;">${p.name}</h2>
        <div class="card-rating">
          <span class="stars">★ ${p.rating}</span>
          <span>(${p.reviewsCount || 15} verified reviews)</span>
        </div>
        <div style="display: flex; align-items: baseline; gap: 10px;">
          <span style="font-size: 24px; font-weight: 800; color: var(--primary);">₹${p.price}</span>
          ${p.originalPrice ? `<span style="text-decoration: line-through; color: var(--text-muted);">₹${p.originalPrice}</span>` : ''}
        </div>
        <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5;">${p.description}</p>
        
        ${p.features && p.features.length ? `
          <div>
            <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 6px;">Key Highlights:</h4>
            <ul style="font-size: 12px; color: var(--text-muted); padding-left: 18px;">
              ${p.features.map(f => `<li>${f}</li>`).join("")}
            </ul>
          </div>
        ` : ''}

        <div style="margin-top: auto; display: flex; gap: 10px; padding-top: 14px;">
          <button class="btn btn-white" style="flex: 1; border: 1px solid var(--border);" onclick="addToCart('${p.id}'); closeAllModals();">
            🛒 Add to Cart
          </button>
          <a href="https://wa.me/${STORE_PHONE_INTL}?text=${encodeURIComponent(`Hello Trendy Shopping Point, I want to inquire about: ${p.name} (₹${p.price})`)}" target="_blank" class="btn btn-whatsapp">
            💬 WhatsApp
          </a>
        </div>
      </div>
    </div>
  `;

  openModal("quickview-modal");
}

// Checkout Modal
function openCheckoutModal() {
  if (cart.length === 0) {
    showToast("⚠️ Your cart is empty! Add items first.");
    return;
  }
  closeCartDrawer();
  
  // Render checkout summary
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  let discount = appliedCoupon === "TRENDY10" ? Math.round(subtotal * 0.10) : 0;
  const total = Math.max(0, subtotal - discount);

  const summaryEl = document.getElementById("checkout-order-summary");
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div style="background: var(--bg-page); padding: 12px; border-radius: var(--radius-sm); margin-bottom: 16px;">
        <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 8px;">Order Summary (${cart.reduce((a,b) => a + b.quantity, 0)} Items)</h4>
        <div style="max-height: 120px; overflow-y: auto; font-size: 12px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
          ${cart.map(i => `<div>${i.name} (x${i.quantity}) - <b>₹${i.price * i.quantity}</b></div>`).join("")}
        </div>
        <div style="border-top: 1px dashed var(--border); padding-top: 6px; font-size: 14px; font-weight: 800; display: flex; justify-content: space-between;">
          <span>Payable Amount:</span>
          <span style="color: var(--primary);">₹${total}</span>
        </div>
      </div>
    `;
  }

  openModal("checkout-modal");
}

// Handle Order Submission
function processCheckout(event) {
  event.preventDefault();
  const name = document.getElementById("cust-name").value.trim();
  const phone = document.getElementById("cust-phone").value.trim();
  const address = document.getElementById("cust-address").value.trim();
  const paymentMethod = document.getElementById("payment-method").value;

  if (!name || !phone || !address) {
    showToast("Please fill all required customer details.");
    return;
  }

  const orderId = "TSP-" + Date.now().toString().slice(-6);
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  let discount = appliedCoupon === "TRENDY10" ? Math.round(subtotal * 0.10) : 0;
  const total = Math.max(0, subtotal - discount);

  const orderData = {
    orderId,
    date: new Date().toLocaleString(),
    customer: { name, phone, address, paymentMethod },
    items: [...cart],
    subtotal,
    discount,
    total
  };

  // Generate Invoice Popup & WhatsApp dispatch
  closeModal("checkout-modal");
  renderInvoice(orderData);
  openModal("invoice-modal");

  // Clear cart
  cart = [];
  appliedCoupon = null;
  saveCart();
  updateCartUI();
  showToast("🎉 Order placed successfully!");
}

// Direct WhatsApp Order
function orderViaWhatsApp() {
  if (cart.length === 0) {
    showToast("⚠️ Your cart is empty!");
    return;
  }

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  let discount = appliedCoupon === "TRENDY10" ? Math.round(subtotal * 0.10) : 0;
  const total = Math.max(0, subtotal - discount);

  let message = `🛍️ *NEW ORDER - TRENDY SHOPPING POINT*\n`;
  message += `📞 Store: +91 ${STORE_PHONE}\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `*Items:*\n`;

  cart.forEach((item, index) => {
    message += `${index + 1}. *${item.name}*\n   Qty: ${item.quantity} | Rate: ₹${item.price} | Total: ₹${item.price * item.quantity}\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━\n`;
  message += `Subtotal: ₹${subtotal}\n`;
  if (discount > 0) message += `Discount (TRENDY10): -₹${discount}\n`;
  message += `*Grand Total: ₹${total}*\n\n`;
  message += `Please confirm my order and share payment/delivery details. Thank you!`;

  const waUrl = `https://wa.me/${STORE_PHONE_INTL}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, "_blank");
}

// Render Printable Invoice
function renderInvoice(order) {
  const invoiceBox = document.getElementById("invoice-content");
  if (!invoiceBox) return;

  invoiceBox.innerHTML = `
    <div class="invoice-container printable-area">
      <div class="invoice-header">
        <h2>${STORE_NAME}</h2>
        <div class="invoice-meta">Pens • Pencils • Slippers • Bags • Fancy Items</div>
        <div class="invoice-meta">📞 Phone / WhatsApp: +91 ${STORE_PHONE}</div>
        <div class="invoice-meta" style="margin-top: 6px; font-weight: 700; color: #111;">
          Bill No: <b>${order.orderId}</b> | Date: ${order.date}
        </div>
      </div>

      <div style="font-size: 12px; margin-bottom: 12px; line-height: 1.5;">
        <b>Billed To:</b><br>
        Name: ${order.customer.name}<br>
        Phone: ${order.customer.phone}<br>
        Address: ${order.customer.address}<br>
        Payment Mode: ${order.customer.paymentMethod}
      </div>

      <table class="invoice-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Item Name</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Rate</th>
            <th style="text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map((item, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${item.name}</td>
              <td style="text-align:center;">${item.quantity}</td>
              <td style="text-align:right;">₹${item.price}</td>
              <td style="text-align:right;">₹${item.price * item.quantity}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="invoice-total-box">
        <div style="font-size: 13px; font-weight: normal; color: #555;">Subtotal: ₹${order.subtotal}</div>
        ${order.discount > 0 ? `<div style="font-size: 13px; font-weight: normal; color: #16a34a;">Discount: -₹${order.discount}</div>` : ''}
        <div style="font-size: 16px; margin-top: 6px;">Total Payable: <span style="color: #4f46e5;">₹${order.total}</span></div>
      </div>

      <div style="text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px dashed #ccc; font-size: 11px; color: #666;">
        ✨ Thank you for shopping with Trendy Shopping Point! Visit Again! ✨<br>
        For orders & queries, WhatsApp us at: <b>+91 ${STORE_PHONE}</b>
      </div>
    </div>
  `;
}

// Shopkeeper / Admin Functions
function handleAddProduct(event) {
  event.preventDefault();
  const name = document.getElementById("prod-name").value.trim();
  const category = document.getElementById("prod-category").value;
  const price = Number(document.getElementById("prod-price").value);
  const originalPrice = Number(document.getElementById("prod-orig-price").value) || price;
  const image = document.getElementById("prod-image").value.trim() || "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80";
  const badge = document.getElementById("prod-badge").value.trim();
  const description = document.getElementById("prod-desc").value.trim();

  const categoryLabels = {
    pen: "Pens",
    pencil: "Pencils",
    slipper: "Slippers",
    bag: "Bags",
    fancies: "Fancies"
  };

  const newProd = {
    id: `${category}-${Date.now()}`,
    name,
    category,
    categoryLabel: categoryLabels[category] || "General",
    price,
    originalPrice,
    rating: 5.0,
    reviewsCount: 1,
    badge: badge || "New",
    description,
    image,
    inStock: true,
    features: ["Authentic Quality", "Trendy Design"]
  };

  products.unshift(newProd);
  saveProducts();
  renderProducts();
  closeModal("admin-modal");
  document.getElementById("add-product-form").reset();
  showToast(`🎉 New product "${name}" added successfully!`);
}

function resetToDefaultProducts() {
  if (confirm("Reset all products to default store inventory?")) {
    products = [...initialProducts];
    saveProducts();
    renderProducts();
    closeModal("admin-modal");
    showToast("Products reset to default inventory.");
  }
}

// Drawer and Modal UI Controllers
function toggleCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-drawer-overlay");
  if (drawer && overlay) {
    drawer.classList.toggle("open");
    overlay.classList.toggle("open");
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-drawer-overlay");
  if (drawer && overlay) {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("open");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("open");
}

function closeAllModals() {
  document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("open"));
}

// Theme Toggle
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const newTheme = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("tsp_theme", newTheme);
  const themeIcon = document.getElementById("theme-toggle-icon");
  if (themeIcon) themeIcon.textContent = newTheme === "dark" ? "☀️" : "🌙";
}

// Toast Notifications
function showToast(msg) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-20px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Event Listeners Initializer
function initEventListeners() {
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderProducts();
    });
  }

  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      sortBy = e.target.value;
      renderProducts();
    });
  }

  // Close modals on outside click
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("open");
      }
    });
  });
}
