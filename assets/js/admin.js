// ==============================================================================
// Dhanalakshmi Crackers - Admin Control Panel Logic
// Dashboard, Products, Orders, Customers, Reports & Business Settings
// ==============================================================================

/**
 * Initialize Dashboard
 */
async function initAdminDashboard() {
  await protectAdminRoute();
  syncOrdersAndInvoices();
  await loadDashboardStats();

  if (typeof listenSync === "function") {
    listenSync(async (event) => {
      if (["order_created", "order_updated", "products_updated"].includes(event.type)) {
        syncOrdersAndInvoices();
        await loadDashboardStats();
        if (event.type === "order_created" && event.payload) {
          showToast(`🔔 New Online Order Received: #${event.payload.order_number}`, "success");
        }
      }
    });
  }
}

/**
 * Load Dashboard KPIs & Recent Transactions
 */
async function loadDashboardStats() {
  const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);
  const allInvoices = syncOrdersAndInvoices();
  const orders = JSON.parse(localStorage.getItem("dc_orders_list") || "[]");

  // Calculate Total Sales without double-counting (POS bills + paid Online orders)
  const posInvoices = allInvoices.filter(i => !i.order_id);
  const paidPosTotal = posInvoices.filter(i => (i.payment_status || "paid").toLowerCase() === "paid").reduce((sum, i) => sum + Number(i.total_amount || 0), 0);
  const paidOrdersTotal = orders.filter(o => (o.payment_status || "").toLowerCase() === "paid").reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const totalRevenue = paidPosTotal + paidOrdersTotal;

  // Low stock products count
  const lowStockProducts = products.filter(p => p.stock_quantity <= (p.min_stock_alert || 10));

  // Populate KPI cards
  const revEl = document.getElementById("kpiTotalSales");
  const ordEl = document.getElementById("kpiTotalOrders");
  const prodEl = document.getElementById("kpiTotalProducts");
  const stockEl = document.getElementById("kpiLowStock");

  if (revEl) revEl.textContent = formatCurrency(totalRevenue);
  if (ordEl) ordEl.textContent = (posInvoices.length + orders.length);
  if (prodEl) prodEl.textContent = products.length;
  if (stockEl) stockEl.textContent = lowStockProducts.length;

  // Render recent orders / invoices table
  renderRecentDashboardActivity(allInvoices, orders);
}

/**
 * Render recent sales on Dashboard
 */
function renderRecentDashboardActivity(invoices, orders) {
  const tbody = document.getElementById("dashboardRecentActivityTbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  const combined = [
    ...invoices.map(i => ({ type: "POS Invoice", ref: i.invoice_number, customer: i.customer_name, amount: i.total_amount, status: i.payment_status || "paid", payment_status: i.payment_status || "paid", date: i.created_at, raw: i })),
    ...orders.map(o => ({ type: "Online Order", ref: o.order_number, customer: o.customer_name, amount: o.total_amount, status: o.status || "pending", payment_status: o.payment_status || "unpaid", date: o.created_at, raw: o }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  if (combined.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: #9ca3af;">No recent transactions yet. Start POS billing or place an online order!</td></tr>`;
    return;
  }

  combined.forEach(item => {
    const tr = document.createElement("tr");
    const isPaid = (item.payment_status || "").toLowerCase() === "paid";
    tr.innerHTML = `
      <td><strong>${item.ref}</strong></td>
      <td><span class="badge ${item.type === 'POS Invoice' ? 'badge-info' : 'badge-warning'}">${item.type}</span></td>
      <td>${item.customer || 'Customer'}</td>
      <td><strong>${formatCurrency(item.amount)}</strong></td>
      <td>
        <span class="badge ${isPaid ? 'badge-success' : 'badge-danger'}" title="Payment Status">${(item.payment_status || 'unpaid').toUpperCase()}</span>
        ${item.type === 'Online Order' ? `<div style="font-size: 0.72rem; color: #6b7280; margin-top: 3px; font-weight: 600;">Order: ${item.status.toUpperCase()}</div>` : ''}
      </td>
      <td>${new Date(item.date).toLocaleDateString("en-IN")}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ==============================================================================
// PRODUCT MANAGEMENT (admin/products.html)
// ==============================================================================
let adminProductList = [];

async function initAdminProducts() {
  await protectAdminRoute();
  adminProductList = await fetchProducts();
  renderAdminProductsTable(adminProductList);
  checkCloudSyncStatus(false);

  const searchInput = document.getElementById("adminProductSearch");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = adminProductList.filter(p => 
        p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
      );
      renderAdminProductsTable(filtered);
    });
  }

  if (typeof listenSync === "function") {
    listenSync(async (event) => {
      if (event.type === "products_updated" && event.payload?.action !== "save" && event.payload?.action !== "delete") {
        adminProductList = await fetchProducts();
        renderAdminProductsTable(adminProductList);
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeProductModal();
  });
}

function renderAdminProductsTable(products) {
  const tbody = document.getElementById("adminProductsTbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (!products || products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2.5rem 1rem;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎆</div>
      <strong style="color: #475569; font-size: 1rem;">No firecrackers found.</strong>
      <p style="font-size: 0.82rem; color: #94a3b8; margin-top: 4px;">Click "+ Add Firecracker" or "📥 Import CSV" to populate your catalog.</p>
    </td></tr>`;
    return;
  }

  products.forEach(p => {
    const isVariable = Boolean(p.has_variants && Array.isArray(p.variants) && p.variants.length > 0);
    const tr = document.createElement("tr");
    tr.className = "admin-product-row";
    tr.innerHTML = `
      <td class="col-img" data-label="Image">
        <div class="admin-prod-thumb-wrap">
          <img src="${p.image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=60'}" alt="${p.name}" class="admin-prod-thumb" loading="lazy">
          ${p.video_url ? `<a href="${p.video_url}" target="_blank" rel="noopener" title="Watch Demo Video" class="admin-prod-video-badge">▶</a>` : ''}
        </div>
      </td>
      <td class="col-name" data-label="Product">
        <div class="admin-prod-title-line">
          <strong class="admin-prod-title">${p.name}</strong>
          ${isVariable ? `<span class="badge badge-info admin-variant-pill">⚡ ${p.variants.length} Variants</span>` : ''}
          ${p.is_featured ? `<span class="badge badge-warning admin-feat-pill">★ Featured</span>` : ''}
        </div>
        <div class="admin-prod-sub-meta">
          <span class="meta-cat-badge">${p.category_name || 'Crackers'}</span>
          ${p.sku ? `<span class="meta-sku-tag">#${p.sku}</span>` : ''}
          ${isVariable ? `<span class="meta-options">${p.variants.map(v => v.name).slice(0, 2).join(', ')}${p.variants.length > 2 ? '...' : ''}</span>` : `<span class="meta-unit">${p.unit || 'Box'}</span>`}
        </div>
      </td>
      <td class="col-sku" data-label="SKU">
        <code class="sku-badge">${p.sku || '-'}</code>
      </td>
      <td class="col-price" data-label="Price">
        <div class="admin-price-cell">
          <strong class="price-val">${isVariable ? `From ${formatCurrency(p.price)}` : formatCurrency(p.price)}</strong>
          ${(p.original_price && p.original_price > p.price) ? `<span class="price-mrp-strike">${formatCurrency(p.original_price)}</span>` : ''}
        </div>
      </td>
      <td class="col-stock" data-label="Stock">
        <span class="badge ${p.stock_quantity <= 10 ? 'badge-danger' : 'badge-success'} admin-stock-pill">
          ${p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : 'Out of Stock'}
        </span>
      </td>
      <td class="col-category" data-label="Category">
        <span class="admin-cat-text">${p.category_name || '-'}</span>
      </td>
      <td class="col-actions" data-label="Actions">
        <div class="action-btn-group">
          <button type="button" class="action-btn edit" onclick="openEditProductModal('${p.id}')" title="Edit Firecracker">✏️ Edit</button>
          <button type="button" class="action-btn delete" onclick="deleteProduct('${p.id}')" title="Delete Firecracker">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function populateCategoryDropdown(selectedCategoryId = "") {
  const select = document.getElementById("prodCategory");
  if (!select) return;

  const categories = await fetchCategories();
  select.innerHTML = '<option value="">-- Select Category --</option>';
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.name;
    if (selectedCategoryId && (String(cat.id) === String(selectedCategoryId) || cat.name.toLowerCase() === String(selectedCategoryId).toLowerCase())) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

/**
 * Switch product modal between Simple and Variable product layouts
 */
function toggleProductType(type) {
  const isVar = type === "variable";
  const simpleRadio = document.getElementById("typeSimple");
  const varRadio = document.getElementById("typeVariable");
  if (simpleRadio) simpleRadio.checked = !isVar;
  if (varRadio) varRadio.checked = isVar;

  const simpleFields = document.getElementById("simpleProductFields");
  const varFields = document.getElementById("variableProductFields");
  if (simpleFields) simpleFields.style.display = isVar ? "none" : "block";
  if (varFields) varFields.style.display = isVar ? "block" : "none";

  // Toggle required attribute on simple inputs
  const priceInput = document.getElementById("prodPrice");
  const stockInput = document.getElementById("prodStock");
  if (priceInput) priceInput.required = !isVar;
  if (stockInput) stockInput.required = !isVar;

  // If variable is chosen and table is empty, add default row
  if (isVar) {
    const tbody = document.getElementById("variantTableBody");
    if (tbody && tbody.children.length === 0) {
      addVariantRow();
    }
  }
}

/**
 * Add a new variant row to the manual variant builder
 */
function addVariantRow(variant = {}) {
  const tbody = document.getElementById("variantTableBody");
  if (!tbody) return;

  const tr = document.createElement("tr");
  tr.className = "variant-row";
  tr.innerHTML = `
    <td>
      <input type="text" class="var-name" placeholder="e.g. 10cm / 100 Wala" value="${variant.name || ''}" required>
    </td>
    <td>
      <input type="text" class="var-sku" placeholder="e.g. SPK-10" value="${variant.sku || ''}">
    </td>
    <td>
      <input type="number" step="0.5" class="var-price" placeholder="35.00" value="${variant.price !== undefined ? variant.price : ''}" required>
    </td>
    <td>
      <input type="number" step="0.5" class="var-mrp" placeholder="60.00" value="${variant.original_price !== undefined ? variant.original_price : ''}">
    </td>
    <td>
      <input type="number" class="var-stock" placeholder="100" value="${variant.stock_quantity !== undefined ? variant.stock_quantity : 100}" required>
    </td>
    <td>
      <input type="text" class="var-unit" placeholder="Box, Pcs" value="${variant.unit || 'Box'}">
    </td>
    <td style="text-align: center;">
      <button type="button" class="btn-remove-variant" onclick="removeVariantRow(this)" title="Remove Option">&times;</button>
    </td>
  `;
  tbody.appendChild(tr);
}

function removeVariantRow(btn) {
  const tr = btn.closest("tr");
  if (tr) tr.remove();
  const tbody = document.getElementById("variantTableBody");
  if (tbody && tbody.children.length === 0) {
    addVariantRow();
  }
}

/**
 * Apply 1-click fireworks preset variations into variant builder
 */
function applyVariantPreset(type) {
  const tbody = document.getElementById("variantTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const PRESETS = {
    sparklers: [
      { name: "10cm Electric (10 Pcs)", sku: "SPK-10", price: 35, original_price: 60, stock_quantity: 250, unit: "Box (10 Pcs)" },
      { name: "15cm Multi-Color (10 Pcs)", sku: "SPK-15", price: 85, original_price: 150, stock_quantity: 180, unit: "Box (10 Pcs)" },
      { name: "30cm Giant Gold (5 Pcs)", sku: "SPK-30", price: 130, original_price: 220, stock_quantity: 140, unit: "Box (5 Pcs)" },
      { name: "50cm Jumbo Mega (5 Pcs)", sku: "SPK-50", price: 210, original_price: 380, stock_quantity: 80, unit: "Box (5 Pcs)" }
    ],
    wala: [
      { name: "100 Wala Garland", sku: "WALA-100", price: 45, original_price: 90, stock_quantity: 200, unit: "Piece" },
      { name: "1000 Wala Festive Deluxe", sku: "WALA-1000", price: 320, original_price: 600, stock_quantity: 100, unit: "Piece" },
      { name: "5000 Wala Grand Garland", sku: "WALA-5000", price: 1450, original_price: 2800, stock_quantity: 40, unit: "Piece" },
      { name: "10000 Wala Royal Garland", sku: "WALA-10000", price: 2800, original_price: 5200, stock_quantity: 15, unit: "Piece" }
    ],
    shots: [
      { name: "12 Shots Sky Peony", sku: "SHT-12", price: 380, original_price: 750, stock_quantity: 90, unit: "Piece" },
      { name: "25 Shots Golden Palm", sku: "SHT-25", price: 750, original_price: 1400, stock_quantity: 50, unit: "Piece" },
      { name: "50 Shots Grand Peony", sku: "SHT-50", price: 1450, original_price: 2700, stock_quantity: 30, unit: "Piece" },
      { name: "120 Shots Royal Finale", sku: "SHT-120", price: 3200, original_price: 5900, stock_quantity: 15, unit: "Piece" }
    ],
    packs: [
      { name: "Single Box", sku: "PCK-1", price: 95, original_price: 180, stock_quantity: 150, unit: "Box" },
      { name: "Pack of 5 Boxes", sku: "PCK-5", price: 440, original_price: 900, stock_quantity: 40, unit: "Pack (5 Boxes)" },
      { name: "Pack of 10 Boxes", sku: "PCK-10", price: 820, original_price: 1800, stock_quantity: 20, unit: "Pack (10 Boxes)" },
      { name: "Master Case (50 Boxes)", sku: "PCK-CASE", price: 3800, original_price: 9000, stock_quantity: 8, unit: "Case (50 Boxes)" }
    ]
  };

  const selected = PRESETS[type] || [];
  selected.forEach(v => addVariantRow(v));
}

function openAddProductModal() {
  const form = document.getElementById("productForm");
  if (form) form.reset();
  const idField = document.getElementById("prodId");
  if (idField) idField.value = "";
  const title = document.getElementById("productModalTitle");
  if (title) title.textContent = "Add New Firecracker";

  populateCategoryDropdown();

  toggleProductType("simple");
  const varBody = document.getElementById("variantTableBody");
  if (varBody) varBody.innerHTML = "";

  const videoField = document.getElementById("prodVideoUrl");
  if (videoField) videoField.value = "";

  const featEl = document.getElementById("prodFeatured");
  if (featEl) featEl.checked = false;

  const modal = document.getElementById("productEditModal");
  if (modal) {
    modal.classList.remove("modal-hidden");
    modal.style.display = "flex";
    modal.onclick = (e) => {
      if (e.target === modal) closeProductModal();
    };
  }
}

function openAddProductModalWithVariable() {
  openAddProductModal();
  toggleProductType("variable");
}

function openEditProductModal(productId) {
  let product = adminProductList.find(p => String(p.id) === String(productId));
  if (!product) {
    const allProds = typeof getStoredCustomProducts === "function" ? getStoredCustomProducts() : [];
    product = allProds.find(p => String(p.id) === String(productId));
  }
  if (!product) {
    showToast("Product not found.", "error");
    return;
  }

  document.getElementById("prodId").value = product.id;
  document.getElementById("prodName").value = product.name;
  document.getElementById("prodSku").value = product.sku || "";
  document.getElementById("prodPrice").value = product.price;
  document.getElementById("prodOriginalPrice").value = product.original_price || "";
  document.getElementById("prodStock").value = product.stock_quantity;
  document.getElementById("prodUnit").value = product.unit || "Box";
  document.getElementById("prodImageUrl").value = product.image_url || "";
  document.getElementById("prodDesc").value = product.description || "";

  const videoEl = document.getElementById("prodVideoUrl");
  if (videoEl) videoEl.value = product.video_url || "";

  populateCategoryDropdown(product.category_id || product.category_name);

  const featEl = document.getElementById("prodFeatured");
  if (featEl) featEl.checked = Boolean(product.is_featured);

  // Check if variable product
  if (product.has_variants && Array.isArray(product.variants) && product.variants.length > 0) {
    toggleProductType("variable");
    const tbody = document.getElementById("variantTableBody");
    if (tbody) {
      tbody.innerHTML = "";
      product.variants.forEach(v => addVariantRow(v));
    }
  } else {
    toggleProductType("simple");
  }

  document.getElementById("productModalTitle").textContent = "Edit Firecracker";
  const modal = document.getElementById("productEditModal");
  if (modal) {
    modal.classList.remove("modal-hidden");
    modal.style.display = "flex";
    modal.onclick = (e) => {
      if (e.target === modal) closeProductModal();
    };
  }
}

function closeProductModal() {
  const modal = document.getElementById("productEditModal");
  if (modal) {
    modal.classList.add("modal-hidden");
    modal.style.display = "none";
  }
}

/**
 * Variable Product Manual Modal handlers
 */
function openVariableProductManualModal() {
  const modal = document.getElementById("variableProductManualModal");
  if (modal) {
    modal.style.display = "flex";
    modal.onclick = (e) => {
      if (e.target === modal) closeVariableProductManualModal();
    };
  }
}

function closeVariableProductManualModal() {
  const modal = document.getElementById("variableProductManualModal");
  if (modal) modal.style.display = "none";
}

/**
 * Instruction Video Modal handlers
 */
async function openInstructionVideoModal() {
  const modal = document.getElementById("instructionVideoModal");
  if (modal) {
    // Check if store settings have custom guide video url
    try {
      const settings = typeof fetchBusinessSettings === "function" ? await fetchBusinessSettings() : {};
      const customUrl = settings?.guide_video_url;
      if (customUrl) {
        let embed = customUrl;
        if (customUrl.includes("watch?v=")) embed = customUrl.replace("watch?v=", "embed/");
        else if (customUrl.includes("youtu.be/")) embed = customUrl.replace("youtu.be/", "www.youtube.com/embed/");
        const iframe = document.getElementById("adminVideoPlayerIframe");
        if (iframe) iframe.src = embed;
      }
    } catch (_) {}

    modal.style.display = "flex";
    modal.onclick = (e) => {
      if (e.target === modal) closeInstructionVideoModal();
    };
  }
}

function closeInstructionVideoModal() {
  const modal = document.getElementById("instructionVideoModal");
  if (modal) modal.style.display = "none";
}

async function checkCloudSyncStatus(showAlert = false) {
  const badge = document.getElementById("cloudSyncStatusBadge");
  const sb = (typeof getAdminSupabase === "function") ? getAdminSupabase() : getSupabase();

  if (!isSupabaseConfigured() || !sb) {
    if (badge) {
      badge.className = "table-header-sub badge badge-danger";
      badge.textContent = "☁️ Supabase: Not Configured";
    }
    if (showAlert) showToast("Supabase is not configured yet. Configure URL & Key in Store Settings.", "warning");
    return false;
  }

  try {
    const { data, error } = await sb.from("products").select("id").limit(1);
    if (error) {
      if (badge) {
        badge.className = "table-header-sub badge badge-danger";
        badge.textContent = "☁️ Online Read Error";
      }
      if (showAlert) showToast(`Cloud Read Error: ${error.message}`, "error");
      return false;
    }

    const testId = data && data[0] ? data[0].id : null;
    let writeAllowed = false;
    if (testId) {
      const { data: testWrite, error: writeErr } = await sb
        .from("products")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", testId)
        .select();

      if (!writeErr && testWrite && testWrite.length > 0) {
        writeAllowed = true;
      }
    }

    if (badge) {
      if (writeAllowed) {
        badge.className = "table-header-sub badge badge-success";
        badge.textContent = "☁️ Online Cloud Sync: Active (Live DB)";
      } else {
        badge.className = "table-header-sub badge badge-warning";
        badge.textContent = "☁️ Online Cloud Sync: Write Restricted";
      }
    }

    if (showAlert) {
      if (writeAllowed) {
        showToast("✅ Online Cloud Sync is ACTIVE! Product edits write directly to Supabase cloud.", "success");
      } else {
        showCloudSyncHelpModal("Supabase Row-Level Security requires Service Key or SQL permission for online writes.");
      }
    }
    return writeAllowed;
  } catch (err) {
    if (badge) {
      badge.className = "table-header-sub badge badge-danger";
      badge.textContent = "☁️ Cloud Check Error";
    }
    if (showAlert) showToast(`Cloud check error: ${err.message}`, "error");
    return false;
  }
}

function showCloudSyncHelpModal(reason = "") {
  let modal = document.getElementById("cloudSyncHelpModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "cloudSyncHelpModal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 580px;">
        <div class="modal-header">
          <h3 class="modal-title">☁️ Enable Direct Online Cloud Sync</h3>
          <button type="button" class="modal-close" onclick="document.getElementById('cloudSyncHelpModal').style.display='none'">&times;</button>
        </div>
        <div class="modal-body" style="font-size: 0.95rem; line-height: 1.6; color: #374151;">
          <p style="margin-bottom: 1rem;">
            Your product was <strong>saved locally</strong>, but writing directly to the online Supabase PostgreSQL database was restricted:
          </p>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 0.75rem 1rem; border-radius: 4px; font-family: monospace; font-size: 0.85rem; color: #991b1b; margin-bottom: 1.25rem;">
            ${reason || "Row Level Security (RLS) violation: database write requires authorization."}
          </div>
          <h4 style="font-size: 1rem; color: #111827; margin-bottom: 0.5rem;">Two Ways to Enable 100% Online Writes:</h4>
          <div style="background: #f9fafb; padding: 1rem; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 1rem;">
            <strong>Option 1 (Quickest): Enter Supabase Service Role Key</strong>
            <p style="margin: 0.25rem 0 0.5rem; font-size: 0.85rem; color: #6b7280;">
              Copy your secret <code>service_role</code> key from Supabase Dashboard (Settings → API) and paste it into Store Settings.
            </p>
            <a href="settings.html" class="btn btn-primary btn-sm" style="display: inline-block; text-decoration: none;">⚙️ Open Store Settings</a>
          </div>
          <div style="background: #f9fafb; padding: 1rem; border-radius: 8px; border: 1px solid #e5e7eb;">
            <strong>Option 2: Run 1-Click SQL in Supabase Dashboard</strong>
            <p style="margin: 0.25rem 0 0.5rem; font-size: 0.85rem; color: #6b7280;">
              In your Supabase Dashboard SQL Editor, run the script from <code>supabase/enable_online_product_updates.sql</code>.
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('cloudSyncHelpModal').style.display='none'">Got it</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    const reasonBox = modal.querySelector(".modal-body div");
    if (reasonBox) reasonBox.textContent = reason;
  }
  modal.style.display = "flex";
  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}

async function saveProductForm(e) {
  if (e && e.preventDefault) e.preventDefault();
  let id = document.getElementById("prodId").value.trim();
  const name = document.getElementById("prodName").value.trim();
  const prodType = document.querySelector('input[name="prodType"]:checked')?.value || "simple";
  const isVariable = prodType === "variable";

  let sku = document.getElementById("prodSku")?.value.trim() || "";
  let price = Number(document.getElementById("prodPrice")?.value) || 0;
  let original_price = Number(document.getElementById("prodOriginalPrice")?.value) || price;
  let stock = parseInt(document.getElementById("prodStock")?.value, 10) || 0;
  let unit = document.getElementById("prodUnit")?.value.trim() || "Box";
  const image_url = document.getElementById("prodImageUrl")?.value.trim();
  const video_url = document.getElementById("prodVideoUrl")?.value.trim();
  const desc = document.getElementById("prodDesc")?.value.trim();

  let variants = [];

  if (isVariable) {
    const rows = document.querySelectorAll("#variantTableBody tr.variant-row");
    rows.forEach((row, idx) => {
      const vName = row.querySelector(".var-name")?.value.trim();
      const vSku = row.querySelector(".var-sku")?.value.trim() || (sku ? `${sku}-V${idx + 1}` : `VAR-${idx + 1}`);
      const vPrice = Number(row.querySelector(".var-price")?.value);
      const vMrp = Number(row.querySelector(".var-mrp")?.value) || vPrice;
      const vStock = parseInt(row.querySelector(".var-stock")?.value, 10) || 0;
      const vUnit = row.querySelector(".var-unit")?.value.trim() || unit;

      if (vName && !isNaN(vPrice) && vPrice >= 0) {
        variants.push({
          id: `var-${Date.now()}-${idx}`,
          name: vName,
          sku: vSku,
          price: vPrice,
          original_price: vMrp,
          stock_quantity: vStock,
          unit: vUnit
        });
      }
    });

    if (variants.length === 0) {
      showToast("Please add at least one valid variant with name and price.", "warning");
      return;
    }

    // Compute base values from variants
    price = Math.min(...variants.map(v => v.price));
    original_price = Math.min(...variants.map(v => v.original_price || v.price));
    stock = variants.reduce((sum, v) => sum + v.stock_quantity, 0);
    if (!sku) sku = variants[0]?.sku || `VAR-${Date.now().toString(36).toUpperCase()}`;
    if (!unit) unit = variants[0]?.unit || "Box";
  }

  const catSelect = document.getElementById("prodCategory");
  let category_id = catSelect ? catSelect.value : "";
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const category_name = (catSelect && catSelect.selectedOptions && catSelect.selectedOptions[0] && catSelect.value)
    ? catSelect.selectedOptions[0].text
    : "Assorted";

  // Validate or resolve category UUID
  if (category_id && !uuidRegex.test(category_id)) {
    const match = typeof DEFAULT_CATEGORIES !== "undefined" ? DEFAULT_CATEGORIES.find(c => c.name.toLowerCase() === category_name.toLowerCase()) : null;
    category_id = match ? match.id : null;
  } else if (!category_id) {
    category_id = null;
  }

  const featEl = document.getElementById("prodFeatured");
  const is_featured = featEl ? featEl.checked : false;

  // Ensure id is a valid UUID
  if (!id || !uuidRegex.test(id)) {
    id = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : ("c1000000-0000-0000-0000-" + Date.now().toString(16).padStart(12, "0"));
  }

  // Local object with category_name and variants for frontend display
  const productData = {
    id,
    name,
    sku,
    price,
    original_price,
    stock_quantity: stock,
    unit,
    category_id,
    category_name,
    is_featured,
    image_url: image_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600",
    video_url: video_url || "",
    description: desc,
    has_variants: isVariable,
    variants: isVariable ? variants : [],
    is_active: true
  };

  // Cloud PostgreSQL database payload strictly matching public.products columns
  const dbPayload = {
    id,
    name,
    sku,
    price,
    original_price,
    stock_quantity: stock,
    unit,
    category_id: category_id || null,
    is_featured,
    image_url: image_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600",
    description: desc,
    is_active: true,
    updated_at: new Date().toISOString()
  };

  let onlineSaved = false;
  let onlineError = null;

  const sb = (typeof getAdminSupabase === "function") ? getAdminSupabase() : getSupabase();
  if (isSupabaseConfigured() && sb) {
    try {
      // 1. Try atomic RPC if available
      let rpcExecuted = false;
      try {
        const { data: rpcData, error: rpcErr } = await sb.rpc("upsert_product_online", {
          p_id: id,
          p_name: name,
          p_sku: sku,
          p_price: price,
          p_original_price: original_price,
          p_stock_quantity: stock,
          p_unit: unit,
          p_image_url: dbPayload.image_url,
          p_description: desc,
          p_category_id: category_id || null,
          p_is_featured: is_featured,
          p_is_active: true
        });
        if (!rpcErr && rpcData) {
          rpcExecuted = true;
          onlineSaved = true;
          if (rpcData.id) id = rpcData.id;
        }
      } catch (_) {
        // RPC not configured, proceed to direct REST
      }

      // 2. Direct Supabase REST call
      if (!rpcExecuted) {
        const { data: existing } = await sb.from("products").select("id").eq("id", id).maybeSingle();
        if (existing) {
          const { data: updatedRows, error: updateErr } = await sb
            .from("products")
            .update(dbPayload)
            .eq("id", id)
            .select();

          if (updateErr) {
            onlineError = updateErr.message;
          } else if (updatedRows && updatedRows.length > 0) {
            onlineSaved = true;
          } else {
            onlineError = "Row Level Security (RLS) policy prevented update (0 rows changed).";
          }
        } else {
          const { data: insertedRows, error: insertErr } = await sb
            .from("products")
            .insert(dbPayload)
            .select();

          if (insertErr) {
            onlineError = insertErr.message;
          } else if (insertedRows && insertedRows.length > 0) {
            onlineSaved = true;
            if (insertedRows[0].id) {
              id = insertedRows[0].id;
              productData.id = insertedRows[0].id;
            }
          } else {
            onlineError = "Row Level Security (RLS) policy prevented insertion.";
          }
        }
      }
    } catch (err) {
      onlineError = err.message || String(err);
      console.warn("Supabase product save error:", err);
    }
  }

  // Update local authoritative list
  const idx = adminProductList.findIndex(p => String(p.id) === String(id) || (p.sku && p.sku === sku));
  if (idx !== -1) {
    adminProductList[idx] = { ...adminProductList[idx], ...productData };
  } else {
    adminProductList.unshift(productData);
  }

  // Remove from deleted list if previously marked
  const deletedIds = typeof getDeletedProductIds === "function" ? getDeletedProductIds() : JSON.parse(localStorage.getItem("dc_deleted_product_ids") || "[]");
  const updatedDeletedIds = deletedIds.filter(did => String(did) !== String(id));
  localStorage.setItem("dc_deleted_product_ids", JSON.stringify(updatedDeletedIds));

  localStorage.setItem("dc_custom_products", JSON.stringify(adminProductList));
  localStorage.setItem("dc_products_updated_at", Date.now().toString());

  // Broadcast real-time sync event to storefront website
  if (typeof broadcastSync === "function") {
    broadcastSync("products_updated", { id, action: "save", product: productData });
  }

  renderAdminProductsTable(adminProductList);
  closeProductModal();

  if (onlineSaved) {
    showToast("🎉 Product updated ONLINE in Supabase cloud! Storefront is live.", "success");
    const badge = document.getElementById("cloudSyncStatusBadge");
    if (badge) {
      badge.className = "table-header-sub badge badge-success";
      badge.textContent = "☁️ Online Cloud Sync: Active (Live DB)";
    }
  } else if (onlineError) {
    showToast("⚠️ Saved locally, but online cloud write was blocked.", "warning", 6000);
    showCloudSyncHelpModal(onlineError);
  } else {
    showToast("Product saved successfully!", "success");
  }
}

async function deleteProduct(productId) {
  if (!confirm("Are you sure you want to remove this product? It will be removed from the online store.")) return;

  const sb = (typeof getAdminSupabase === "function") ? getAdminSupabase() : getSupabase();
  let onlineDeleted = false;
  if (isSupabaseConfigured() && sb) {
    try {
      const { error } = await sb.from("products").delete().eq("id", productId);
      if (!error) onlineDeleted = true;
    } catch (e) {
      console.warn("Supabase delete error:", e);
    }
  }

  adminProductList = adminProductList.filter(p => p.id !== productId);
  localStorage.setItem("dc_custom_products", JSON.stringify(adminProductList));
  localStorage.setItem("dc_products_updated_at", Date.now().toString());

  // Mark in deleted list
  const deletedIds = typeof getDeletedProductIds === "function" ? getDeletedProductIds() : JSON.parse(localStorage.getItem("dc_deleted_product_ids") || "[]");
  if (!deletedIds.includes(productId)) {
    deletedIds.push(productId);
    localStorage.setItem("dc_deleted_product_ids", JSON.stringify(deletedIds));
  }

  // Broadcast real-time sync event to storefront website
  if (typeof broadcastSync === "function") {
    broadcastSync("products_updated", { id: productId, action: "delete" });
  }

  renderAdminProductsTable(adminProductList);
  if (onlineDeleted) {
    showToast("Product removed online from Supabase cloud & storefront.", "success");
  } else {
    showToast("Product removed locally.", "info");
  }
}

// ==============================================================================
// ORDERS MANAGEMENT (admin/orders.html)
// ==============================================================================
let adminOrdersList = [];

async function initAdminOrders() {
  await protectAdminRoute();
  adminOrdersList = JSON.parse(localStorage.getItem("dc_orders_list") || "[]");

  // Fetch fresh orders from Supabase if configured
  const sb = getSupabase();
  if (isSupabaseConfigured() && sb) {
    try {
      const { data, error } = await sb.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        const mappedOrders = data.map(o => ({
          id: o.id,
          order_number: o.order_number,
          customer_name: o.customer_name,
          customer_phone: o.customer_phone,
          customer_email: o.customer_email,
          customer_address: o.customer_address,
          total_amount: Number(o.total_amount),
          subtotal: Number(o.subtotal || o.total_amount),
          discount: Number(o.discount || 0),
          tax_amount: Number(o.tax_amount || 0),
          status: o.status || "pending",
          payment_status: o.payment_status || "unpaid",
          payment_method: o.payment_method || "COD",
          created_at: o.created_at,
          items: (o.order_items || []).map(it => ({
            product_name: it.product_name,
            sku: it.sku,
            unit_price: Number(it.unit_price),
            quantity: Number(it.quantity),
            subtotal: Number(it.subtotal)
          }))
        }));

        const existingNums = new Set(mappedOrders.map(m => m.order_number));
        const localOnly = adminOrdersList.filter(o => !existingNums.has(o.order_number));
        adminOrdersList = [...mappedOrders, ...localOnly];
        localStorage.setItem("dc_orders_list", JSON.stringify(adminOrdersList));
      }
    } catch (err) {
      console.warn("Could not sync orders from Supabase:", err);
    }
  }

  updateOrderSummaryStats();
  renderAdminOrdersTable(adminOrdersList);

  const statusFilter = document.getElementById("orderStatusFilter");
  const paymentFilter = document.getElementById("orderPaymentStatusFilter");
  const searchInput = document.getElementById("orderSearchInput");

  if (statusFilter) statusFilter.addEventListener("change", applyOrderFilters);
  if (paymentFilter) paymentFilter.addEventListener("change", applyOrderFilters);
  if (searchInput) searchInput.addEventListener("input", applyOrderFilters);

  if (typeof listenSync === "function") {
    listenSync(async (event) => {
      if (event.type === "order_created" || event.type === "order_updated") {
        adminOrdersList = JSON.parse(localStorage.getItem("dc_orders_list") || "[]");
        updateOrderSummaryStats();
        applyOrderFilters();
        if (event.type === "order_created" && event.payload) {
          showToast(`🔔 New Online Order: #${event.payload.order_number} (${formatCurrency(event.payload.total_amount)})`, "success");
        }
      }
    });
  }
}

function updateOrderSummaryStats() {
  const volEl = document.getElementById("orderTotalVolume");
  const countEl = document.getElementById("orderTotalCount");
  const pendEl = document.getElementById("orderPendingCount");
  const delivEl = document.getElementById("orderDeliveredCount");

  const totalVol = adminOrdersList.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const totalCount = adminOrdersList.length;
  const pendingCount = adminOrdersList.filter(o => (o.status || 'pending').toLowerCase() === 'pending').length;
  const confirmedCount = adminOrdersList.filter(o => (o.status || '').toLowerCase() === 'confirmed').length;
  const dispatchedCount = adminOrdersList.filter(o => (o.status || '').toLowerCase() === 'dispatched').length;
  const deliveredCount = adminOrdersList.filter(o => (o.status || '').toLowerCase() === 'delivered').length;
  const cancelledCount = adminOrdersList.filter(o => (o.status || '').toLowerCase() === 'cancelled').length;

  if (volEl) volEl.textContent = formatCurrency(totalVol);
  if (countEl) countEl.textContent = totalCount;
  if (pendEl) pendEl.textContent = pendingCount;
  if (delivEl) delivEl.textContent = deliveredCount;

  // Update status pill badges
  const pillAll = document.getElementById("pillCountAll");
  const pillPend = document.getElementById("pillCountPending");
  const pillConf = document.getElementById("pillCountConfirmed");
  const pillDisp = document.getElementById("pillCountDispatched");
  const pillDeliv = document.getElementById("pillCountDelivered");
  const pillCanc = document.getElementById("pillCountCancelled");

  if (pillAll) pillAll.textContent = totalCount;
  if (pillPend) pillPend.textContent = pendingCount;
  if (pillConf) pillConf.textContent = confirmedCount;
  if (pillDisp) pillDisp.textContent = dispatchedCount;
  if (pillDeliv) pillDeliv.textContent = deliveredCount;
  if (pillCanc) pillCanc.textContent = cancelledCount;
}

function setOrderStatusPill(status) {
  const pills = document.querySelectorAll(".order-pill-btn");
  pills.forEach(p => {
    if (p.getAttribute("data-status") === status) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });

  const select = document.getElementById("orderStatusFilter");
  if (select) {
    select.value = status;
  }
  applyOrderFilters();
}
window.setOrderStatusPill = setOrderStatusPill;

function applyOrderFilters() {
  const statusFilter = document.getElementById("orderStatusFilter");
  const paymentFilter = document.getElementById("orderPaymentStatusFilter");
  const searchInput = document.getElementById("orderSearchInput");

  const sVal = statusFilter ? statusFilter.value : "all";
  const pVal = paymentFilter ? paymentFilter.value : "all";
  const qVal = searchInput ? searchInput.value.toLowerCase().trim() : "";

  let filtered = adminOrdersList;

  if (sVal !== "all") {
    filtered = filtered.filter(o => (o.status || "pending").toLowerCase() === sVal.toLowerCase());
  }

  if (pVal !== "all") {
    filtered = filtered.filter(o => (o.payment_status || "unpaid").toLowerCase() === pVal.toLowerCase());
  }

  if (qVal) {
    filtered = filtered.filter(o => 
      (o.order_number && o.order_number.toLowerCase().includes(qVal)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(qVal)) ||
      (o.customer_phone && o.customer_phone.includes(qVal))
    );
  }

  renderAdminOrdersTable(filtered);
}

function renderAdminOrdersTable(orders) {
  const tbody = document.getElementById("adminOrdersTbody");
  const mList = document.getElementById("adminOrdersMobileList");

  if (tbody) {
    tbody.innerHTML = "";
    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #9ca3af; padding: 2.5rem; font-size: 0.95rem;">No orders matching current filter or search.</td></tr>`;
    } else {
      orders.forEach(o => {
        const payStatus = (o.payment_status || "unpaid").toLowerCase();
        const ordStatus = (o.status || "pending").toLowerCase();

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${o.order_number}</strong></td>
          <td>
            <strong>${o.customer_name || 'Customer'}</strong>
            <div style="font-size: 0.75rem; color: #6b7280;">${o.customer_phone || '-'}</div>
          </td>
          <td><strong>${formatCurrency(o.total_amount)}</strong></td>
          <td><span class="badge badge-info">${o.payment_method || 'COD'}</span></td>
          <td>
            <select class="status-select status-select-${payStatus}" onchange="updateOrderPaymentStatus('${o.order_number}', this.value); updateOrderSummaryStats();" title="Change Payment Status">
              <option value="paid" ${payStatus === 'paid' ? 'selected' : ''}>✅ Paid</option>
              <option value="unpaid" ${payStatus === 'unpaid' ? 'selected' : ''}>❌ Unpaid</option>
              <option value="pending" ${payStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
              <option value="refunded" ${payStatus === 'refunded' ? 'selected' : ''}>↩️ Refunded</option>
            </select>
          </td>
          <td>
            <select class="status-select status-select-${ordStatus}" onchange="updateOrderStatus('${o.order_number}', this.value); updateOrderSummaryStats();" title="Change Order Status">
              <option value="pending" ${ordStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
              <option value="confirmed" ${ordStatus === 'confirmed' ? 'selected' : ''}>📋 Confirmed</option>
              <option value="dispatched" ${ordStatus === 'dispatched' ? 'selected' : ''}>🚚 Dispatched</option>
              <option value="delivered" ${ordStatus === 'delivered' ? 'selected' : ''}>🎉 Delivered</option>
              <option value="cancelled" ${ordStatus === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
            </select>
          </td>
          <td>${new Date(o.created_at || Date.now()).toLocaleDateString("en-IN")}</td>
          <td>
            <div class="action-btn-group">
              <a href="/invoice.html?invoice=${o.order_number}&download=true" target="_blank" class="action-btn" style="color: #059669;" title="Download PDF Invoice">📥 PDF</a>
              <button class="action-btn" onclick="printOrderInvoice('${o.order_number}')" title="Print Invoice (A4 / 80mm / 58mm)">🖨️ Print</button>
              <button class="action-btn" onclick="openOrderDetailsModal('${o.order_number}')" title="View Order Details">👁️ Details</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // Render Rich Mobile Order Cards for phones/tablets
  if (mList) {
    mList.innerHTML = "";
    if (orders.length === 0) {
      mList.innerHTML = `<div style="text-align: center; color: #9ca3af; padding: 2rem; background: #fff; border-radius: 8px; border: 1px dashed #d1d5db;">No orders matching current filter or search.</div>`;
    } else {
      orders.forEach(o => {
        const payStatus = (o.payment_status || "unpaid").toLowerCase();
        const ordStatus = (o.status || "pending").toLowerCase();
        const itemsCount = (o.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
        const itemNames = (o.items || []).map(it => `${it.quantity}x ${it.product_name}`).join(', ');
        const itemSummary = itemNames ? `${itemsCount} item${itemsCount === 1 ? '' : 's'} (${itemNames})` : (o.items && o.items.length > 0 ? `${itemsCount} items` : 'Festival Crackers Pack');

        const card = document.createElement("div");
        card.className = "mobile-order-card";
        card.innerHTML = `
          <div class="moc-header">
            <div class="moc-id-date">
              <span class="moc-id">#${o.order_number}</span>
              <span class="moc-date">${new Date(o.created_at || Date.now()).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}</span>
            </div>
            <div class="moc-status-wrap">
              <select class="status-select status-select-${ordStatus}" onchange="updateOrderStatus('${o.order_number}', this.value); updateOrderSummaryStats();" title="Change Order Status">
                <option value="pending" ${ordStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                <option value="confirmed" ${ordStatus === 'confirmed' ? 'selected' : ''}>📋 Confirmed</option>
                <option value="dispatched" ${ordStatus === 'dispatched' ? 'selected' : ''}>🚚 Dispatched</option>
                <option value="delivered" ${ordStatus === 'delivered' ? 'selected' : ''}>🎉 Delivered</option>
                <option value="cancelled" ${ordStatus === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
              </select>
            </div>
          </div>

          <div class="moc-body">
            <div class="moc-customer-row">
              <div class="moc-customer-info">
                <div class="moc-customer-name">👤 ${o.customer_name || 'Customer'}</div>
                <div class="moc-customer-phone">📞 ${o.customer_phone || 'No phone'}</div>
              </div>
              ${o.customer_phone ? `
                <div class="moc-quick-comms">
                  <a href="tel:${o.customer_phone}" class="moc-comm-btn call" title="Call Customer">📞</a>
                  <button type="button" class="moc-comm-btn wa" onclick="sendOrderCustomerWhatsApp('${o.order_number}')" title="Send WhatsApp Message">💬</button>
                </div>
              ` : ''}
            </div>

            <div class="moc-details-row">
              <div class="moc-amount-block">
                <span class="moc-amount-label">Grand Total</span>
                <span class="moc-amount-val">${formatCurrency(o.total_amount)}</span>
              </div>
              <div class="moc-payment-block">
                <span class="badge badge-info">${o.payment_method || 'COD'}</span>
                <select class="status-select status-select-${payStatus}" onchange="updateOrderPaymentStatus('${o.order_number}', this.value); updateOrderSummaryStats();" title="Change Payment Status">
                  <option value="paid" ${payStatus === 'paid' ? 'selected' : ''}>✅ Paid</option>
                  <option value="unpaid" ${payStatus === 'unpaid' ? 'selected' : ''}>❌ Unpaid</option>
                  <option value="pending" ${payStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                  <option value="refunded" ${payStatus === 'refunded' ? 'selected' : ''}>↩️ Refunded</option>
                </select>
              </div>
            </div>

            <div class="moc-items-preview">
              <span>📦</span>
              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${itemSummary}</span>
            </div>
          </div>

          <div class="moc-footer-actions">
            <button type="button" class="btn btn-secondary btn-sm moc-act-btn" onclick="openOrderDetailsModal('${o.order_number}')">
              👁️ Details
            </button>
            <button type="button" class="btn btn-secondary btn-sm moc-act-btn" onclick="printOrderInvoice('${o.order_number}')">
              🖨️ Print
            </button>
            <a href="/invoice.html?invoice=${o.order_number}&download=true" target="_blank" class="btn btn-primary btn-sm moc-act-btn" style="background: #059669; border-color: #059669; color: #fff;">
              📥 PDF
            </a>
          </div>
        `;
        mList.appendChild(card);
      });
    }
  }
}

// ==============================================================================
// CROSS-SYNCHRONIZATION HELPER: Orders <-> Invoices Archive
// ==============================================================================
function syncOrdersAndInvoices() {
  const orders = JSON.parse(localStorage.getItem("dc_orders_list") || "[]");
  const invoices = JSON.parse(localStorage.getItem("dc_invoices_history") || "[]");

  let modified = false;

  orders.forEach(ord => {
    let inv = invoices.find(i => i.invoice_number === ord.order_number || i.order_id === ord.order_number || (ord.id && i.order_id === ord.id));
    if (inv) {
      // Sync from order to invoice
      if (inv.payment_status !== ord.payment_status || inv.order_status !== ord.status || inv.status !== ord.status) {
        inv.payment_status = ord.payment_status || inv.payment_status || "unpaid";
        inv.order_status = ord.status || inv.order_status || "pending";
        inv.status = ord.status || inv.status || "pending";
        inv.source = "Online Order";
        modified = true;
      }
    } else {
      // Add missing invoice for this order
      invoices.unshift({
        invoice_number: ord.order_number,
        order_id: ord.id || ord.order_number,
        source: "Online Order",
        customer_name: ord.customer_name || "Online Customer",
        customer_phone: ord.customer_phone || "",
        customer_address: ord.customer_address || "",
        subtotal: Number(ord.subtotal || ord.total_amount || 0),
        discount_amount: Number(ord.discount || 0),
        tax_rate: 18,
        tax_amount: Number(ord.tax_amount || 0),
        total_amount: Number(ord.total_amount || 0),
        payment_method: ord.payment_method || "COD",
        payment_status: ord.payment_status || "unpaid",
        order_status: ord.status || "pending",
        status: ord.status || "pending",
        created_at: ord.created_at || new Date().toISOString(),
        items: ord.items || []
      });
      modified = true;
    }
  });

  // Ensure all POS bills have proper source tag
  invoices.forEach(inv => {
    if (!inv.source) {
      inv.source = inv.order_id ? "Online Order" : "POS Billing";
      modified = true;
    }
  });

  if (modified) {
    localStorage.setItem("dc_invoices_history", JSON.stringify(invoices));
  }

  return invoices;
}

async function updateOrderStatus(orderNumber, newStatus) {
  const order = adminOrdersList.find(o => o.order_number === orderNumber);
  if (order) {
    order.status = newStatus;
    localStorage.setItem("dc_orders_list", JSON.stringify(adminOrdersList));

    // Immediately update or create in invoices archive
    const invoices = JSON.parse(localStorage.getItem("dc_invoices_history") || "[]");
    let inv = invoices.find(i => i.invoice_number === orderNumber || i.order_id === orderNumber);
    if (!inv) {
      inv = {
        invoice_number: order.order_number,
        order_id: order.id || order.order_number,
        source: "Online Order",
        customer_name: order.customer_name || "Online Customer",
        customer_phone: order.customer_phone || "",
        customer_address: order.customer_address || "",
        subtotal: Number(order.subtotal || order.total_amount || 0),
        discount_amount: Number(order.discount || 0),
        tax_rate: 18,
        tax_amount: Number(order.tax_amount || 0),
        total_amount: Number(order.total_amount || 0),
        payment_method: order.payment_method || "COD",
        payment_status: order.payment_status || "unpaid",
        order_status: newStatus,
        status: newStatus,
        created_at: order.created_at || new Date().toISOString(),
        items: order.items || []
      };
      invoices.unshift(inv);
    } else {
      inv.order_status = newStatus;
      inv.status = newStatus;
      if (newStatus === "cancelled" && inv.payment_status !== "paid") {
        inv.payment_status = "cancelled";
        order.payment_status = "unpaid";
        localStorage.setItem("dc_orders_list", JSON.stringify(adminOrdersList));
      }
    }
    localStorage.setItem("dc_invoices_history", JSON.stringify(invoices));

    const sb = getSupabase();
    if (isSupabaseConfigured() && sb) {
      try {
        await sb.from("orders").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("order_number", orderNumber);
        await sb.from("invoices").update({ notes: `Order Status: ${newStatus}` }).eq("invoice_number", orderNumber);
      } catch (err) {
        console.warn("Supabase order status update error:", err);
      }
    }

    if (typeof broadcastSync === "function") {
      broadcastSync("order_updated", { orderNumber, status: newStatus });
    }

    showToast(`Order ${orderNumber} status updated to ${newStatus.toUpperCase()} (Synced to Invoices).`, "success");
    applyOrderFilters();
  }
}

async function updateOrderPaymentStatus(orderNumber, newPaymentStatus) {
  const order = adminOrdersList.find(o => o.order_number === orderNumber);
  if (order) {
    order.payment_status = newPaymentStatus;
    localStorage.setItem("dc_orders_list", JSON.stringify(adminOrdersList));

    // Immediately update or create in invoices archive
    const invoices = JSON.parse(localStorage.getItem("dc_invoices_history") || "[]");
    let inv = invoices.find(i => i.invoice_number === orderNumber || i.order_id === orderNumber);
    if (!inv) {
      inv = {
        invoice_number: order.order_number,
        order_id: order.id || order.order_number,
        source: "Online Order",
        customer_name: order.customer_name || "Online Customer",
        customer_phone: order.customer_phone || "",
        customer_address: order.customer_address || "",
        subtotal: Number(order.subtotal || order.total_amount || 0),
        discount_amount: Number(order.discount || 0),
        tax_rate: 18,
        tax_amount: Number(order.tax_amount || 0),
        total_amount: Number(order.total_amount || 0),
        payment_method: order.payment_method || "COD",
        payment_status: newPaymentStatus,
        order_status: order.status || "pending",
        status: order.status || "pending",
        created_at: order.created_at || new Date().toISOString(),
        items: order.items || []
      };
      invoices.unshift(inv);
    } else {
      inv.payment_status = newPaymentStatus;
    }
    localStorage.setItem("dc_invoices_history", JSON.stringify(invoices));

    const sb = getSupabase();
    if (isSupabaseConfigured() && sb) {
      try {
        await sb.from("orders").update({ payment_status: newPaymentStatus, updated_at: new Date().toISOString() }).eq("order_number", orderNumber);
        const { data: existingInv } = await sb.from("invoices").select("id").eq("invoice_number", orderNumber).maybeSingle();
        if (existingInv) {
          await sb.from("invoices").update({ payment_status: newPaymentStatus === "unpaid" ? "pending" : newPaymentStatus }).eq("invoice_number", orderNumber);
        }
      } catch (err) {
        console.warn("Supabase payment_status update error:", err);
      }
    }

    if (typeof broadcastSync === "function") {
      broadcastSync("order_updated", { orderNumber, paymentStatus: newPaymentStatus });
    }

    showToast(`Payment status for Order ${orderNumber} updated to ${newPaymentStatus.toUpperCase()} (Synced to Invoices).`, "success");
    applyOrderFilters();
  }
}

/**
 * Open Print Invoice dialog for an online website order
 */
function printOrderInvoice(orderNumber) {
  const order = adminOrdersList.find(o => o.order_number === orderNumber);
  if (!order) {
    showToast("Order not found", "error");
    return;
  }

  const invoiceData = {
    invoice_number: order.order_number,
    order_id: order.id || order.order_number,
    customer_name: order.customer_name || "Valued Customer",
    customer_phone: order.customer_phone || "",
    customer_address: order.customer_address || "",
    subtotal: Number(order.subtotal || order.total_amount || 0),
    discount_amount: Number(order.discount || 0),
    tax_rate: 18,
    tax_amount: Number(order.tax_amount || 0),
    total_amount: Number(order.total_amount || 0),
    payment_method: order.payment_method || "COD",
    payment_status: order.payment_status || (order.status === "delivered" ? "paid" : "pending"),
    created_at: order.created_at || new Date().toISOString(),
    items: (order.items && order.items.length > 0) ? order.items.map(item => ({
      product_name: item.product_name || "Firecracker Item",
      sku: item.sku || "-",
      unit_price: Number(item.unit_price || item.subtotal / (item.quantity || 1) || 0),
      quantity: Number(item.quantity || 1),
      subtotal: Number(item.subtotal || (item.unit_price || 0) * (item.quantity || 1) || 0)
    })) : [
      {
        product_name: "Festive Fireworks Assortment",
        sku: "ORDER-" + order.order_number.slice(-4),
        unit_price: Number(order.total_amount),
        quantity: 1,
        subtotal: Number(order.total_amount)
      }
    ]
  };

  openInvoiceModal(invoiceData);
}

/**
 * Open Rich Order Details Modal with direct status & payment status updating
 */
function openOrderDetailsModal(orderNumber) {
  const order = adminOrdersList.find(o => o.order_number === orderNumber);
  if (!order) return;

  let modal = document.getElementById("orderDetailsModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "orderDetailsModal";
    modal.className = "modal-overlay";
    document.body.appendChild(modal);
  }

  const payStatus = (order.payment_status || "unpaid").toLowerCase();
  const ordStatus = (order.status || "pending").toLowerCase();

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 650px;">
      <div class="modal-header">
        <h3 class="modal-title">Order Details #${order.order_number}</h3>
        <button class="modal-close" onclick="closeOrderDetailsModal()">&times;</button>
      </div>
      <div class="modal-body" style="padding: 1.25rem;">
        <div class="order-modal-header-grid">
          <div>
            <div style="font-size: 0.72rem; color: #6b7280; font-weight: 700; text-transform: uppercase;">Customer Info</div>
            <div style="font-weight: 700; font-size: 1.05rem; margin-top: 2px;">${order.customer_name || 'Valued Customer'}</div>
            <div style="font-size: 0.85rem; color: #4b5563; margin-top: 4px; display: flex; align-items: center; gap: 8px;">
              <span>📞 ${order.customer_phone || '-'}</span>
              ${order.customer_phone ? `
                <a href="tel:${order.customer_phone}" class="moc-comm-btn call" style="width: 28px; height: 28px; font-size: 0.75rem;" title="Call">📞</a>
                <button type="button" class="moc-comm-btn wa" style="width: 28px; height: 28px; font-size: 0.75rem;" onclick="sendOrderCustomerWhatsApp('${order.order_number}')" title="WhatsApp">💬</button>
              ` : ''}
            </div>
            <div style="font-size: 0.8rem; color: #6b7280; margin-top: 6px;">📍 ${order.customer_address || 'Online order'}</div>
          </div>
          <div>
            <div style="font-size: 0.72rem; color: #6b7280; font-weight: 700; text-transform: uppercase;">Status Controls</div>
            <div style="margin-top: 6px; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
              <span style="font-size: 0.82rem; font-weight: 600;">Order:</span>
              <select class="status-select status-select-${ordStatus}" onchange="updateOrderStatus('${order.order_number}', this.value); updateOrderSummaryStats(); openOrderDetailsModal('${order.order_number}');">
                <option value="pending" ${ordStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                <option value="confirmed" ${ordStatus === 'confirmed' ? 'selected' : ''}>📋 Confirmed</option>
                <option value="dispatched" ${ordStatus === 'dispatched' ? 'selected' : ''}>🚚 Dispatched</option>
                <option value="delivered" ${ordStatus === 'delivered' ? 'selected' : ''}>🎉 Delivered</option>
                <option value="cancelled" ${ordStatus === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
              </select>
            </div>
            <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
              <span style="font-size: 0.82rem; font-weight: 600;">Payment:</span>
              <select class="status-select status-select-${payStatus}" onchange="updateOrderPaymentStatus('${order.order_number}', this.value); updateOrderSummaryStats(); openOrderDetailsModal('${order.order_number}');">
                <option value="paid" ${payStatus === 'paid' ? 'selected' : ''}>✅ Paid</option>
                <option value="unpaid" ${payStatus === 'unpaid' ? 'selected' : ''}>❌ Unpaid</option>
                <option value="pending" ${payStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                <option value="refunded" ${payStatus === 'refunded' ? 'selected' : ''}>↩️ Refunded</option>
              </select>
            </div>
            <div style="font-size: 0.82rem; margin-top: 6px;">Mode: <strong>${order.payment_method || 'COD'}</strong></div>
            <div style="font-size: 0.75rem; color: #6b7280; margin-top: 2px;">Date: ${new Date(order.created_at || Date.now()).toLocaleString("en-IN")}</div>
          </div>
        </div>

        <h4 style="font-size: 0.92rem; font-weight: 700; margin-bottom: 0.5rem;">Ordered Fireworks Items</h4>
        <div style="max-height: 220px; overflow-y: auto; margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 6px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
            <thead>
              <tr style="background: #f3f4f6; text-align: left;">
                <th style="padding: 6px 10px;">Item</th>
                <th style="padding: 6px 8px; width: 50px; text-align: center;">Qty</th>
                <th style="padding: 6px 10px; width: 75px; text-align: right;">Rate</th>
                <th style="padding: 6px 10px; width: 85px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items && order.items.length > 0) ? order.items.map(it => `
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="padding: 6px 10px;">${it.product_name}</td>
                  <td style="padding: 6px 8px; text-align: center;">${it.quantity}</td>
                  <td style="padding: 6px 10px; text-align: right;">${formatCurrency(it.unit_price || it.price)}</td>
                  <td style="padding: 6px 10px; text-align: right; font-weight: 700;">${formatCurrency(it.subtotal || (it.price * it.quantity))}</td>
                </tr>
              `).join('') : `
                <tr><td colspan="4" style="padding: 10px; text-align: center; color: #9ca3af;">Assorted Festival Box Package</td></tr>
              `}
            </tbody>
          </table>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 1.15rem; font-weight: 800; color: #c21d1d; margin-bottom: 1.25rem; background: #fffbeb; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #fde68a;">
          <span style="font-size: 0.9rem; color: #92400e; font-weight: 700;">Total Payable:</span>
          <span>${formatCurrency(order.total_amount)}</span>
        </div>

        <div class="order-modal-footer-actions">
          <button type="button" class="btn btn-accent btn-sm" onclick="sendOrderCustomerWhatsApp('${order.order_number}')">
            📲 WhatsApp Customer
          </button>
          <div class="modal-actions-right">
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeOrderDetailsModal()">Close</button>
            <a href="/invoice.html?invoice=${order.order_number}&download=true" target="_blank" class="btn btn-sm" style="background: #059669; color: #fff; display: inline-flex; align-items: center; justify-content: center;">📥 PDF</a>
            <button type="button" class="btn btn-primary btn-sm" onclick="closeOrderDetailsModal(); printOrderInvoice('${order.order_number}');">
              🖨️ Print Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  modal.style.display = "flex";
}

function closeOrderDetailsModal() {
  const modal = document.getElementById("orderDetailsModal");
  if (modal) modal.style.display = "none";
}

function sendOrderCustomerWhatsApp(orderNumber) {
  const order = adminOrdersList.find(o => o.order_number === orderNumber);
  if (!order) return;
  const settings = JSON.parse(localStorage.getItem("dc_business_settings") || "{}");
  let phone = cleanPhoneNumber(order.customer_phone);
  if (!phone || phone.length < 10) {
    const entered = prompt("Enter customer 10-digit WhatsApp phone number:", order.customer_phone || "");
    if (!entered) return;
    phone = cleanPhoneNumber(entered);
  }
  if (!phone || phone.length < 10) {
    showToast("No valid phone number for customer", "error");
    return;
  }
  const msg = 
`🎆 *${settings.shop_name || 'Dhanalakshmi Crackers'}* 🎆
Hello ${order.customer_name},

Regarding your order: *${order.order_number}*
Order Status: *${order.status.toUpperCase()}*
Payment Status: *${(order.payment_status || 'unpaid').toUpperCase()}*
Total: *${formatCurrency(order.total_amount)}*
Payment Mode: *${order.payment_method}*

Your festive fireworks order is being processed. Thank you for choosing us!
📞 Helpline: ${settings.whatsapp_phone || settings.phone || '+91 98765 43210'}`;

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
}

// ==============================================================================
// INVOICES ARCHIVE (admin/invoices.html)
// ==============================================================================
let adminInvoicesList = [];

async function initAdminInvoices() {
  await protectAdminRoute();

  // 1. Synchronize all local orders into invoices archive immediately
  adminInvoicesList = syncOrdersAndInvoices();

  // 2. Fetch fresh invoices & orders from Supabase if configured
  const sb = getSupabase();
  if (isSupabaseConfigured() && sb) {
    try {
      const [invRes, ordRes] = await Promise.all([
        sb.from("invoices").select("*, invoice_items(*)").order("created_at", { ascending: false }),
        sb.from("orders").select("*, order_items(*)").order("created_at", { ascending: false })
      ]);

      if (!invRes.error && invRes.data) {
        invRes.data.forEach(i => {
          const existing = adminInvoicesList.find(x => x.invoice_number === i.invoice_number);
          if (existing) {
            existing.payment_status = i.payment_status || existing.payment_status;
            existing.total_amount = Number(i.total_amount || existing.total_amount);
          } else {
            adminInvoicesList.push({
              id: i.id,
              invoice_number: i.invoice_number,
              order_id: i.order_id,
              source: i.order_id ? "Online Order" : "POS Billing",
              customer_name: i.customer_name,
              customer_phone: i.customer_phone,
              customer_address: i.customer_address,
              subtotal: Number(i.subtotal || i.total_amount),
              discount_amount: Number(i.discount_amount || 0),
              tax_rate: Number(i.tax_rate || 18),
              tax_amount: Number(i.tax_amount || 0),
              total_amount: Number(i.total_amount),
              payment_method: i.payment_method || "CASH",
              payment_status: i.payment_status || "paid",
              order_status: "confirmed",
              status: "confirmed",
              created_at: i.created_at,
              items: (i.invoice_items || []).map(it => ({
                product_name: it.product_name,
                sku: it.sku,
                unit_price: Number(it.unit_price),
                quantity: Number(it.quantity),
                subtotal: Number(it.subtotal)
              }))
            });
          }
        });
      }

      if (!ordRes.error && ordRes.data) {
        ordRes.data.forEach(o => {
          const existing = adminInvoicesList.find(x => x.invoice_number === o.order_number || x.order_id === o.order_number || x.order_id === o.id);
          if (existing) {
            existing.payment_status = o.payment_status || existing.payment_status;
            existing.order_status = o.status || existing.order_status;
            existing.status = o.status || existing.status;
          } else {
            adminInvoicesList.unshift({
              invoice_number: o.order_number,
              order_id: o.id || o.order_number,
              source: "Online Order",
              customer_name: o.customer_name,
              customer_phone: o.customer_phone,
              customer_address: o.customer_address,
              subtotal: Number(o.subtotal || o.total_amount),
              discount_amount: Number(o.discount || 0),
              tax_rate: 18,
              tax_amount: Number(o.tax_amount || 0),
              total_amount: Number(o.total_amount),
              payment_method: o.payment_method || "COD",
              payment_status: o.payment_status || "unpaid",
              order_status: o.status || "pending",
              status: o.status || "pending",
              created_at: o.created_at,
              items: (o.order_items || []).map(it => ({
                product_name: it.product_name,
                sku: it.sku,
                unit_price: Number(it.unit_price),
                quantity: Number(it.quantity),
                subtotal: Number(it.subtotal)
              }))
            });
          }
        });
      }

      localStorage.setItem("dc_invoices_history", JSON.stringify(adminInvoicesList));
    } catch (err) {
      console.warn("Could not sync invoices/orders from Supabase:", err);
    }
  }

  // Sort descending by created_at
  adminInvoicesList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  renderInvoicesArchiveTable(adminInvoicesList);

  const searchInput = document.getElementById("invoiceSearchInput");
  const channelFilter = document.getElementById("invoiceChannelFilter");
  const statusFilter = document.getElementById("invoicePaymentStatusFilter");

  if (searchInput) searchInput.addEventListener("input", applyInvoiceFilters);
  if (channelFilter) channelFilter.addEventListener("change", applyInvoiceFilters);
  if (statusFilter) statusFilter.addEventListener("change", applyInvoiceFilters);

  if (typeof listenSync === "function") {
    listenSync(async (event) => {
      if (event.type === "order_created" || event.type === "order_updated") {
        adminInvoicesList = syncOrdersAndInvoices();
        applyInvoiceFilters();
      }
    });
  }
}

function applyInvoiceFilters() {
  const searchInput = document.getElementById("invoiceSearchInput");
  const channelFilter = document.getElementById("invoiceChannelFilter");
  const statusFilter = document.getElementById("invoicePaymentStatusFilter");

  const q = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const ch = channelFilter ? channelFilter.value : "all";
  const s = statusFilter ? statusFilter.value : "all";

  let filtered = adminInvoicesList;

  if (ch !== "all") {
    if (ch === "pos") {
      filtered = filtered.filter(inv => (inv.source || "").toLowerCase().includes("pos") || !inv.order_id);
    } else if (ch === "online") {
      filtered = filtered.filter(inv => (inv.source || "").toLowerCase().includes("online") || !!inv.order_id);
    }
  }

  if (s !== "all") {
    filtered = filtered.filter(inv => (inv.payment_status || "paid").toLowerCase() === s.toLowerCase());
  }

  if (q) {
    filtered = filtered.filter(inv =>
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q)) ||
      (inv.customer_name && inv.customer_name.toLowerCase().includes(q)) ||
      (inv.customer_phone && inv.customer_phone.includes(q))
    );
  }

  renderInvoicesArchiveTable(filtered);
}

function renderInvoicesArchiveTable(invoices) {
  const tbody = document.getElementById("adminInvoicesTbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (invoices.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #9ca3af; padding: 2.5rem; font-size: 0.95rem;">No sales invoices found matching current criteria.</td></tr>`;
    return;
  }

  invoices.forEach(inv => {
    const payStatus = (inv.payment_status || "paid").toLowerCase();
    const ordStatus = (inv.order_status || inv.status || "confirmed").toLowerCase();
    const isOnline = (inv.source || "").toLowerCase().includes("online") || !!inv.order_id;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${inv.invoice_number}</strong></td>
      <td>
        <span class="badge ${isOnline ? 'badge-warning' : 'badge-info'}" style="font-size: 0.72rem;">
          ${isOnline ? '📦 Online Order' : '⚡ POS Bill'}
        </span>
      </td>
      <td>
        <strong>${inv.customer_name || 'Walk-in Customer'}</strong>
        <div style="font-size: 0.75rem; color: #6b7280;">${inv.customer_phone || '-'}</div>
      </td>
      <td><strong>${formatCurrency(inv.total_amount)}</strong></td>
      <td><span class="badge badge-info">${inv.payment_method || 'CASH'}</span></td>
      <td>
        <select class="status-select status-select-${payStatus}" onchange="updateInvoicePaymentStatus('${inv.invoice_number}', this.value)" title="Change Invoice Payment Status">
          <option value="paid" ${payStatus === 'paid' ? 'selected' : ''}>✅ Paid</option>
          <option value="unpaid" ${payStatus === 'unpaid' ? 'selected' : ''}>❌ Unpaid</option>
          <option value="pending" ${payStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
          <option value="cancelled" ${payStatus === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
        </select>
      </td>
      <td>
        ${isOnline ? `
          <select class="status-select status-select-${ordStatus}" onchange="updateInvoiceOrderStatus('${inv.invoice_number}', this.value)" title="Change Order Status">
            <option value="pending" ${ordStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
            <option value="confirmed" ${ordStatus === 'confirmed' ? 'selected' : ''}>📋 Confirmed</option>
            <option value="dispatched" ${ordStatus === 'dispatched' ? 'selected' : ''}>🚚 Dispatched</option>
            <option value="delivered" ${ordStatus === 'delivered' ? 'selected' : ''}>🎉 Delivered</option>
            <option value="cancelled" ${ordStatus === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
          </select>
        ` : `
          <span style="font-size: 0.8rem; color: #6b7280; font-weight: 600;">Counter POS</span>
        `}
      </td>
      <td>${new Date(inv.created_at || Date.now()).toLocaleDateString("en-IN")}</td>
      <td>
        <div class="action-btn-group">
          <a href="/invoice.html?invoice=${inv.invoice_number}&download=true" target="_blank" class="action-btn" style="color: #059669;" title="Download PDF Invoice">📥 PDF</a>
          <button class="action-btn" onclick="openAdminInvoiceModal('${inv.invoice_number}')">🖨️ View & Print</button>
          <button class="action-btn" onclick="sendAdminInvoiceWhatsApp('${inv.invoice_number}')">📲 WhatsApp</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAdminInvoiceModal(invoiceNumber) {
  const inv = adminInvoicesList.find(i => i.invoice_number === invoiceNumber) ||
              JSON.parse(localStorage.getItem("dc_invoices_history") || "[]").find(i => i.invoice_number === invoiceNumber);
  if (!inv) {
    showToast("Invoice not found", "error");
    return;
  }
  openInvoiceModal(inv);
}

function sendAdminInvoiceWhatsApp(invoiceNumber) {
  const inv = adminInvoicesList.find(i => i.invoice_number === invoiceNumber) ||
              JSON.parse(localStorage.getItem("dc_invoices_history") || "[]").find(i => i.invoice_number === invoiceNumber);
  if (!inv) {
    showToast("Invoice not found", "error");
    return;
  }
  const settings = JSON.parse(localStorage.getItem("dc_business_settings") || "{}");
  sendInvoiceViaWhatsApp(inv.customer_phone, inv, settings);
}

async function updateInvoicePaymentStatus(invoiceNumber, newPaymentStatus) {
  const inv = adminInvoicesList.find(i => i.invoice_number === invoiceNumber);
  if (inv) {
    inv.payment_status = newPaymentStatus;
    localStorage.setItem("dc_invoices_history", JSON.stringify(adminInvoicesList));

    // Synchronize to orders list if this invoice belongs to an online order
    const orders = JSON.parse(localStorage.getItem("dc_orders_list") || "[]");
    const ord = orders.find(o => o.order_number === invoiceNumber || o.id === inv.order_id || inv.order_id === o.order_number);
    if (ord) {
      ord.payment_status = newPaymentStatus;
      localStorage.setItem("dc_orders_list", JSON.stringify(orders));
    }

    const sb = getSupabase();
    if (isSupabaseConfigured() && sb) {
      try {
        await sb.from("invoices").update({ payment_status: newPaymentStatus === "unpaid" ? "pending" : newPaymentStatus }).eq("invoice_number", invoiceNumber);
        if (ord) {
          await sb.from("orders").update({ payment_status: newPaymentStatus, updated_at: new Date().toISOString() }).eq("order_number", ord.order_number);
        }
      } catch (err) {
        console.warn("Supabase payment update error:", err);
      }
    }

    if (typeof broadcastSync === "function") {
      broadcastSync("order_updated", { invoiceNumber, paymentStatus: newPaymentStatus });
    }

    showToast(`Payment status for Invoice ${invoiceNumber} updated to ${newPaymentStatus.toUpperCase()} (Synced to Orders).`, "success");
    applyInvoiceFilters();
  }
}

async function updateInvoiceOrderStatus(invoiceNumber, newOrderStatus) {
  const inv = adminInvoicesList.find(i => i.invoice_number === invoiceNumber);
  if (inv) {
    inv.order_status = newOrderStatus;
    inv.status = newOrderStatus;
    if (newOrderStatus === "cancelled" && inv.payment_status !== "paid") {
      inv.payment_status = "cancelled";
    }
    localStorage.setItem("dc_invoices_history", JSON.stringify(adminInvoicesList));

    // Synchronize to orders list
    const orders = JSON.parse(localStorage.getItem("dc_orders_list") || "[]");
    const ord = orders.find(o => o.order_number === invoiceNumber || o.id === inv.order_id || inv.order_id === o.order_number);
    if (ord) {
      ord.status = newOrderStatus;
      if (newOrderStatus === "cancelled" && ord.payment_status !== "paid") {
        ord.payment_status = "unpaid";
      }
      localStorage.setItem("dc_orders_list", JSON.stringify(orders));
    }

    const sb = getSupabase();
    if (isSupabaseConfigured() && sb) {
      try {
        await sb.from("invoices").update({ notes: `Order Status: ${newOrderStatus}` }).eq("invoice_number", invoiceNumber);
        if (ord) {
          await sb.from("orders").update({ status: newOrderStatus, updated_at: new Date().toISOString() }).eq("order_number", ord.order_number);
        }
      } catch (err) {
        console.warn("Supabase order status update error:", err);
      }
    }

    if (typeof broadcastSync === "function") {
      broadcastSync("order_updated", { invoiceNumber, orderStatus: newOrderStatus });
    }

    showToast(`Order status for ${invoiceNumber} updated to ${newOrderStatus.toUpperCase()} (Synced to Orders).`, "success");
    applyInvoiceFilters();
  }
}

// ==============================================================================
// CUSTOMERS (admin/customers.html)
// ==============================================================================
function initAdminCustomers() {
  protectAdminRoute();
  const invoices = JSON.parse(localStorage.getItem("dc_invoices_history") || "[]");
  const orders = JSON.parse(localStorage.getItem("dc_orders_list") || "[]");

  // Aggregate by phone
  const customerMap = {};
  [...invoices, ...orders].forEach(entry => {
    const phone = entry.customer_phone || "Walk-in";
    if (!customerMap[phone]) {
      customerMap[phone] = {
        name: entry.customer_name || "Customer",
        phone: phone,
        address: entry.customer_address || "In-store",
        totalOrders: 0,
        totalSpent: 0
      };
    }
    customerMap[phone].totalOrders += 1;
    customerMap[phone].totalSpent += Number(entry.total_amount || 0);
  });

  const list = Object.values(customerMap);
  const tbody = document.getElementById("adminCustomersTbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #9ca3af; padding: 2rem;">No customer records found.</td></tr>`;
    return;
  }

  list.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${c.name}</strong></td>
      <td>${c.phone}</td>
      <td>${c.address}</td>
      <td><span class="badge badge-info">${c.totalOrders}</span></td>
      <td><strong>${formatCurrency(c.totalSpent)}</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

// ==============================================================================
// SETTINGS (admin/settings.html)
// ==============================================================================
async function initAdminSettings() {
  await protectAdminRoute();
  const settings = await fetchBusinessSettings();

  document.getElementById("setShopName").value = settings.shop_name || "";
  document.getElementById("setBusinessCategory").value = settings.business_category || "";
  document.getElementById("setTagline").value = settings.tagline || "";
  document.getElementById("setLogoUrl").value = settings.logo_url || "";
  document.getElementById("setPhone").value = settings.phone || "";
  document.getElementById("setWhatsappPhone").value = settings.whatsapp_phone || settings.phone || "";
  document.getElementById("setEmail").value = settings.email || "";
  document.getElementById("setOperatingHours").value = settings.operating_hours || "";
  document.getElementById("setAddress").value = settings.address || "";
  document.getElementById("setBusinessDesc").value = settings.business_description || "";
  document.getElementById("setGst").value = settings.gst_number || "";
  document.getElementById("setTaxRate").value = settings.default_tax_rate || 18;
  document.getElementById("setTaxApplicable").checked = settings.tax_applicable !== false;
  document.getElementById("setInvoiceFooter").value = settings.invoice_footer || "";
  if (document.getElementById("setGoogleReviewUrl")) {
    document.getElementById("setGoogleReviewUrl").value = settings.google_review_url || "https://share.google/AwTsdLuk9OtRHQhbR";
  }
  if (document.getElementById("setGuideVideoUrl")) {
    document.getElementById("setGuideVideoUrl").value = settings.guide_video_url || "https://www.youtube.com/watch?v=kY7XlB8mS78";
  }
  document.getElementById("setUpiId").value = settings.upi_id || "";
  document.getElementById("setUpiName").value = settings.upi_name || "";
  if (document.getElementById("setDefaultPrintFormat")) {
    document.getElementById("setDefaultPrintFormat").value = settings.default_print_format || localStorage.getItem("dc_default_print_format") || "80mm";
  }

  // Supabase Credentials Config
  const currentSbUrl = localStorage.getItem("dc_supabase_url");
  const currentSbKey = localStorage.getItem("dc_supabase_anon_key");
  const currentServiceKey = localStorage.getItem("dc_supabase_service_key");
  document.getElementById("setSupabaseUrl").value = (currentSbUrl && !currentSbUrl.includes("your-project")) ? currentSbUrl : DEFAULT_SUPABASE_URL;
  document.getElementById("setSupabaseAnonKey").value = (currentSbKey && !currentSbKey.includes("your-public-anon-key")) ? currentSbKey : DEFAULT_SUPABASE_ANON_KEY;
  if (document.getElementById("setSupabaseServiceKey")) {
    document.getElementById("setSupabaseServiceKey").value = currentServiceKey || "";
  }

  const form = document.getElementById("settingsForm");
  if (form) {
    form.addEventListener("submit", saveAdminSettings);
  }
}

async function testSupabaseOnlineSync() {
  const statusEl = document.getElementById("supabaseSyncStatus");
  if (statusEl) {
    statusEl.innerHTML = '<span style="color:#d97706; font-size: 0.9rem;">⏳ Testing cloud connection and online write access...</span>';
  }

  const sb = (typeof getAdminSupabase === "function") ? getAdminSupabase() : getSupabase();
  if (!sb || !isSupabaseConfigured()) {
    if (statusEl) statusEl.innerHTML = '<span style="color:#dc2626; font-size: 0.9rem;">❌ Supabase is not configured. Check Project URL and Anon Key.</span>';
    return;
  }

  try {
    const { data: readData, error: readErr } = await sb.from("products").select("id, name").limit(1);
    if (readErr) {
      if (statusEl) statusEl.innerHTML = `<span style="color:#dc2626; font-size: 0.9rem;">❌ Cloud Read Error: ${readErr.message}</span>`;
      return;
    }

    const testId = readData && readData.length > 0 ? readData[0].id : null;
    if (testId) {
      const { data: writeData, error: writeErr } = await sb
        .from("products")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", testId)
        .select();

      if (writeErr) {
        if (statusEl) statusEl.innerHTML = `<span style="color:#dc2626; font-size: 0.9rem;">⚠️ Read works (${readData.length} products), but Write failed: ${writeErr.message}. Enter Service Role Key or run SQL policy fix.</span>`;
        return;
      }

      if (!writeData || writeData.length === 0) {
        if (statusEl) statusEl.innerHTML = `<span style="color:#dc2626; font-size: 0.9rem;">⚠️ Read works, but Write was restricted by RLS (0 rows updated). Enter Service Role Key or run SQL policy fix.</span>`;
        return;
      }
    }

    if (statusEl) statusEl.innerHTML = '<span style="color:#16a34a; font-weight:600; font-size: 0.9rem;">✅ Supabase Online Sync Fully Active! Reads & Writes directly connected to Cloud.</span>';
    showToast("✅ Supabase Cloud Connection & Online Writes are working perfectly!", "success");
  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<span style="color:#dc2626; font-size: 0.9rem;">❌ Connection test failed: ${err.message}</span>`;
  }
}

async function saveAdminSettings(e) {
  e.preventDefault();

  const settings = {
    shop_name: document.getElementById("setShopName").value.trim(),
    business_category: document.getElementById("setBusinessCategory").value.trim(),
    tagline: document.getElementById("setTagline").value.trim(),
    logo_url: document.getElementById("setLogoUrl").value.trim(),
    phone: document.getElementById("setPhone").value.trim(),
    whatsapp_phone: document.getElementById("setWhatsappPhone").value.trim(),
    email: document.getElementById("setEmail").value.trim(),
    operating_hours: document.getElementById("setOperatingHours").value.trim(),
    address: document.getElementById("setAddress").value.trim(),
    business_description: document.getElementById("setBusinessDesc").value.trim(),
    currency_symbol: "₹",
    currency_code: "INR",
    time_zone: "Asia/Kolkata",
    tax_applicable: document.getElementById("setTaxApplicable").checked,
    gst_number: document.getElementById("setGst").value.trim(),
    upi_id: document.getElementById("setUpiId").value.trim(),
    upi_name: document.getElementById("setUpiName").value.trim(),
    default_tax_rate: Number(document.getElementById("setTaxRate").value) || 18,
    invoice_footer: document.getElementById("setInvoiceFooter").value.trim(),
    default_print_format: document.getElementById("setDefaultPrintFormat") ? document.getElementById("setDefaultPrintFormat").value : "80mm",
    google_review_url: (document.getElementById("setGoogleReviewUrl") ? document.getElementById("setGoogleReviewUrl").value.trim() : "") || "https://share.google/AwTsdLuk9OtRHQhbR",
    guide_video_url: (document.getElementById("setGuideVideoUrl") ? document.getElementById("setGuideVideoUrl").value.trim() : "") || "https://www.youtube.com/watch?v=kY7XlB8mS78"
  };

  const chosenFormat = document.getElementById("setDefaultPrintFormat") ? document.getElementById("setDefaultPrintFormat").value : "80mm";
  localStorage.setItem("dc_default_print_format", chosenFormat);

  const sbUrl = document.getElementById("setSupabaseUrl").value.trim();
  const sbKey = document.getElementById("setSupabaseAnonKey").value.trim();
  const sbServiceKey = document.getElementById("setSupabaseServiceKey") ? document.getElementById("setSupabaseServiceKey").value.trim() : "";

  if (sbUrl) localStorage.setItem("dc_supabase_url", sbUrl);
  if (sbKey) localStorage.setItem("dc_supabase_anon_key", sbKey);
  if (sbServiceKey) {
    localStorage.setItem("dc_supabase_service_key", sbServiceKey);
  } else {
    localStorage.removeItem("dc_supabase_service_key");
  }

  if (typeof saveBusinessSettings === "function") {
    await saveBusinessSettings(settings);
  } else {
    localStorage.setItem("dc_business_settings", JSON.stringify(settings));
    localStorage.setItem("dc_settings_customized", "true");
    const sb = (typeof getAdminSupabase === "function") ? getAdminSupabase() : getSupabase();
    if (isSupabaseConfigured() && sb) {
      try {
        await sb.from("business_settings").upsert({ id: "a0000000-0000-0000-0000-000000000001", ...settings });
      } catch (err) {
        console.warn("Supabase settings update error", err);
      }
    }
    if (typeof broadcastSync === "function") {
      broadcastSync("settings_updated", settings);
    }
  }

  showToast("Business Settings updated successfully! Storefront synchronized.", "success");

  // Update status strip and mobile save bar
  const sName = document.getElementById("statusShopName");
  const sUpi = document.getElementById("statusUpiId");
  if (sName) sName.textContent = settings.shop_name || "Dhanalakshmi Crackers";
  if (sUpi) sUpi.textContent = settings.upi_id || "Not Configured";

  const barText = document.querySelector(".mobile-save-text");
  const barDot = document.querySelector(".mobile-save-dot");
  if (barText) barText.textContent = "Saved to Cloud & Local";
  if (barDot) barDot.style.color = "#10b981";
}

/* ==============================================================================
   PRODUCT CATALOG IMPORT & EXPORT ENGINE
   Enables bulk CSV Export and Import with validation, preview, and cloud sync
   ============================================================================== */

let importedParsedProducts = [];

/**
 * Helper to escape a value for standard CSV formatting (RFC 4180)
 */
function escapeCsvValue(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  } else {
    str = '"' + str + '"';
  }
  return str;
}

/**
 * Robust CSV text parser supporting quoted strings, escaped quotes, and commas
 */
function parseCsvToRows(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        cell += '"';
        i += 2;
        continue;
      } else if (char === '"') {
        inQuotes = false;
        i++;
        continue;
      } else {
        cell += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        row.push(cell.trim());
        cell = '';
        i++;
        continue;
      } else if (char === '\r') {
        i++;
        continue;
      } else if (char === '\n') {
        row.push(cell.trim());
        if (row.some(c => c !== '')) rows.push(row);
        row = [];
        cell = '';
        i++;
        continue;
      } else {
        cell += char;
        i++;
        continue;
      }
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell.trim());
    if (row.some(c => c !== '')) rows.push(row);
  }

  return rows;
}

/**
 * 1-Click Export all Firecrackers to CSV
 */
function exportProductsToCSV() {
  const list = (Array.isArray(adminProductList) && adminProductList.length > 0)
    ? adminProductList
    : (typeof getStoredCustomProducts === "function" ? getStoredCustomProducts() : []);

  if (!list || list.length === 0) {
    showToast("No products found in catalog to export.", "warning");
    return;
  }

  const headers = [
    "name",
    "sku",
    "category",
    "price",
    "original_price",
    "stock_quantity",
    "unit",
    "is_featured",
    "image_url",
    "video_url",
    "description"
  ];

  let csvContent = "\uFEFF" + headers.join(",") + "\n"; // \uFEFF UTF-8 BOM for Microsoft Excel

  list.forEach(p => {
    const row = [
      escapeCsvValue(p.name || ""),
      escapeCsvValue(p.sku || ""),
      escapeCsvValue(p.category_name || "Crackers"),
      Number(p.price) || 0,
      Number(p.original_price || p.price) || 0,
      parseInt(p.stock_quantity, 10) || 0,
      escapeCsvValue(p.unit || "Box"),
      p.is_featured ? "true" : "false",
      escapeCsvValue(p.image_url || ""),
      escapeCsvValue(p.video_url || ""),
      escapeCsvValue(p.description || "")
    ];
    csvContent += row.join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  downloadLink.href = url;
  downloadLink.setAttribute("download", `Dhanalakshmi_Products_${dateStr}.csv`);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);

  showToast(`📥 Successfully exported ${list.length} products to CSV!`, "success");
}

/**
 * Download sample CSV template pre-populated with standard fireworks
 */
function downloadSampleProductTemplate() {
  const headers = [
    "name",
    "sku",
    "category",
    "price",
    "original_price",
    "stock_quantity",
    "unit",
    "is_featured",
    "image_url",
    "video_url",
    "description"
  ];

  const sampleRows = [
    [
      "Deluxe 1000 Wala Garland",
      "WALA-1000",
      "Wala",
      320,
      600,
      100,
      "Piece",
      "true",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600",
      "https://www.youtube.com/watch?v=kY7XlB8mS78",
      "Classic red Sivakasi festive sound garland with rhythmic crackles"
    ],
    [
      "Flower Pots Special (10 Pcs)",
      "FLP-SPC10",
      "Flower Pots",
      160,
      300,
      120,
      "Box (10 Pcs)",
      "true",
      "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600",
      "",
      "Bright golden spark fountain with multi-color stars"
    ],
    [
      "10cm Electric Sparklers",
      "SPK-10EL",
      "Sparklers",
      35,
      65,
      250,
      "Box (10 Pcs)",
      "false",
      "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600",
      "",
      "Smooth golden sparks safe for family celebrations"
    ]
  ];

  let csvContent = "\uFEFF" + headers.join(",") + "\n";
  sampleRows.forEach(r => {
    csvContent += r.map(v => typeof v === "number" ? v : escapeCsvValue(v)).join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.setAttribute("download", `Dhanalakshmi_Products_Sample_Template.csv`);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}

/**
 * Open Bulk Import Modal
 */
function openImportModal() {
  const modal = document.getElementById("productImportModal");
  if (!modal) return;

  importedParsedProducts = [];
  const fileInput = document.getElementById("productCsvFileInput");
  if (fileInput) fileInput.value = "";

  const dropText = document.getElementById("dropzoneText");
  if (dropText) dropText.innerHTML = `<strong>Click to select CSV file</strong> or drag & drop here`;

  const prevContainer = document.getElementById("importPreviewContainer");
  if (prevContainer) prevContainer.style.display = "none";

  const executeBtn = document.getElementById("btnExecuteImport");
  if (executeBtn) executeBtn.disabled = true;

  modal.style.display = "flex";
  modal.onclick = (e) => {
    if (e.target === modal) closeImportModal();
  };
}

/**
 * Close Bulk Import Modal
 */
function closeImportModal() {
  const modal = document.getElementById("productImportModal");
  if (modal) modal.style.display = "none";
}

/**
 * Handle CSV File selection and real-time preview parsing
 */
function handleProductCsvSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const dropText = document.getElementById("dropzoneText");
  if (dropText) dropText.innerHTML = `📄 <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    parseAndPreviewProductCsv(text);
  };
  reader.readAsText(file, "UTF-8");
}

/**
 * Parse CSV and render live table preview
 */
function parseAndPreviewProductCsv(csvText) {
  const allRows = parseCsvToRows(csvText);
  if (!allRows || allRows.length < 2) {
    showToast("CSV file must contain a header row and at least one product.", "warning");
    return;
  }

  const rawHeaders = allRows[0].map(h => h.toLowerCase().trim().replace(/[\s_-]+/g, ""));
  const headerMap = {};
  rawHeaders.forEach((h, idx) => {
    if (h.includes("name") || h.includes("title") || h.includes("product")) headerMap.name = idx;
    else if (h.includes("sku") || h.includes("code")) headerMap.sku = idx;
    else if (h.includes("cat")) headerMap.category = idx;
    else if (h.includes("original") || h.includes("mrp")) headerMap.original_price = idx;
    else if (h.includes("price") || h.includes("rate")) headerMap.price = idx;
    else if (h.includes("stock") || h.includes("qty")) headerMap.stock_quantity = idx;
    else if (h.includes("unit") || h.includes("pack")) headerMap.unit = idx;
    else if (h.includes("image") || h.includes("photo") || h.includes("img")) headerMap.image_url = idx;
    else if (h.includes("video") || h.includes("youtube")) headerMap.video_url = idx;
    else if (h.includes("desc")) headerMap.description = idx;
    else if (h.includes("feat")) headerMap.is_featured = idx;
  });

  if (headerMap.name === undefined || headerMap.price === undefined) {
    showToast("CSV must at least contain 'name' and 'price' columns.", "warning");
    return;
  }

  const parsed = [];
  for (let i = 1; i < allRows.length; i++) {
    const r = allRows[i];
    if (!r || r.length === 0 || !r.some(cell => cell.trim() !== "")) continue;

    const name = headerMap.name !== undefined ? (r[headerMap.name] || "").trim() : "";
    if (!name) continue;

    const sku = headerMap.sku !== undefined ? (r[headerMap.sku] || "").trim() : "";
    const category = headerMap.category !== undefined ? (r[headerMap.category] || "Crackers").trim() : "Crackers";
    const price = headerMap.price !== undefined ? (Number(r[headerMap.price]) || 0) : 0;
    const mrp = headerMap.original_price !== undefined ? (Number(r[headerMap.original_price]) || price) : price;
    const stock = headerMap.stock_quantity !== undefined ? (parseInt(r[headerMap.stock_quantity], 10) || 50) : 50;
    const unit = headerMap.unit !== undefined ? (r[headerMap.unit] || "Box").trim() : "Box";
    const image_url = headerMap.image_url !== undefined ? (r[headerMap.image_url] || "").trim() : "";
    const video_url = headerMap.video_url !== undefined ? (r[headerMap.video_url] || "").trim() : "";
    const desc = headerMap.description !== undefined ? (r[headerMap.description] || "").trim() : "";
    const feat = headerMap.is_featured !== undefined ? (String(r[headerMap.is_featured]).toLowerCase().includes("true") || r[headerMap.is_featured] === "1") : false;

    parsed.push({
      name,
      sku: sku || `SKU-${Date.now().toString(36).toUpperCase()}-${i}`,
      category_name: category,
      price,
      original_price: mrp >= price ? mrp : price,
      stock_quantity: stock,
      unit: unit || "Box",
      image_url: image_url || "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600",
      video_url,
      description: desc || "Authentic Sivakasi festive fireworks with certified safety standards.",
      is_featured: feat
    });
  }

  if (parsed.length === 0) {
    showToast("No valid product rows could be read from this CSV.", "warning");
    return;
  }

  importedParsedProducts = parsed;

  // Render preview table
  const prevCount = document.getElementById("importPreviewCount");
  if (prevCount) prevCount.textContent = `📦 Ready to Import: ${parsed.length} Products`;

  const tbody = document.getElementById("importPreviewTbody");
  if (tbody) {
    tbody.innerHTML = "";
    parsed.slice(0, 5).forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${p.name}</strong></td>
        <td><code>${p.sku}</code></td>
        <td>${p.category_name}</td>
        <td><strong>${formatCurrency(p.price)}</strong></td>
        <td><span class="badge badge-success">${p.stock_quantity} in stock</span></td>
      `;
      tbody.appendChild(tr);
    });
    if (parsed.length > 5) {
      const moreTr = document.createElement("tr");
      moreTr.innerHTML = `<td colspan="5" style="text-align:center; color:#64748b; font-style:italic;">... and ${parsed.length - 5} more firecrackers</td>`;
      tbody.appendChild(moreTr);
    }
  }

  const prevContainer = document.getElementById("importPreviewContainer");
  if (prevContainer) prevContainer.style.display = "block";

  const executeBtn = document.getElementById("btnExecuteImport");
  if (executeBtn) executeBtn.disabled = false;
}

/**
 * Execute Bulk Import into memory, Supabase cloud, and local persistence
 */
async function executeImportProducts() {
  if (!importedParsedProducts || importedParsedProducts.length === 0) {
    showToast("Please choose a valid CSV file first.", "warning");
    return;
  }

  const executeBtn = document.getElementById("btnExecuteImport");
  if (executeBtn) {
    executeBtn.disabled = true;
    executeBtn.textContent = "⏳ Importing Products...";
  }

  const updateExisting = document.getElementById("importUpdateExisting")?.checked ?? true;
  const categories = await fetchCategories();
  const sb = (typeof getAdminSupabase === "function") ? getAdminSupabase() : getSupabase();
  const isOnline = isSupabaseConfigured() && sb;

  let addedCount = 0;
  let updatedCount = 0;

  for (const item of importedParsedProducts) {
    // Resolve Category ID
    let matchedCat = categories.find(c => c.name.toLowerCase() === item.category_name.toLowerCase());
    let catId = matchedCat ? matchedCat.id : null;

    let existingIdx = -1;
    if (updateExisting) {
      existingIdx = adminProductList.findIndex(p => 
        (p.sku && item.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) ||
        (p.name && item.name && p.name.toLowerCase() === item.name.toLowerCase())
      );
    }

    let prodId = existingIdx !== -1 ? adminProductList[existingIdx].id : null;
    if (!prodId) {
      prodId = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : ("c1000000-0000-0000-0000-" + Date.now().toString(16).padStart(12, "0"));
    }

    const fullProduct = {
      id: prodId,
      name: item.name,
      sku: item.sku,
      category_id: catId,
      category_name: item.category_name,
      price: item.price,
      original_price: item.original_price,
      stock_quantity: item.stock_quantity,
      unit: item.unit,
      image_url: item.image_url,
      video_url: item.video_url,
      description: item.description,
      is_featured: item.is_featured,
      has_variants: false,
      variants: [],
      is_active: true
    };

    if (existingIdx !== -1) {
      adminProductList[existingIdx] = { ...adminProductList[existingIdx], ...fullProduct };
      updatedCount++;
    } else {
      adminProductList.unshift(fullProduct);
      addedCount++;
    }

    // Direct cloud sync to Supabase products table
    if (isOnline) {
      try {
        await sb.from("products").upsert({
          id: prodId,
          name: fullProduct.name,
          sku: fullProduct.sku,
          price: fullProduct.price,
          original_price: fullProduct.original_price,
          stock_quantity: fullProduct.stock_quantity,
          unit: fullProduct.unit,
          category_id: catId,
          is_featured: fullProduct.is_featured,
          image_url: fullProduct.image_url,
          description: fullProduct.description,
          is_active: true,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Supabase import item sync error", err);
      }
    }
  }

  // Persist authoritative catalog locally
  localStorage.setItem("dc_custom_products", JSON.stringify(adminProductList));
  localStorage.setItem("dc_products_updated_at", Date.now().toString());

  // Broadcast real-time sync event across storefront
  if (typeof broadcastSync === "function") {
    broadcastSync("products_updated", { action: "import", total: adminProductList.length });
  }

  // Refresh Table Display
  renderAdminProductsTable(adminProductList);

  closeImportModal();
  if (executeBtn) {
    executeBtn.disabled = false;
    executeBtn.textContent = "🚀 Start Bulk Import";
  }

  showToast(`🎉 Import Complete! Added: ${addedCount}, Updated: ${updatedCount}.`, "success", 5000);
}
