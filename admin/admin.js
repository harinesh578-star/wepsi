// Supabase Configuration
const SUPABASE_URL = "https://xiooplqvxxormahtbqtc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpb29wbHF2eHxvcm1haHRicXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4OTAwMzcsImV4cCI6MjEwMzQ2NjAzN30.hJJFLg_qkZ_VQeCxGsfMiVML-WIemfPfU5gTc9-8OjU";

// Initialize Supabase Client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State
let productsList = [];
let filteredProducts = [];

// DOM Elements
const loginScreen = document.getElementById("login-screen");
const dashboardContent = document.getElementById("dashboard-content");
const loginError = document.getElementById("login-error");
const productsTableBody = document.getElementById("products-table-body");
const pinInput = document.getElementById("admin-pin");

// Check PIN login
function checkPin() {
  const pin = pinInput.value;
  if (pin === "1234") {
    loginScreen.classList.add("opacity-0");
    setTimeout(() => {
      loginScreen.classList.add("hidden");
      dashboardContent.classList.remove("hidden");
      sessionStorage.setItem("admin_logged_in", "true");
      loadProductsFromSupabase();
    }, 300);
  } else {
    loginError.classList.remove("hidden");
    pinInput.value = "";
    pinInput.focus();
  }
}

// Auto Login if session exists
if (sessionStorage.getItem("admin_logged_in") === "true") {
  loginScreen.classList.add("hidden");
  dashboardContent.classList.remove("hidden");
  loadProductsFromSupabase();
}

// Logout
function logout() {
  sessionStorage.removeItem("admin_logged_in");
  window.location.reload();
}

// Load Products from Supabase
async function loadProductsFromSupabase() {
  productsTableBody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center py-12 text-slate-400">Loading products from Supabase...</td>
    </tr>
  `;

  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    productsList = data || [];
    filteredProducts = [...productsList];
    renderProductsTable();
    updateStats();
    hideDbSetupBanner();
  } catch (error) {
    console.error("Supabase load error:", error);
    showToast("⚠️ Could not load products. Please check if table exists in Supabase.", "error");
    
    // Fallback to local products for visualization
    productsList = [];
    filteredProducts = [];
    productsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-12 text-red-500">
          <div class="font-bold mb-2">Supabase table "products" not found!</div>
          <div class="text-xs text-slate-500 max-w-md mx-auto mb-4">You need to create the table in your Supabase SQL Editor first. Click the "Auto-Create Tables & Sync Defaults" button in the status banner.</div>
        </td>
      </tr>
    `;
  }
}

// Render Table
function renderProductsTable() {
  if (filteredProducts.length === 0) {
    productsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-12 text-slate-400">No products found. Add some products or sync default items!</td>
      </tr>
    `;
    return;
  }

  productsTableBody.innerHTML = filteredProducts.map(p => {
    const originalPrice = p.original_price || p.price;
    const discount = originalPrice > p.price ? Math.round(((originalPrice - p.price) / originalPrice) * 100) : 0;
    
    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            <img src="${p.image}" alt="${p.name}" class="w-12 h-12 object-cover rounded-lg border border-slate-200" onerror="this.src='https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80'">
            <div>
              <div class="font-bold text-slate-900 line-clamp-1">${p.name}</div>
              <div class="text-xs text-slate-400 line-clamp-1">${p.description || 'No description'}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">
            ${p.category_label || p.category}
          </span>
        </td>
        <td class="px-6 py-4">
          <div class="font-bold text-slate-900">₹${p.price}</div>
          ${p.original_price ? `<div class="text-xs text-slate-400 line-through">₹${p.original_price}</div>` : ''}
        </td>
        <td class="px-6 py-4">
          <div class="flex items-center gap-1">
            <span class="text-amber-400">★</span>
            <span class="font-bold">${p.rating || 5.0}</span>
          </div>
        </td>
        <td class="px-6 py-4">
          ${p.badge ? `<span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-indigo-50 text-indigo-600">${p.badge}</span>` : '<span class="text-slate-300">-</span>'}
        </td>
        <td class="px-6 py-4">
          ${p.in_stock ? `
            <span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> In Stock
            </span>
          ` : `
            <span class="inline-flex items-center gap-1 text-xs font-bold text-rose-500">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Out of Stock
            </span>
          `}
        </td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button onclick="editProduct('${p.id}')" class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-bold transition">
              Edit
            </button>
            <button onclick="deleteProduct('${p.id}')" class="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold transition">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// Filter and Search Table
function filterAndRenderTable() {
  const query = document.getElementById("admin-search").value.toLowerCase();
  const categoryFilter = document.getElementById("admin-category-filter").value;

  filteredProducts = productsList.filter(p => {
    const matchCategory = categoryFilter === "all" || p.category === categoryFilter;
    const matchSearch = p.name.toLowerCase().includes(query) || 
      (p.description || '').toLowerCase().includes(query) ||
      (p.category_label || p.category).toLowerCase().includes(query);
    return matchCategory && matchSearch;
  });

  renderProductsTable();
}

// Update Dashboard Statistics
function updateStats() {
  const total = productsList.length;
  const pens = productsList.filter(p => p.category === "pen").length;
  const pencils = productsList.filter(p => p.category === "pencil").length;
  const bags = productsList.filter(p => p.category === "bag" || p.category === "slipper").length;
  const fancies = productsList.filter(p => p.category === "fancies").length;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-pens").textContent = pens;
  document.getElementById("stat-pencils").textContent = pencils;
  document.getElementById("stat-bags").textContent = bags;
  document.getElementById("stat-fancies").textContent = fancies;
}

// Open Product Modal
function openProductModal() {
  document.getElementById("product-form").reset();
  document.getElementById("edit-product-id").value = "";
  document.getElementById("modal-title").textContent = "Add Product";
  document.getElementById("product-modal").classList.remove("hidden");
}

// Close Product Modal
function closeProductModal() {
  document.getElementById("product-modal").classList.add("hidden");
}

// Edit Product
function editProduct(id) {
  const p = productsList.find(item => item.id === id || String(item.id) === String(id));
  if (!p) return;

  document.getElementById("edit-product-id").value = p.id;
  document.getElementById("form-name").value = p.name;
  document.getElementById("form-category").value = p.category;
  document.getElementById("form-price").value = p.price;
  document.getElementById("form-original-price").value = p.original_price || "";
  document.getElementById("form-rating").value = p.rating || 5.0;
  document.getElementById("form-badge").value = p.badge || "";
  document.getElementById("form-image").value = p.image;
  document.getElementById("form-description").value = p.description || "";
  document.getElementById("form-in-stock").checked = p.in_stock;

  document.getElementById("modal-title").textContent = "Edit Product";
  document.getElementById("product-modal").classList.remove("hidden");
}

// Save Product (Insert / Update)
async function saveProduct(event) {
  event.preventDefault();

  const id = document.getElementById("edit-product-id").value;
  const name = document.getElementById("form-name").value.trim();
  const category = document.getElementById("form-category").value;
  const price = parseFloat(document.getElementById("form-price").value);
  const original_price = parseFloat(document.getElementById("form-original-price").value) || null;
  const rating = parseFloat(document.getElementById("form-rating").value) || 5.0;
  const badge = document.getElementById("form-badge").value.trim() || null;
  const image = document.getElementById("form-image").value.trim();
  const description = document.getElementById("form-description").value.trim();
  const in_stock = document.getElementById("form-in-stock").checked;

  const categoryLabels = {
    pen: "Pens",
    pencil: "Pencils",
    slipper: "Slippers",
    bag: "Bags",
    fancies: "Fancies"
  };

  const payload = {
    name,
    category,
    category_label: categoryLabels[category] || "General",
    price,
    original_price,
    rating,
    badge,
    image,
    description,
    in_stock,
    features: ["Authentic Quality", "Trendy Design"]
  };

  try {
    let result;
    if (id) {
      // Update
      const { data, error } = await supabaseClient
        .from("products")
        .update(payload)
        .eq("id", id)
        .select();

      if (error) throw error;
      result = data;
      showToast("🎉 Product updated successfully!");
    } else {
      // Insert
      const { data, error } = await supabaseClient
        .from("products")
        .insert([payload])
        .select();

      if (error) throw error;
      result = data;
      showToast("🎉 Product added successfully!");
    }

    closeProductModal();
    loadProductsFromSupabase();
  } catch (error) {
    console.error("Save error:", error);
    showToast("❌ Error saving product: " + error.message, "error");
  }
}

// Delete Product
async function deleteProduct(id) {
  if (!confirm("Are you sure you want to delete this product from Supabase?")) return;

  try {
    const { error } = await supabaseClient
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;

    showToast("🗑️ Product deleted successfully!");
    loadProductsFromSupabase();
  } catch (error) {
    console.error("Delete error:", error);
    showToast("❌ Error deleting product: " + error.message, "error");
  }
}

// Database Setup Helper
async function setupDatabaseTable() {
  const confirmText = 
    `To connect Supabase, please make sure you have run the database setup in Supabase.\n\n` +
    `Click OK to download the SQL Setup queries, paste them into your Supabase SQL Editor, run it, and then the app will sync with Supabase automatically!`;
  
  if (confirm(confirmText)) {
    // We will generate the SQL setup instructions for the user.
    const sqlQuery = 
`-- Paste this in your Supabase SQL Editor and click RUN:

create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  name text not null,
  category text not null,
  category_label text,
  price numeric not null,
  original_price numeric,
  rating numeric,
  reviews_count integer default 15,
  badge text,
  description text,
  image text,
  in_stock boolean default true,
  features text[]
);

-- Enable RLS
alter table public.products enable row level security;

-- Create policy to allow select to anyone
create policy "Allow public read" on public.products
  for select using (true);

-- Create policy to allow all actions for anon key
create policy "Allow all access" on public.products
  for all using (true) with check (true);
`;

    // Download SQL as text file
    const blob = new Blob([sqlQuery], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "supabase_setup.sql";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Try seed database now
    if (confirm("Would you like to seed the Supabase database with all local default products right now?")) {
      await seedDatabase();
    }
  }
}

// Seed Database
async function seedDatabase() {
  showToast("Seeding database, please wait...");
  
  const formattedItems = initialProducts.map(p => ({
    name: p.name,
    category: p.category,
    category_label: p.categoryLabel,
    price: p.price,
    original_price: p.originalPrice || null,
    rating: p.rating || 5.0,
    reviews_count: p.reviewsCount || 10,
    badge: p.badge || null,
    description: p.description,
    image: p.image,
    in_stock: p.inStock,
    features: p.features || []
  }));

  try {
    const { data, error } = await supabaseClient
      .from("products")
      .insert(formattedItems)
      .select();

    if (error) throw error;

    showToast("🎉 Database seeded with default products!");
    loadProductsFromSupabase();
  } catch (error) {
    console.error("Seed error:", error);
    showToast("❌ Error seeding database: " + error.message + ". Did you run the SQL script first?", "error");
  }
}

// Hide Status Banner if connected
function hideDbSetupBanner() {
  const banner = document.getElementById("db-status-banner");
  if (banner && productsList.length > 0) {
    banner.classList.add("hidden");
  }
}

// Toast Notifications
function showToast(msg, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const bg = type === "success" ? "bg-indigo-600" : "bg-red-600";
  const toast = document.createElement("div");
  toast.className = `${bg} text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold transition-all duration-300 transform translate-y-2 opacity-0 flex items-center gap-2`;
  toast.innerHTML = `<span>${msg}</span>`;
  
  container.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.classList.remove("translate-y-2", "opacity-0");
  }, 10);

  // Remove
  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-2");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
