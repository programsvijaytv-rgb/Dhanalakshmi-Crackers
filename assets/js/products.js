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
  const officialCats = typeof DEFAULT_CATEGORIES !== "undefined" ? DEFAULT_CATEGORIES : [];
  let mergedCats = [];

  const sb = getSupabase();
  if (isSupabaseConfigured() && sb) {
    try {
      const { data, error } = await sb
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        mergedCats = [...data];
      }
    } catch (e) {
      console.warn("Could not load categories from Supabase", e);
    }
  }

  // Load from local storage or fallback, and merge custom categories
  const storedCats = typeof getStoredCategories === "function" ? getStoredCategories() : officialCats;
  if (mergedCats.length === 0) {
    mergedCats = storedCats;
  } else {
    storedCats.forEach(sc => {
      if (!mergedCats.some(mc => String(mc.id) === String(sc.id) || mc.name.toLowerCase() === sc.name.toLowerCase())) {
        mergedCats.push(sc);
      }
    });
  }

  loadedCategories = mergedCats;
  return loadedCategories;
}

/**
 * Fetch Products from hybrid store (LocalStorage + Supabase)
 * Guarantees admin changes in Admin Panel immediately reflect on storefront without being overwritten
 */
async function fetchProducts(forceRefresh = false) {
  const deletedIds = typeof getDeletedProductIds === "function" ? getDeletedProductIds() : [];

  // 1. Reconcile with Supabase cloud products if available
  const sb = getSupabase();
  if (isSupabaseConfigured() && sb) {
    try {
      const { data, error } = await sb
        .from("products")
        .select("*, categories(name)")
        .eq("is_active", true)
        .order("is_featured", { ascending: false });

      if (!error && Array.isArray(data)) {
        // Map authoritative products from Supabase
        const remoteProducts = [];
        data.forEach(remote => {
          const rId = String(remote.id || "");
          const rSku = String(remote.sku || "").trim();

          // Filter out explicitly deleted products
          if (typeof isProductDeleted === "function") {
            if (isProductDeleted(rId, rSku)) return;
          } else if (deletedIds.some(d => String(d).toLowerCase() === rId.toLowerCase() || (rSku && String(d).toLowerCase() === rSku.toLowerCase()))) {
            return;
          }

          let catName = remote.categories?.name || remote.category_name || "";
          let catId = remote.category_id || null;

          if (catId && (!catName || catName === "Assorted")) {
            const matchCat = (loadedCategories && loadedCategories.find(c => String(c.id) === String(catId))) ||
                             (typeof DEFAULT_CATEGORIES !== "undefined" && DEFAULT_CATEGORIES.find(c => String(c.id) === String(catId)));
            if (matchCat) catName = matchCat.name;
          } else if (!catId && catName) {
            const matchCat = (loadedCategories && loadedCategories.find(c => c.name.toLowerCase() === catName.toLowerCase())) ||
                             (typeof DEFAULT_CATEGORIES !== "undefined" && DEFAULT_CATEGORIES.find(c => c.name.toLowerCase() === catName.toLowerCase()));
            if (matchCat) catId = matchCat.id;
          }
          if (!catName) catName = "Others";

          let hasVariants = Boolean(remote.has_variants);
          let variants = (remote.variants && Array.isArray(remote.variants)) ? remote.variants : [];
          if (typeof remote.variants === "string") {
            try { variants = JSON.parse(remote.variants); } catch (_) {}
          }
          if (!Array.isArray(variants)) variants = [];
          if (variants.length > 0) hasVariants = true;

          let videoUrl = remote.video_url || "";
          let cleanDescription = remote.description || "";

          // Extract embedded DC_META if present in description
          if (cleanDescription && cleanDescription.includes("<!--DC_META:")) {
            const metaMatch = cleanDescription.match(/<!--DC_META:([\s\S]*?)-->/);
            if (metaMatch && metaMatch[1]) {
              try {
                const parsedMeta = JSON.parse(metaMatch[1]);
                if (parsedMeta.has_variants) hasVariants = true;
                if (Array.isArray(parsedMeta.variants) && parsedMeta.variants.length > 0) {
                  variants = parsedMeta.variants;
                  hasVariants = true;
                }
                if (parsedMeta.video_url && !videoUrl) {
                  videoUrl = parsedMeta.video_url;
                }
              } catch (_) {}
            }
            cleanDescription = cleanDescription.replace(/<!--DC_META:[\s\S]*?-->/g, "").trim();
          }

          // Fallback to local storage product variants if remote didn't have any
          if (variants.length === 0) {
            const rawStored = localStorage.getItem("dc_custom_products");
            if (rawStored) {
              try {
                const parsedStored = JSON.parse(rawStored);
                if (Array.isArray(parsedStored)) {
                  const matchLocal = parsedStored.find(lp => String(lp.id) === String(remote.id) || (lp.sku && lp.sku === remote.sku));
                  if (matchLocal) {
                    let lv = matchLocal.variants;
                    if (typeof lv === "string") {
                      try { lv = JSON.parse(lv); } catch (_) {}
                    }
                    if (Array.isArray(lv) && lv.length > 0) {
                      variants = lv;
                      hasVariants = true;
                    }
                    if (matchLocal.video_url && !videoUrl) {
                      videoUrl = matchLocal.video_url;
                    }
                  }
                }
              } catch (_) {}
            }
          }

          // Fallback to DEFAULT_PRODUCTS if still empty
          if (variants.length === 0 && typeof DEFAULT_PRODUCTS !== "undefined") {
            const defMatch = DEFAULT_PRODUCTS.find(dp => String(dp.id) === String(remote.id) || (dp.sku && dp.sku === remote.sku));
            if (defMatch) {
              let dv = defMatch.variants;
              if (typeof dv === "string") {
                try { dv = JSON.parse(dv); } catch (_) {}
              }
              if (Array.isArray(dv) && dv.length > 0) {
                variants = dv;
                hasVariants = true;
              }
              if (defMatch.video_url && !videoUrl) {
                videoUrl = defMatch.video_url;
              }
            }
          }

          remoteProducts.push({
            id: remote.id,
            name: remote.name,
            sku: remote.sku,
            category_id: catId,
            category_name: catName,
            price: Number(remote.price),
            original_price: Number(remote.original_price || remote.price),
            stock_quantity: Number(remote.stock_quantity),
            min_stock_alert: Number(remote.min_stock_alert || 10),
            unit: remote.unit || "Box",
            description: cleanDescription,
            image_url: remote.image_url,
            is_featured: Boolean(remote.is_featured),
            is_active: remote.is_active !== false,
            video_url: videoUrl,
            has_variants: Boolean(hasVariants || variants.length > 0),
            variants: variants
          });
        });

        // Retain ONLY non-deleted genuine local drafts that haven't synced yet
        let localDrafts = [];
        try {
          const rawLocal = localStorage.getItem("dc_custom_products");
          if (rawLocal) {
            const parsed = JSON.parse(rawLocal);
            if (Array.isArray(parsed)) {
              const remoteIdSet = new Set(remoteProducts.map(p => String(p.id)));
              const remoteSkuSet = new Set(remoteProducts.filter(p => p.sku).map(p => String(p.sku).trim().toUpperCase()));
              localDrafts = parsed.filter(p => {
                if (!p || !p.name) return false;
                const pId = String(p.id || "");
                const pSku = String(p.sku || "").trim().toUpperCase();
                if (typeof isProductDeleted === "function" && isProductDeleted(pId, pSku)) return false;
                if (remoteIdSet.has(pId) || (pSku && remoteSkuSet.has(pSku))) return false;
                return Boolean(p.is_local_draft || p.created_offline);
              });
            }
          }
        } catch (_) {}

        const activeCatalog = [...remoteProducts, ...localDrafts];

        // Save authoritative catalog to local storage and update timestamp
        localStorage.setItem("dc_custom_products", JSON.stringify(activeCatalog));
        localStorage.setItem("dc_products_updated_at", Date.now().toString());

        // Validate shopping cart against authoritative catalog
        if (typeof syncCartWithCatalog === "function") {
          syncCartWithCatalog(activeCatalog);
        }

        loadedProducts = activeCatalog;
        return loadedProducts;
      }
    } catch (e) {
      console.warn("Could not sync remote products from Supabase, using local catalog", e);
    }
  }

  // Fallback: load local authoritative products (seeded with DEFAULT_PRODUCTS if empty)
  let localProducts = typeof getStoredCustomProducts === "function" 
    ? getStoredCustomProducts() 
    : JSON.parse(localStorage.getItem("dc_custom_products") || "[]");

  if (!localProducts || localProducts.length === 0) {
    localProducts = [...DEFAULT_PRODUCTS];
  }

  // Filter out products explicitly deleted
  localProducts = localProducts.filter(p => {
    if (!p) return false;
    if (typeof isProductDeleted === "function") {
      return !isProductDeleted(p.id, p.sku);
    }
    return !deletedIds.includes(p.id) && (!p.sku || !deletedIds.includes(p.sku));
  });

  // Ensure local products preserve accurate categories
  localProducts = localProducts.map(p => {
    if (!p.category_name && p.category_id) {
      const matchCat = (loadedCategories && loadedCategories.find(c => String(c.id) === String(p.category_id))) ||
                       (typeof DEFAULT_CATEGORIES !== "undefined" && DEFAULT_CATEGORIES.find(c => String(c.id) === String(p.category_id)));
      if (matchCat) p.category_name = matchCat.name;
    }
    return p;
  });

  localStorage.setItem("dc_custom_products", JSON.stringify(localProducts));
  loadedProducts = localProducts;

  if (typeof syncCartWithCatalog === "function") {
    syncCartWithCatalog(loadedProducts);
  }

  return loadedProducts;
}

/**
 * Render category filter pills on products page
 * Exactly 15 categories: 1. All + 14 Official Categories
 */
function renderCategoryPills(categories, targetElementId = "categoryFilterPills") {
  const container = document.getElementById(targetElementId);
  if (!container) return;

  container.innerHTML = `
    <button class="filter-chip ${activeCategory === 'all' ? 'active' : ''}" onclick="filterByCategory('all')">
      ✨ All
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
      if (categoryId === 'all' && (chip.textContent.includes("All") || chip.textContent.includes("✨"))) {
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

let activeSort = "featured";

/**
 * Handle user changing the sort-by dropdown or quick-sort chips
 */
function handleSortChange(sortValue) {
  activeSort = sortValue || "featured";

  const select = document.getElementById("catalogSortSelect");
  if (select && select.value !== activeSort) {
    select.value = activeSort;
  }

  document.querySelectorAll(".sort-chip-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.sort === activeSort);
  });

  applyFilters();
}

/**
 * Filter by search text and active category, then apply active sort
 */
function applyFilters() {
  const searchInput = document.getElementById("productSearchInput");
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

  let filtered = loadedProducts.filter(p => {
    const matchesCategory = (activeCategory === "all") || 
      (String(p.category_id) === String(activeCategory)) || 
      (p.category_name && p.category_name.toLowerCase() === String(activeCategory).toLowerCase());
    const matchesSearch = !query || 
      p.name.toLowerCase().includes(query) || 
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query)) ||
      (p.category_name && p.category_name.toLowerCase().includes(query));
    return matchesCategory && matchesSearch;
  });

  // Apply Sort Option Filters (Price Low-to-High, High-to-Low, Discount, Name, Featured)
  if (activeSort === "price-asc") {
    filtered.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (activeSort === "price-desc") {
    filtered.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (activeSort === "discount-desc") {
    filtered.sort((a, b) => {
      const origA = Number(a.original_price || a.price);
      const prcA = Number(a.price);
      const discA = origA > prcA ? (origA - prcA) / origA : 0;

      const origB = Number(b.original_price || b.price);
      const prcB = Number(b.price);
      const discB = origB > prcB ? (origB - prcB) / origB : 0;

      return discB - discA;
    });
  } else if (activeSort === "name-asc") {
    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } else if (activeSort === "name-desc") {
    filtered.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
  } else {
    // default "featured": featured items first, then in-stock
    filtered.sort((a, b) => {
      const featA = Boolean(a.is_featured);
      const featB = Boolean(b.is_featured);
      if (featB !== featA) return featB ? 1 : -1;
      return (Number(b.stock_quantity) > 0 ? 1 : 0) - (Number(a.stock_quantity) > 0 ? 1 : 0);
    });
  }

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
 * Clicking ANY place in product card (image, title, badges, text, price) shows the product details page
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
    const isVariable = Boolean(p.has_variants && Array.isArray(p.variants) && p.variants.length > 0);
    const original = Number(p.original_price || p.price);
    const current = Number(p.price);
    const discount = original > current ? Math.round(((original - current) / original) * 100) : null;
    const savings = original > current ? (original - current) : null;

    const card = document.createElement("div");
    card.className = "product-card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `View details for ${p.name}`);
    card.style.cursor = "pointer";

    // CLICK ANY PLACE IN PRODUCT SHOW THE PRODUCT PAGE LIKE IMAGE, TEXT
    card.onclick = (e) => {
      // Don't navigate if user clicked Add to Cart or Option button or quantity control
      if (e.target.closest('.btn-add-cart, button, input, select, .qty-control, .stop-propagation')) {
        return;
      }
      window.location.href = `product-details.html?id=${p.id}`;
    };

    card.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (!e.target.closest('.btn-add-cart, button, input, select, .qty-control')) {
          e.preventDefault();
          window.location.href = `product-details.html?id=${p.id}`;
        }
      }
    };

    card.innerHTML = `
      <div class="product-img-wrapper" title="Click anywhere to view details for ${p.name}">
        <img src="${p.image_url || 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600&auto=format&fit=crop&q=80'}" alt="${p.name}" class="product-img" loading="lazy">
        <div class="product-badges-corner">
          ${discount ? `<span class="product-badge-discount">🔥 ${discount}% OFF</span>` : ""}
          ${isVariable ? `<span class="product-badge-variable">⚡ ${p.variants.length} Options</span>` : `<span class="product-badge-green" title="Certified Green Cracker">🌿 Green</span>`}
        </div>
        <span class="product-badge-stock ${p.stock_quantity > 0 ? 'in-stock' : 'out-of-stock'}">
          ${p.stock_quantity > 0 ? '● In Stock' : 'Out of Stock'}
        </span>
      </div>
      <div class="product-content">
        <div class="product-top-row">
          <span class="product-category-label" title="${p.category_name || 'Crackers'}">${p.category_name || 'Crackers'}</span>
          ${p.sku ? `<span class="product-sku-tag" title="SKU: ${p.sku}">#${p.sku}</span>` : ''}
        </div>
        <h3 class="product-title">
          <a href="product-details.html?id=${p.id}" title="${p.name}">${p.name}</a>
        </h3>
        <p class="product-desc">${p.description || 'Genuine Sivakasi firecracker with superior safety testing.'}</p>
        <div class="product-footer">
          <div class="price-box">
            <div class="price-row">
              <span class="price-current">${isVariable ? `From ${formatCurrency(p.price)}` : formatCurrency(p.price)}</span>
              ${original > current ? `<span class="price-original">${formatCurrency(original)}</span>` : ""}
            </div>
            ${savings ? `<span class="price-savings-pill">Save ${formatCurrency(savings)}</span>` : ""}
          </div>
          ${isVariable ? `
            <a href="product-details.html?id=${p.id}" class="btn-add-cart" style="text-decoration:none;" aria-label="Choose options for ${p.name}">
              <span class="cart-btn-icon">⚡</span>
              <span class="cart-btn-text">Options</span>
            </a>
          ` : `
            <button class="btn-add-cart" onclick="quickAddProduct('${p.id}', this)" aria-label="Add ${p.name} to cart">
              <span class="cart-btn-icon">🛒</span>
              <span class="cart-btn-text">Add</span>
            </button>
          `}
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
 * Load and display single product details on product-details.html (supports variable options & video)
 */
async function loadProductDetails() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");
  if (!productId) return;

  await fetchProducts();
  const product = loadedProducts.find(p => String(p.id) === String(productId) || (p.sku && p.sku === productId));
  if (!product) {
    const el = document.getElementById("productDetailsContainer");
    if (el) {
      el.innerHTML = `
        <div class="product-not-found-card" style="text-align: center; padding: 4rem 1.5rem; background: #ffffff; border-radius: 16px; border: 1px dashed #cbd5e1; margin: 2rem auto; max-width: 600px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <div style="font-size: 3.5rem; margin-bottom: 0.75rem;">🎆</div>
          <h2 style="font-family: var(--font-heading); font-size: 1.5rem; color: #1e293b; margin-bottom: 0.5rem;">Product No Longer Available</h2>
          <p style="color: #64748b; font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.6;">
            This firecracker has been removed from our catalog or is temporarily unavailable. Browse our full Diwali collection for more authentic Sivakasi fireworks.
          </p>
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <a href="products.html" class="btn btn-primary">Browse All Fireworks ➔</a>
            <a href="index.html" class="btn btn-secondary">Return to Home</a>
          </div>
        </div>
      `;
    }
    const recContainer = document.getElementById("recommendedProductsGrid");
    if (recContainer) {
      recContainer.innerHTML = "";
    }
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
  const rawDesc = (product.description || "Authentic Sivakasi fireworks with superior safety certification.");
  if (descEl) descEl.textContent = rawDesc.replace(/<!--DC_META:[\s\S]*?-->/g, "").trim();
  if (imgEl && product.image_url) imgEl.src = product.image_url;

  let catName = product.category_name;
  if (!catName || catName === "Assorted" || catName === "Ground Chakkars") {
    const matchCat = (loadedCategories && loadedCategories.find(c => String(c.id) === String(product.category_id))) ||
                     (typeof DEFAULT_CATEGORIES !== "undefined" && DEFAULT_CATEGORIES.find(c => String(c.id) === String(product.category_id)));
    if (matchCat) catName = matchCat.name;
  }
  const catBadge = document.getElementById("detailCategoryBadge");
  if (catBadge) catBadge.textContent = catName || "Crackers";
  const breadcrumbCat = document.getElementById("breadcrumbCategory");
  if (breadcrumbCat) breadcrumbCat.textContent = catName || "Catalog";

  // Update Page Title dynamically
  document.title = `${product.name} | Dhanalakshmi Crackers Sivakasi`;

  // Variable Product Handling
  let variants = product.variants;
  if (typeof variants === "string") {
    try { variants = JSON.parse(variants); } catch (_) {}
  }
  if (!Array.isArray(variants)) variants = [];
  product.variants = variants;

  const isVariable = Boolean((product.has_variants || variants.length > 0) && variants.length > 0);
  const variantsGroup = document.getElementById("detailVariantsGroup");
  const pillsContainer = document.getElementById("detailVariantsPills");
  const variantBadge = document.getElementById("selectedVariantBadge");
  const addBtn = document.getElementById("detailAddToCartBtn");

  let activeVariant = isVariable ? product.variants[0] : null;

  function updateDisplayedVariant(v) {
    activeVariant = v;
    if (skuEl) skuEl.textContent = v.sku || product.sku || "N/A";
    if (priceEl) priceEl.textContent = formatCurrency(v.price);
    if (origPriceEl) origPriceEl.textContent = (v.original_price && v.original_price > v.price) ? formatCurrency(v.original_price) : "";
    if (unitEl) unitEl.textContent = v.unit || product.unit || "Box";
    if (variantBadge) variantBadge.textContent = v.name;

    if (stockEl) {
      if (v.stock_quantity > 0) {
        stockEl.textContent = `${v.stock_quantity} Available`;
        stockEl.className = "stock-status-pill in-stock";
      } else {
        stockEl.textContent = "Out of Stock";
        stockEl.className = "stock-status-pill out-of-stock";
      }
    }

    if (addBtn) {
      if (v.stock_quantity <= 0) {
        addBtn.disabled = true;
        addBtn.textContent = "Out of Stock";
        addBtn.style.opacity = "0.6";
        addBtn.style.cursor = "not-allowed";
      } else {
        addBtn.disabled = false;
        addBtn.textContent = "🛒 Add to Cart";
        addBtn.style.opacity = "1";
        addBtn.style.cursor = "pointer";
      }
    }
  }

  if (isVariable && variantsGroup && pillsContainer) {
    variantsGroup.classList.remove("d-none");
    variantsGroup.style.setProperty("display", "block", "important");
    pillsContainer.innerHTML = "";

    product.variants.forEach((v, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `variant-pill-btn ${idx === 0 ? 'active' : ''}`;
      btn.innerHTML = `
        <span class="pill-name">${v.name}</span>
        <span class="pill-price">${formatCurrency(v.price)}</span>
      `;
      btn.onclick = () => {
        pillsContainer.querySelectorAll(".variant-pill-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        updateDisplayedVariant(v);
      };
      pillsContainer.appendChild(btn);
    });

    updateDisplayedVariant(product.variants[0]);
  } else {
    if (variantsGroup) variantsGroup.style.display = "none";
    if (skuEl) skuEl.textContent = product.sku || "N/A";
    if (priceEl) priceEl.textContent = formatCurrency(product.price);
    if (origPriceEl) origPriceEl.textContent = (product.original_price && product.original_price > product.price) ? formatCurrency(product.original_price) : "";
    if (unitEl) unitEl.textContent = product.unit || "Box";

    if (stockEl) {
      if (product.stock_quantity > 0) {
        stockEl.textContent = `${product.stock_quantity} Available`;
        stockEl.className = "stock-status-pill in-stock";
      } else {
        stockEl.textContent = "Out of Stock";
        stockEl.className = "stock-status-pill out-of-stock";
      }
    }

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
      }
    }
  }

  // Setup Add to Cart button click handler
  if (addBtn) {
    addBtn.onclick = () => {
      if (addBtn.disabled) return;
      const qtyInput = document.getElementById("detailQtyInput");
      const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;
      addToCart(product, qty, activeVariant);
      animateAddButton(addBtn);
    };
  }

  // Video Demonstration / Instruction Guide Link (YouTube / Web)
  const videoCard = document.getElementById("detailVideoCard");
  const videoIframe = document.getElementById("detailVideoIframe");
  const videoExtLink = document.getElementById("detailVideoExternalLink");
  const videoEmbedContainer = document.getElementById("detailVideoEmbedContainer");
  const webInstrContainer = document.getElementById("detailWebInstructionContainer");
  const webInstrLink = document.getElementById("detailWebInstructionLink");

  // Helper to extract clean YouTube embed URL
  function getYouTubeEmbedUrl(url) {
    if (!url || typeof url !== "string") return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    try {
      const match = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i);
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}?rel=0`;
      }
      if (trimmed.includes("youtube.com/embed/")) {
        return trimmed;
      }
    } catch (_) {}
    return null;
  }

  const settings = typeof getStoredBusinessSettings === "function" ? getStoredBusinessSettings() : {};
  const rawVideoUrl = (product.video_url || settings.guide_video_url || "https://www.youtube.com/watch?v=kY7XlB8mS78").trim();

  if (videoCard && rawVideoUrl) {
    videoCard.classList.remove("d-none");
    videoCard.style.display = "block";

    if (videoExtLink) {
      videoExtLink.href = rawVideoUrl;
      videoExtLink.style.display = "inline-flex";
    }

    const embedUrl = getYouTubeEmbedUrl(rawVideoUrl);
    if (embedUrl && videoIframe && videoEmbedContainer) {
      videoIframe.src = embedUrl;
      videoEmbedContainer.style.display = "block";
      if (webInstrContainer) webInstrContainer.style.display = "none";
    } else if (videoEmbedContainer && webInstrContainer && webInstrLink) {
      // Non-YouTube Web Link / PDF / Instruction Guide
      videoEmbedContainer.style.display = "none";
      webInstrContainer.style.display = "block";
      webInstrLink.href = rawVideoUrl;
    }
  } else if (videoCard) {
    videoCard.style.display = "none";
  }

  // Render Recommended Products for Product Details Page
  renderRecommendedProducts(product);
}

/**
 * Render Recommended Products under the product details page
 * Selects 4 products from the same category, backfilling with top featured items
 */
function renderRecommendedProducts(currentProduct) {
  const container = document.getElementById("recommendedProductsGrid");
  if (!container || !loadedProducts || loadedProducts.length === 0 || !currentProduct) return;

  const currentId = String(currentProduct.id);
  const currentCatId = currentProduct.category_id;
  const currentCatName = (currentProduct.category_name || "").toLowerCase();

  // 1. Same category items first (excluding current product)
  let candidates = loadedProducts.filter(p => {
    if (String(p.id) === currentId) return false;
    if (currentCatId && p.category_id && String(p.category_id) === String(currentCatId)) return true;
    if (currentCatName && p.category_name && p.category_name.toLowerCase() === currentCatName) return true;
    return false;
  });

  // 2. If fewer than 4 candidates, backfill with top featured or affordable items
  if (candidates.length < 4) {
    const others = loadedProducts.filter(p => 
      String(p.id) !== currentId && !candidates.some(c => String(c.id) === String(p.id))
    );
    others.sort((a, b) => (Boolean(b.is_featured) ? 1 : 0) - (Boolean(a.is_featured) ? 1 : 0));
    candidates = candidates.concat(others);
  }

  // Display top 4 recommended items
  const recommended = candidates.slice(0, 4);
  renderProductsGrid(recommended, "recommendedProductsGrid");
}

let homeActiveTab = "featured";
let homeProductDisplayLimit = 12;

/**
 * Render home page products with tabs: Featured, Low-to-High, Under ₹100, Gift Hampers, High-to-Low
 */
function renderHomeProducts(tab = "featured", limit = null) {
  if (tab) homeActiveTab = tab;
  if (limit) homeProductDisplayLimit = limit;

  const container = document.getElementById("featuredProductsGrid");
  if (!container || !loadedProducts || loadedProducts.length === 0) return;

  // Update home tabs active state
  document.querySelectorAll(".home-product-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === homeActiveTab);
  });

  let prods = [...loadedProducts];

  if (homeActiveTab === "low-to-high") {
    // Low to high price
    prods.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (homeActiveTab === "under-100") {
    prods = prods.filter(p => Number(p.price) <= 100);
    prods.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (homeActiveTab === "gift-boxes") {
    prods = prods.filter(p => 
      (p.category_name && p.category_name.toLowerCase().includes("gift")) || 
      (p.name && p.name.toLowerCase().includes("box"))
    );
    // Sort Festival Gift Boxes low to high price
    prods.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (homeActiveTab === "high-to-low") {
    prods.sort((a, b) => Number(b.price) - Number(a.price));
  } else {
    // Featured first, then in-stock
    prods.sort((a, b) => (Boolean(b.is_featured) ? 1 : 0) - (Boolean(a.is_featured) ? 1 : 0));
  }

  const toShow = prods.slice(0, homeProductDisplayLimit);
  renderProductsGrid(toShow, "featuredProductsGrid");

  const loadMoreBtn = document.getElementById("homeLoadMoreBtn");
  if (loadMoreBtn) {
    if (prods.length > homeProductDisplayLimit) {
      loadMoreBtn.style.display = "inline-flex";
      loadMoreBtn.textContent = `➕ Show More Fireworks (${prods.length - homeProductDisplayLimit} more)`;
    } else {
      loadMoreBtn.style.display = "none";
    }
  }
}

function loadMoreHomeProducts() {
  homeProductDisplayLimit += 12;
  renderHomeProducts(homeActiveTab, homeProductDisplayLimit);
}

// Initializer for Product Listing & Details pages
document.addEventListener("DOMContentLoaded", async () => {
  const isCatalogPage = document.getElementById("productsGrid");
  const isDetailsPage = document.getElementById("productDetailsContainer");
  const isHomePageFeatured = document.getElementById("featuredProductsGrid");

  if (isCatalogPage || isHomePageFeatured) {
    const [cats, prods] = await Promise.all([fetchCategories(), fetchProducts()]);
    
    // Check if URL specified category parameter (e.g. ?category=gift-box, ?category=sparklers)
    const urlParams = new URLSearchParams(window.location.search);
    const catQuery = urlParams.get("category");
    if (catQuery) {
      const matchedCat = cats.find(c => 
        c.id === catQuery || 
        c.slug === catQuery || 
        (catQuery === "gift-boxes" && c.slug === "gift-box") ||
        c.name.toLowerCase().includes(catQuery.toLowerCase())
      );
      if (matchedCat) {
        activeCategory = matchedCat.id;
      }
    }

    // Check if URL specified sort parameter (e.g. ?sort=price-asc)
    const sortQuery = urlParams.get("sort");
    if (sortQuery) {
      activeSort = sortQuery;
      const select = document.getElementById("catalogSortSelect");
      if (select) select.value = sortQuery;
      document.querySelectorAll(".sort-chip-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.sort === sortQuery);
      });
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
      renderHomeProducts("featured", 12);
      initFestivalGiftBoxesSlider(prods);
    }
  }

  // Also check if gift box slider is on current page
  if (document.getElementById("giftBoxViewport")) {
    initFestivalGiftBoxesSlider();
  }

  // Initialize store guide videos under product areas
  initStoreGuideVideos();

  if (isDetailsPage) {
    loadProductDetails();
  }
});

/**
 * Render and control Festival Gift Boxes sliding carousel under banner
 */
function initFestivalGiftBoxesSlider(products) {
  const track = document.getElementById("giftBoxSliderTrack");
  const viewport = document.getElementById("giftBoxViewport");
  const prevBtn = document.getElementById("giftBoxPrevBtn");
  const nextBtn = document.getElementById("giftBoxNextBtn");
  if (!viewport) return;

  const prodsList = (products && products.length > 0) ? products : (loadedProducts && loadedProducts.length > 0 ? loadedProducts : (typeof DEFAULT_PRODUCTS !== 'undefined' ? DEFAULT_PRODUCTS : []));
  const giftProducts = prodsList.filter(p => {
    const cat = (p.category_name || "").toLowerCase();
    const name = (p.name || "").toLowerCase();
    return cat.includes("gift") || name.includes("gift box") || name.includes("hamper");
  });

  // Sort Festival Gift Boxes Collections from low to high price
  giftProducts.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));

  if (giftProducts.length > 0 && track) {
    track.innerHTML = "";
    giftProducts.forEach(prod => {
      const origPrice = Number(prod.original_price || prod.price * 2);
      const currPrice = Number(prod.price);
      const discount = origPrice > currPrice ? Math.round(((origPrice - currPrice) / origPrice) * 100) : 0;
      const itemMatch = prod.name.match(/\((\d+)\s*Items?\)/i);
      const itemsTag = itemMatch ? `🎁 ${itemMatch[1]} Items` : (prod.unit || "Gift Hamper");

      const card = document.createElement("div");
      card.className = "giftbox-slide-card";
      card.innerHTML = `
        <div class="giftbox-card-media" onclick="window.location.href='product-details.html?id=${prod.id}'" style="cursor:pointer;">
          <img src="${prod.image_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80'}" 
               alt="${prod.name}" 
               class="giftbox-card-img" 
               loading="lazy">
          <span class="giftbox-badge-festive">✨ Diwali Special</span>
          <span class="giftbox-items-pill">${itemsTag}</span>
        </div>
        <div class="giftbox-card-body">
          <h3 class="giftbox-card-title" title="${prod.name}">
            <a href="product-details.html?id=${prod.id}" style="color:inherit; text-decoration:none;">${prod.name}</a>
          </h3>
          <p class="giftbox-card-desc">${prod.description || 'Festive assortment of Sivakasi green crackers.'}</p>
          <div class="giftbox-pricing-box">
            <div class="giftbox-price-row">
              <span class="giftbox-price-current">${typeof formatCurrency === 'function' ? formatCurrency(currPrice) : '₹' + currPrice}</span>
              ${origPrice > currPrice ? `<span class="giftbox-price-orig">₹${origPrice}</span>` : ''}
              ${discount > 0 ? `<span class="giftbox-price-off">${discount}% OFF</span>` : ''}
            </div>
            <div class="giftbox-btn-group">
              <button type="button" class="giftbox-btn-cart" onclick="quickAddProduct('${prod.id}', this)" aria-label="Add ${prod.name} to cart">
                <span>🛒</span> Add to Cart
              </button>
              <a href="product-details.html?id=${prod.id}" class="giftbox-btn-view" title="View Box Details">
                Details
              </a>
            </div>
          </div>
        </div>
      `;
      track.appendChild(card);
    });
  }

  // Smooth slide navigation button handlers
  if (prevBtn && !prevBtn._bound) {
    prevBtn._bound = true;
    prevBtn.addEventListener("click", () => {
      viewport.scrollBy({ left: -310, behavior: "smooth" });
    });
  }
  if (nextBtn && !nextBtn._bound) {
    nextBtn._bound = true;
    nextBtn.addEventListener("click", () => {
      viewport.scrollBy({ left: 310, behavior: "smooth" });
    });
  }
}

/**
 * Initialize video guides placed under product areas across storefront
 */
async function initStoreGuideVideos() {
  const homeIframe = document.getElementById("homeGuideVideoIframe");
  const catalogIframe = document.getElementById("catalogGuideVideoIframe");
  if (!homeIframe && !catalogIframe) return;

  try {
    const settings = typeof getBusinessSettings === "function" ? await getBusinessSettings() : null;
    const rawUrl = settings?.guide_video_url || "https://www.youtube.com/watch?v=kY7XlB8mS78";
    let embedUrl = rawUrl;
    if (rawUrl.includes("watch?v=")) embedUrl = rawUrl.replace("watch?v=", "embed/");
    else if (rawUrl.includes("youtu.be/")) embedUrl = rawUrl.replace("youtu.be/", "www.youtube.com/embed/");
    if (!embedUrl.includes("rel=0")) embedUrl += (embedUrl.includes("?") ? "&rel=0" : "?rel=0");

    if (homeIframe && homeIframe.src !== embedUrl) homeIframe.src = embedUrl;
    if (catalogIframe && catalogIframe.src !== embedUrl) catalogIframe.src = embedUrl;
  } catch (e) {
    console.warn("Could not load custom guide video", e);
  }
}

/**
 * Re-fetch products and update storefront components without full page reload
 */
async function refreshStorefrontProducts(payload = null) {
  const isCatalogPage = document.getElementById("productsGrid");
  const isHomePageFeatured = document.getElementById("featuredProductsGrid");
  const isDetailsPage = document.getElementById("productDetailsContainer");

  // Instant in-memory cache eviction for 0-ms UI feedback
  if (payload && (payload.action === "delete" || payload.action === "bulk_delete")) {
    const delId = payload.id;
    const delSku = payload.sku;
    const delIds = new Set((payload.deletedIds || []).map(String));
    const delSkus = new Set((payload.deletedSkus || []).map(s => String(s).toUpperCase()));

    if (delId) delIds.add(String(delId));
    if (delSku) delSkus.add(String(delSku).toUpperCase());

    loadedProducts = loadedProducts.filter(p => {
      const pId = String(p.id || "");
      const pSku = String(p.sku || "").toUpperCase();
      if (delIds.has(pId)) return false;
      if (pSku && delSkus.has(pSku)) return false;
      return true;
    });

    if (isCatalogPage) applyFilters();
    if (isHomePageFeatured) renderHomeProducts(homeActiveTab, homeProductDisplayLimit);
    if (isDetailsPage) loadProductDetails();
  }

  // Authoritative re-fetch and re-render
  const prods = await fetchProducts(true);

  if (isCatalogPage) {
    applyFilters();
  }
  if (isHomePageFeatured) {
    renderHomeProducts(homeActiveTab, homeProductDisplayLimit);
  }
  if (isDetailsPage) {
    loadProductDetails();
  }
}

// Subscribe to real-time sync broadcast
if (typeof listenSync === "function") {
  listenSync((event) => {
    if (event.type === "products_updated") {
      refreshStorefrontProducts(event.payload);
    }
  });
}


