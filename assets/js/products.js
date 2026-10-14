// ==============================================================================
// Dhanalakshmi Crackers - Public Products Catalog & Details
// ==============================================================================

let loadedProducts = [];
let loadedCategories = [];
let activeCategory = "all";

/**
 * Fetch Categories from Supabase or fallback
 */
async function fetchCategories() {
  const sb = getSupabase();
  if (isSupabaseConfigured() && sb) {
    try {
      const { data, error } = await sb
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (!error && data && data.length > 0) {
        loadedCategories = data;
        return data;
      }
    } catch (e) {
      console.warn("Could not load categories from Supabase", e);
    }
  }

  // Load from local storage or fallback
  const stored = localStorage.getItem("dc_custom_categories");
  loadedCategories = stored ? JSON.parse(stored) : DEFAULT_CATEGORIES;
  return loadedCategories;
}

/**
 * Fetch Products from hybrid store (LocalStorage + Supabase)
 * Guarantees admin changes in Admin Panel immediately reflect on storefront without being overwritten
 */
async function fetchProducts() {
  // 1. Load local authoritative products (seeded with DEFAULT_PRODUCTS if empty)
  let localProducts = typeof getStoredCustomProducts === "function" 
    ? getStoredCustomProducts() 
    : JSON.parse(localStorage.getItem("dc_custom_products") || "[]");

  if (!localProducts || localProducts.length === 0) {
    localProducts = [...DEFAULT_PRODUCTS];
    localStorage.setItem("dc_custom_products", JSON.stringify(localProducts));
  }

  // 2. Filter out products explicitly deleted in Admin Panel
  const deletedIds = typeof getDeletedProductIds === "function" ? getDeletedProductIds() : [];
  localProducts = localProducts.filter(p => !deletedIds.includes(p.id));

  // 3. Reconcile with Supabase cloud products if available
  const sb = getSupabase();
  if (isSupabaseConfigured() && sb) {
    try {
      const { data, error } = await sb
        .from("products")
        .select("*, categories(name)")
        .eq("is_active", true)
        .order("is_featured", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        // Build map of local products by ID and SKU
        const localById = new Map();
        const localBySku = new Map();
        localProducts.forEach(p => {
          if (p.id) localById.set(p.id, p);
          if (p.sku) localBySku.set(p.sku, p);
        });

        // Remote products from Supabase are the authoritative online source
        data.forEach(remote => {
          if (deletedIds.includes(remote.id)) return; // Skipped if deleted by admin

          const catName = (remote.categories && remote.categories.name) 
            || (DEFAULT_CATEGORIES.find(c => c.id === remote.category_id)?.name) 
            || "Assorted";

          const remoteItem = {
            id: remote.id,
            name: remote.name,
            sku: remote.sku,
            category_id: remote.category_id,
            category_name: catName,
            price: Number(remote.price),
            original_price: Number(remote.original_price || remote.price),
            stock_quantity: Number(remote.stock_quantity),
            min_stock_alert: Number(remote.min_stock_alert || 10),
            unit: remote.unit || "Box",
            description: remote.description || "",
            image_url: remote.image_url,
            is_featured: Boolean(remote.is_featured),
            is_active: remote.is_active !== false
          };

          const existingIdx = localProducts.findIndex(p => p.id === remote.id || (remote.sku && p.sku === remote.sku));
          if (existingIdx !== -1) {
            localProducts[existingIdx] = { ...localProducts[existingIdx], ...remoteItem };
          } else {
            localProducts.push(remoteItem);
          }
        });

        // Save reconciled products back to local storage
        localStorage.setItem("dc_custom_products", JSON.stringify(localProducts));
      }
    } catch (e) {
      console.warn("Could not sync remote products from Supabase, using local catalog", e);
    }
  }

  loadedProducts = localProducts;
  return loadedProducts;
}

/**
 * Render category filter pills on products page
 */
function renderCategoryPills(categories, targetElementId = "categoryFilterPills") {
  const container = document.getElementById(targetElementId);
  if (!container) return;

  container.innerHTML = `
    <button class="filter-chip ${activeCategory === 'all' ? 'active' : ''}" onclick="filterByCategory('all')">
      ✨ All Fireworks
    </button>
  `;

  categories.forEach(cat => {
    const chip = document.createElement("button");
    chip.className = `filter-chip ${activeCategory === cat.id ? 'active' : ''}`;
    chip.textContent = cat.name;
    chip.onclick = () => filterByCategory(cat.id);
    container.appendChild(chip);
  });
}

/**
 * Filter products by category
 */
function filterByCategory(categoryId) {
  activeCategory = categoryId;
  const chips = document.querySelectorAll(".filter-chip");
  chips.forEach(chip => chip.classList.remove("active"));

  if (window.event && window.event.target && window.event.target.classList.contains("filter-chip")) {
    window.event.target.classList.add("active");
  } else {
    // Find matching chip
    chips.forEach(chip => {
      if (categoryId === 'all' && chip.textContent.includes("All Fireworks")) {
        chip.classList.add("active");
      } else {
        const found = loadedCategories.find(c => c.id === categoryId);
        if (found && chip.textContent.trim() === found.name.trim()) {
          chip.classList.add("active");
        }
      }
    });
  }

  applyFilters();
}

/**
 * Filter by search text and active category
 */
function applyFilters() {
  const searchInput = document.getElementById("productSearchInput");
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

  const filtered = loadedProducts.filter(p => {
    const matchesCategory = (activeCategory === "all") || (p.category_id === activeCategory);
    const matchesSearch = !query || 
      p.name.toLowerCase().includes(query) || 
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  const countBadge = document.getElementById("catalogResultsCount");
  if (countBadge) {
    countBadge.textContent = `${filtered.length} products`;
  }

  const clearBtn = document.getElementById("clearSearchBtn");
  if (clearBtn) {
    clearBtn.style.display = query ? "block" : "none";
  }

  renderProductsGrid(filtered);
}

/**
 * Render product cards in grid
 */
function renderProductsGrid(products, targetContainerId = "productsGrid") {
  const container = document.getElementById(targetContainerId);
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `
      <div class="products-empty-state" style="grid-column: 1 / -1; text-align: center; padding: 4rem 1.5rem; background: #ffffff; border-radius: 16px; border: 1px dashed var(--border-color);">
        <div style="font-size: 3.5rem; margin-bottom: 0.75rem; animation: floatDiya 3s ease-in-out infinite;">🎆</div>
        <h3 style="font-family: var(--font-heading); font-size: 1.35rem; color: var(--text-main); margin-bottom: 0.4rem;">No matching fireworks found</h3>
        <p style="color: #6b7280; font-size: 0.95rem; margin-bottom: 1.25rem;">Try searching for sparklers, chakkars, pots or clear category filter.</p>
        <button class="btn btn-secondary btn-sm" onclick="filterByCategory('all')">View All Fireworks</button>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  products.forEach(p => {
    const original = Number(p.original_price || p.price);
    const current = Number(p.price);
    const discount = original > current ? Math.round(((original - current) / original) * 100) : null;
    const savings = original > current ? (original - current) : null;

    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-img-wrapper">
        <img src="${p.image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500'}" alt="${p.name}" class="product-img" loading="lazy">
        <div class="product-badges-corner">
          ${discount ? `<span class="product-badge-discount">🔥 ${discount}% OFF</span>` : ""}
          <span class="product-badge-green" title="Certified Green Cracker">🌿 Green</span>
        </div>
        <span class="product-badge-stock ${p.stock_quantity > 0 ? 'in-stock' : 'out-of-stock'}">
          ${p.stock_quantity > 0 ? '● In Stock' : 'Out of Stock'}
        </span>
      </div>
      <div class="product-content">
        <div class="product-top-row">
          <span class="product-category-label">${p.category_name || 'Crackers'}</span>
          <span class="product-sku-tag">SKU: ${p.sku || 'N/A'}</span>
        </div>
        <h3 class="product-title">
          <a href="product-details.html?id=${p.id}">${p.name}</a>
        </h3>
        <p class="product-desc">${p.description || 'Genuine Sivakasi firecracker with superior safety testing.'}</p>
        <div class="product-footer">
          <div class="price-box">
            <div class="price-row">
              <span class="price-current">${formatCurrency(p.price)}</span>
              ${original > current ? `<span class="price-original">${formatCurrency(original)}</span>` : ""}
            </div>
            ${savings ? `<span class="price-savings-pill">Save ${formatCurrency(savings)}</span>` : ""}
          </div>
          <button class="btn-add-cart" onclick="quickAddProduct('${p.id}', this)" aria-label="Add ${p.name} to cart">
            <span class="cart-btn-icon">🛒</span>
            <span class="cart-btn-text">Add</span>
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * Visual feedback helper for add-to-cart buttons
 */
function animateAddButton(btnElement) {
  if (!btnElement) return;
  const originalHtml = btnElement.innerHTML;
  btnElement.classList.add("btn-added-state");
  btnElement.innerHTML = `<span style="font-weight:700;">✓ Added!</span>`;
  btnElement.disabled = true;

  setTimeout(() => {
    btnElement.classList.remove("btn-added-state");
    btnElement.innerHTML = originalHtml;
    btnElement.disabled = false;
  }, 1200);
}

/**
 * Quick add helper by product ID with animated tactile feedback
 */
function quickAddProduct(productId, btnElement) {
  if (btnElement && btnElement.disabled) return;
  const product = loadedProducts.find(p => p.id === productId);
  if (!product) return;

  addToCart(product, 1);
  animateAddButton(btnElement);
}

/**
 * Load and display single product details on product-details.html
 */
async function loadProductDetails() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");
  if (!productId) return;

  await fetchProducts();
  const product = loadedProducts.find(p => p.id === productId);
  if (!product) {
    const el = document.getElementById("productDetailsContainer");
    if (el) el.innerHTML = `<h2>Product not found</h2><a href="products.html" class="btn btn-primary">Return to Catalog</a>`;
    return;
  }

  // Populate Details
  const titleEl = document.getElementById("detailTitle");
  const skuEl = document.getElementById("detailSku");
  const priceEl = document.getElementById("detailPrice");
  const origPriceEl = document.getElementById("detailOriginalPrice");
  const descEl = document.getElementById("detailDesc");
  const imgEl = document.getElementById("detailImage");
  const stockEl = document.getElementById("detailStock");
  const unitEl = document.getElementById("detailUnit");

  if (titleEl) titleEl.textContent = product.name;
  if (skuEl) skuEl.textContent = product.sku || "N/A";
  if (priceEl) priceEl.textContent = formatCurrency(product.price);
  if (origPriceEl) origPriceEl.textContent = (product.original_price && product.original_price > product.price) ? formatCurrency(product.original_price) : "";
  if (descEl) descEl.textContent = product.description || "Authentic Sivakasi fireworks with superior safety certification.";
  if (imgEl && product.image_url) imgEl.src = product.image_url;
  if (stockEl) {
    if (product.stock_quantity > 0) {
      stockEl.textContent = `${product.stock_quantity} Boxes Available`;
      stockEl.className = "stock-status-pill in-stock";
    } else {
      stockEl.textContent = "Out of Stock";
      stockEl.className = "stock-status-pill out-of-stock";
    }
  }
  if (unitEl) unitEl.textContent = product.unit || "Box";

  // Update Page Title dynamically
  document.title = `${product.name} | Dhanalakshmi Crackers Sivakasi`;

  const addBtn = document.getElementById("detailAddToCartBtn");
  if (addBtn) {
    if (product.stock_quantity <= 0) {
      addBtn.disabled = true;
      addBtn.textContent = "Out of Stock";
      addBtn.style.opacity = "0.6";
      addBtn.style.cursor = "not-allowed";
    } else {
      addBtn.disabled = false;
      addBtn.textContent = "🛒 Add to Cart";
      addBtn.style.opacity = "1";
      addBtn.style.cursor = "pointer";
      addBtn.onclick = () => {
        if (addBtn.disabled) return;
        const qtyInput = document.getElementById("detailQtyInput");
        const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;
        addToCart(product, qty);
        animateAddButton(addBtn);
      };
    }
  }
}

// Initializer for Product Listing & Details pages
document.addEventListener("DOMContentLoaded", async () => {
  const isCatalogPage = document.getElementById("productsGrid");
  const isDetailsPage = document.getElementById("productDetailsContainer");
  const isHomePageFeatured = document.getElementById("featuredProductsGrid");

  if (isCatalogPage || isHomePageFeatured) {
    const [cats, prods] = await Promise.all([fetchCategories(), fetchProducts()]);
    
    // Check if URL specified category parameter (e.g. ?category=gift-boxes or ?category=cat-7)
    const urlParams = new URLSearchParams(window.location.search);
    const catQuery = urlParams.get("category");
    if (catQuery) {
      const matchedCat = cats.find(c => 
        c.id === catQuery || 
        c.slug === catQuery || 
        c.name.toLowerCase().includes(catQuery.toLowerCase())
      );
      if (matchedCat) {
        activeCategory = matchedCat.id;
      }
    }

    if (isCatalogPage) {
      renderCategoryPills(cats);
      applyFilters();

      const searchInput = document.getElementById("productSearchInput");
      if (searchInput) {
        searchInput.addEventListener("input", applyFilters);
      }
    }

    if (isHomePageFeatured) {
      const featured = prods.filter(p => p.is_featured).slice(0, 6);
      renderProductsGrid(featured, "featuredProductsGrid");
    }
  }

  if (isDetailsPage) {
    loadProductDetails();
  }
});

/**
 * Re-fetch products and update storefront components without full page reload
 */
async function refreshStorefrontProducts() {
  const prods = await fetchProducts();
  const isCatalogPage = document.getElementById("productsGrid");
  const isHomePageFeatured = document.getElementById("featuredProductsGrid");
  const isDetailsPage = document.getElementById("productDetailsContainer");

  if (isCatalogPage) {
    applyFilters();
  }
  if (isHomePageFeatured) {
    const featured = prods.filter(p => p.is_featured).slice(0, 6);
    renderProductsGrid(featured, "featuredProductsGrid");
  }
  if (isDetailsPage) {
    loadProductDetails();
  }
}

// Subscribe to real-time sync broadcast
if (typeof listenSync === "function") {
  listenSync((event) => {
    if (event.type === "products_updated") {
      refreshStorefrontProducts();
    }
  });
}

