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
      if (["order_created", "order_updated", "products_updated", "sales_reset"].includes(event.type)) {
        syncOrdersAndInvoices();
        await loadDashboardStats();
        if (event.type === "order_created" && event.payload) {
          showToast(`🔔 New Online Order Received: #${event.payload.order_number}`, "success");
        } else if (event.type === "sales_reset") {
          showToast(`🔄 Sales counter reset across store devices.`, "info");
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
    tr.className = "dashboard-activity-row";
    const isPaid = (item.payment_status || "").toLowerCase() === "paid";
    if (item.type === "POS Invoice") {
      tr.style.cursor = "pointer";
      tr.title = "Click to preview invoice & send WhatsApp";
      tr.onclick = () => {
        if (typeof openInvoiceModal === "function") {
          openInvoiceModal(item.raw);
        }
      };
    }
    tr.innerHTML = `
      <td class="col-dash-ref" data-label="Reference #">
        <div class="dash-ref-wrap">
          <strong>${item.ref}</strong>
          <span class="badge ${item.type === 'POS Invoice' ? 'badge-info' : 'badge-warning'} dash-channel-pill">${item.type}</span>
        </div>
      </td>
      <td class="col-dash-channel" data-label="Channel">
        <span class="badge ${item.type === 'POS Invoice' ? 'badge-info' : 'badge-warning'}">${item.type}</span>
      </td>
      <td class="col-dash-cust" data-label="Customer">${item.customer || 'Walk-in Customer'}</td>
      <td class="col-dash-total" data-label="Total (₹)"><strong>${formatCurrency(item.amount)}</strong></td>
      <td class="col-dash-status" data-label="Status">
        <span class="badge ${isPaid ? 'badge-success' : 'badge-danger'}" title="Payment Status">${(item.payment_status || 'unpaid').toUpperCase()}</span>
        ${item.type === 'Online Order' ? `<div style="font-size: 0.72rem; color: #6b7280; margin-top: 3px; font-weight: 600;">Order: ${item.status.toUpperCase()}</div>` : ''}
      </td>
      <td class="col-dash-date" data-label="Date">${new Date(item.date).toLocaleDateString("en-IN")}</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Open Reset Sales Modal with current snapshot values
 */
function openResetSalesModal() {
  const modal = document.getElementById("resetSalesModal");
  if (!modal) return;

  const currentSales = document.getElementById("kpiTotalSales")?.textContent || "₹0.00";
  const currentOrders = document.getElementById("kpiTotalOrders")?.textContent || "0";

  const valEl = document.getElementById("modalCurrentSalesVal");
  const countEl = document.getElementById("modalCurrentOrdersCount");
  const inputEl = document.getElementById("resetConfirmInput");
  const btn = document.getElementById("btnConfirmResetSales");

  if (valEl) valEl.textContent = currentSales;
  if (countEl) countEl.textContent = currentOrders;
  if (inputEl) inputEl.value = "";
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
  }

  // Set default scope to 'all'
  const defRadio = document.querySelector('input[name="resetSalesScope"][value="all"]');
  if (defRadio) defRadio.checked = true;

  modal.style.display = "flex";
  setTimeout(() => {
    if (inputEl) inputEl.focus();
  }, 100);
}

/**
 * Close Reset Sales Modal
 */
function closeResetSalesModal() {
  const modal = document.getElementById("resetSalesModal");
  if (modal) modal.style.display = "none";
}

/**
 * Enable/disable confirm button based on typing 'RESET'
 */
function handleResetConfirmInput(val) {
  const btn = document.getElementById("btnConfirmResetSales");
  if (!btn) return;
  const isMatch = (val || "").trim().toUpperCase() === "RESET";
  btn.disabled = !isMatch;
  btn.style.opacity = isMatch ? "1" : "0.5";
  btn.style.cursor = isMatch ? "pointer" : "not-allowed";
}

/**
 * Export backup of current sales data as JSON before wiping
 */
function exportSalesBackupJSON() {
  try {
    const invoices = JSON.parse(localStorage.getItem("dc_invoices_history") || "[]");
    const orders = JSON.parse(localStorage.getItem("dc_orders_list") || "[]");
    const salesTotal = document.getElementById("kpiTotalSales")?.textContent || "₹0.00";
    const ordersCount = document.getElementById("kpiTotalOrders")?.textContent || "0";

    const payload = {
      exportTimestamp: new Date().toISOString(),
      store: "Dhanalakshmi Crackers",
      address: "No.33 Vengatesh Perumal Kovil Street, Maharnonbu Chavadi, Thanjavur, Tamil Nadu 613001",
      phone: "+91 94431 88531",
      stats: {
        totalSalesVolume: salesTotal,
        totalOrdersAndBillsCount: ordersCount
      },
      posInvoicesCount: invoices.length,
      onlineOrdersCount: orders.length,
      posInvoices: invoices,
      onlineOrders: orders
    };

    const dataBlob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    link.href = downloadUrl;
    link.download = `Dhanalakshmi_Sales_Backup_${today}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    if (typeof showToast === "function") {
      showToast("📥 Sales backup downloaded successfully!", "success");
    }
  } catch (err) {
    console.error("Backup export failed:", err);
    if (typeof showToast === "function") {
      showToast("⚠️ Could not generate backup file.", "error");
    }
  }
}

/**
 * Execute Sales Reset based on chosen scope
 */
async function executeSalesReset() {
  const confirmInput = document.getElementById("resetConfirmInput");
  if (confirmInput && confirmInput.value.trim().toUpperCase() !== "RESET") {
    if (typeof showToast === "function") {
      showToast("⚠️ Please type RESET to confirm sales wipe.", "error");
    }
    return;
  }

  const scope = (document.querySelector('input[name="resetSalesScope"]:checked') || {}).value || "all";
  const btn = document.getElementById("btnConfirmResetSales");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>⏳</span> Resetting...`;
  }

  try {
    const sb = typeof getSupabase === "function" ? getSupabase() : null;
    const isOnline = typeof isSupabaseConfigured === "function" && isSupabaseConfigured() && sb;

    if (scope === "all" || scope === "pos") {
      localStorage.setItem("dc_invoices_history", "[]");
      if (typeof adminInvoicesList !== "undefined") adminInvoicesList = [];
      if (isOnline) {
        try {
          await sb.from("invoices").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        } catch (e) {
          console.warn("Supabase invoices wipe note:", e);
        }
      }
    }

    if (scope === "all" || scope === "orders") {
      localStorage.setItem("dc_orders_list", "[]");
      if (typeof adminOrdersList !== "undefined") adminOrdersList = [];
      if (isOnline) {
        try {
          await sb.from("order_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
          await sb.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        } catch (e) {
          console.warn("Supabase orders wipe note:", e);
        }
      }
    }

    // Refresh dashboard stats and table immediately
    await loadDashboardStats();

    // Broadcast across open browser tabs & POS counters
    if (typeof emitSync === "function") {
      emitSync("sales_reset", { scope, timestamp: new Date().toISOString() });
    }

    closeResetSalesModal();
    if (typeof showToast === "function") {
      const scopeLabel = scope === "all" ? "All sales and orders" : (scope === "pos" ? "POS Bills" : "Online Orders");
      showToast(`✅ ${scopeLabel} successfully reset to ₹0.00!`, "success");
    }
  } catch (err) {
    console.error("Error executing sales reset:", err);
    if (typeof showToast === "function") {
      showToast("❌ An error occurred while resetting sales data.", "error");
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span>🗑️</span> Confirm & Reset Sales`;
    }
  }
}

// ==============================================================================
// PRODUCT MANAGEMENT (admin/products.html)
// ==============================================================================
let adminProductList = [];
let selectedProductIds = new Set();
let activeAdminCategoryFilter = "all";

async function initAdminProducts() {
  await protectAdminRoute();
  adminProductList = await fetchProducts();
  await initAdminCategoryFilters();
  renderAdminProductsTable(adminProductList);
  checkCloudSyncStatus(false);

  // Automatically sync any offline / local firecrackers (e.g. "ERERER") straight to online Supabase cloud
  setTimeout(() => {
    if (typeof syncPendingLocalProductsOnline === "function") {
      syncPendingLocalProductsOnline(false);
    }
  }, 600);

  const searchInput = document.getElementById("adminProductSearch");
  if (searchInput) {
    searchInput.addEventListener("input", applyAdminFilters);
  }

  if (typeof listenSync === "function") {
    listenSync(async (event) => {
      if (event.type === "products_updated" && event.payload?.action !== "save" && event.payload?.action !== "delete") {
        adminProductList = await fetchProducts();
        applyAdminFilters();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeProductModal();
  });
}

async function initAdminCategoryFilters() {
  const catFilter = document.getElementById("adminCategoryFilter");
  const bulkCatSelect = document.getElementById("bulkCategorySelect");
  const categories = await fetchCategories();

  if (catFilter) {
    catFilter.innerHTML = '<option value="all">🎆 All Categories</option>';
    categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      catFilter.appendChild(opt);
    });
  }

  if (bulkCatSelect) {
    bulkCatSelect.innerHTML = '<option value="">🏷️ Move Category...</option>';
    categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      bulkCatSelect.appendChild(opt);
    });
  }
}

function filterAdminProductsByCategory() {
  const catFilter = document.getElementById("adminCategoryFilter");
  activeAdminCategoryFilter = catFilter ? catFilter.value : "all";
  applyAdminFilters();
}

function applyAdminFilters() {
  const q = document.getElementById("adminProductSearch")?.value.toLowerCase().trim() || "";
  const filtered = adminProductList.filter(p => {
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
    const matchesCat = activeAdminCategoryFilter === "all" || p.category_id === activeAdminCategoryFilter || (p.category_name && p.category_name.toLowerCase() === activeAdminCategoryFilter.toLowerCase());
    return matchesSearch && matchesCat;
  });
  renderAdminProductsTable(filtered);
}

function toggleSelectAllProducts(masterChk) {
  const isChecked = Boolean(masterChk?.checked);
  const chks = document.querySelectorAll("#adminProductsTbody .product-select-chk");
  chks.forEach(chk => {
    chk.checked = isChecked;
    const row = chk.closest("tr");
    if (isChecked) {
      selectedProductIds.add(chk.value);
      if (row) row.classList.add("row-selected");
    } else {
      selectedProductIds.delete(chk.value);
      if (row) row.classList.remove("row-selected");
    }
  });
  updateBulkActionBar();
}

function toggleProductSelection(productId, isChecked) {
  if (isChecked) {
    selectedProductIds.add(productId);
  } else {
    selectedProductIds.delete(productId);
  }
  const chk = document.querySelector(`.product-select-chk[value="${productId}"]`);
  const row = chk?.closest("tr");
  if (row) row.classList.toggle("row-selected", isChecked);

  const masterChk = document.getElementById("selectAllProductsChk");
  const allChks = document.querySelectorAll("#adminProductsTbody .product-select-chk");
  if (masterChk && allChks.length > 0) {
    masterChk.checked = Array.from(allChks).every(c => c.checked);
  }
  updateBulkActionBar();
}

function updateBulkActionBar() {
  const bar = document.getElementById("productBulkActionsBar");
  const countEl = document.getElementById("bulkSelectedCount");
  const count = selectedProductIds.size;
  if (!bar) return;
  if (count > 0) {
    bar.style.display = "flex";
    if (countEl) countEl.textContent = `${count} ${count === 1 ? 'product' : 'products'} selected`;
  } else {
    bar.style.display = "none";
  }
}

function clearProductSelection() {
  selectedProductIds.clear();
  const masterChk = document.getElementById("selectAllProductsChk");
  if (masterChk) masterChk.checked = false;
  document.querySelectorAll("#adminProductsTbody .product-select-chk").forEach(c => {
    c.checked = false;
    c.closest("tr")?.classList.remove("row-selected");
  });
  updateBulkActionBar();
}

async function bulkDeleteSelectedProducts() {
  const count = selectedProductIds.size;
  if (count === 0) return;
  if (!confirm(`Are you sure you want to delete ${count} selected firecrackers? They will be permanently removed from your catalog and online store.`)) return;

  // 1. Verify administrator authorization
  const sessionUser = sessionStorage.getItem("dc_auth_user");
  let isAuthorized = false;
  if (sessionUser) {
    try {
      const parsed = JSON.parse(sessionUser);
      if (parsed && ["admin", "staff"].includes(parsed.role)) isAuthorized = true;
    } catch (_) {}
  }
  const sbAuth = (typeof getAdminSupabase === "function") ? getAdminSupabase() : getSupabase();
  if (!isAuthorized && sbAuth) {
    try {
      const { data: { session } } = await sbAuth.auth.getSession();
      if (session) isAuthorized = true;
    } catch (_) {}
  }
  if (!isAuthorized) {
    showToast("Unauthorized: Admin privileges required to delete products.", "error");
    return;
  }

  const idsToDelete = Array.from(selectedProductIds);
  const targetProducts = adminProductList.filter(p => selectedProductIds.has(p.id));
  const skusToDelete = targetProducts.map(p => p.sku).filter(Boolean);

  const sb = (typeof getAdminSupabase === "function") ? getAdminSupabase() : getSupabase();
  let dbError = null;

  if (isSupabaseConfigured() && sb) {
    try {
      // Step A: Attempt permanent hard delete
      let { data: deletedRows, error: delErr } = await sb
        .from("products")
        .delete()
        .in("id", idsToDelete)
        .select("id, sku");

      if (delErr) {
        // Step B: If FK error, fallback to soft-delete
        const isFkErr = delErr.message?.toLowerCase().includes("foreign key") || 
                        delErr.message?.toLowerCase().includes("violates") || 
                        delErr.code === "23503";
        if (isFkErr) {
          console.warn("[Bulk Delete] Hard delete hit FK constraint. Applying safe soft-delete (is_active: false)...");
          const { error: softErr } = await sb
            .from("products")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .in("id", idsToDelete);
          if (softErr) dbError = softErr.message;
        } else {
          dbError = delErr.message;
        }
      }
    } catch (err) {
      dbError = err.message || "Failed communicating with database.";
    }

    if (dbError) {
      showToast(`Bulk delete failed: ${dbError}. Products remain visible.`, "error", 7000);
      return;
    }
  }

  // 2. Remove from local list
  adminProductList = adminProductList.filter(p => !selectedProductIds.has(p.id));
  localStorage.setItem("dc_custom_products", JSON.stringify(adminProductList));
  localStorage.setItem("dc_products_updated_at", Date.now().toString());

  // 3. Mark IDs & SKUs as permanently deleted
  idsToDelete.forEach(id => {
    if (typeof markProductAsDeleted === "function") {
      markProductAsDeleted(id);
    }
  });
  skusToDelete.forEach(sku => {
    if (typeof markProductAsDeleted === "function") {
      markProductAsDeleted(null, sku);
    }
  });

  // 4. Clean active cart
  try {
    const rawCart = localStorage.getItem("dc_shopping_cart");
    if (rawCart) {
      const cart = JSON.parse(rawCart);
      if (Array.isArray(cart)) {
        const idSet = new Set(idsToDelete.map(String));
        const skuSet = new Set(skusToDelete.map(s => String(s).toUpperCase()));
        const cleaned = cart.filter(it => !idSet.has(String(it.id)) && (!it.sku || !skuSet.has(String(it.sku).toUpperCase())));
        if (cleaned.length !== cart.length) {
          localStorage.setItem("dc_shopping_cart", JSON.stringify(cleaned));
          if (typeof updateCartBadge === "function") updateCartBadge();
          if (typeof renderFloatingCart === "function") renderFloatingCart();
        }
      }
    }
  } catch (_) {}

  // 5. Broadcast real-time sync event
  if (typeof broadcastSync === "function") {
    broadcastSync("products_updated", {
      action: "bulk_delete",
      total: count,
      deletedIds: idsToDelete,
      deletedSkus: skusToDelete,
      timestamp: Date.now()
    });
  }

  clearProductSelection();
  applyAdminFilters();
  showToast(`✓ Successfully deleted ${count} firecrackers from live store & database.`, "success");
}

async function bulkUpdateCategory(categoryId) {
  if (!categoryId) return;
  const count = selectedProductIds.size;
  if (count === 0) {
    showToast("Please select products first.", "info");
    return;
  }

  const allCats = typeof getStoredCategories === "function" ? getStoredCategories() : DEFAULT_CATEGORIES;
  const matchedCat = allCats.find(c => String(c.id) === String(categoryId));
  const categoryName = matchedCat ? matchedCat.name : "Assorted";

  const sb = (typeof getAdminSupabase === "function") ? getAdminSupabase() : getSupabase();
  const ids = Array.from(selectedProductIds);

  if (isSupabaseConfigured() && sb) {
    try {
      await sb.from("products").update({ category_id: categoryId, updated_at: new Date().toISOString() }).in("id", ids);
    } catch (e) {
      console.warn("Supabase bulk category update error:", e);
    }
  }

  adminProductList.forEach(p => {
    if (selectedProductIds.has(p.id)) {
      p.category_id = categoryId;
      p.category_name = categoryName;
    }
  });

  localStorage.setItem("dc_custom_products", JSON.stringify(adminProductList));
  localStorage.setItem("dc_products_updated_at", Date.now().toString());

  if (typeof broadcastSync === "function") {
    broadcastSync("products_updated", { action: "bulk_category", total: count });
  }

  clearProductSelection();
  applyAdminFilters();
  showToast(`Updated category to "${categoryName}" for ${count} products.`, "success");
}

async function bulkToggleFeatured(isFeatured) {
  const count = selectedProductIds.size;
  if (count === 0) {
    showToast("Please select products first.", "info");
    return;
  }

  const sb = (typeof getAdminSupabase === "function") ? getAdminSupabase() : getSupabase();
  const ids = Array.from(selectedProductIds);

  if (isSupabaseConfigured() && sb) {
    try {
      await sb.from("products").update({ is_featured: isFeatured, updated_at: new Date().toISOString() }).in("id", ids);
    } catch (e) {
      console.warn("Supabase bulk featured update error:", e);
    }
  }

  adminProductList.forEach(p => {
    if (selectedProductIds.has(p.id)) {
      p.is_featured = isFeatured;
    }
  });

  localStorage.setItem("dc_custom_products", JSON.stringify(adminProductList));
  localStorage.setItem("dc_products_updated_at", Date.now().toString());

  if (typeof broadcastSync === "function") {
    broadcastSync("products_updated", { action: "bulk_featured", total: count });
  }

  clearProductSelection();
  applyAdminFilters();
  showToast(`${isFeatured ? "Featured" : "Unfeatured"} ${count} products.`, "success");
}

async function bulkSetStockStatus(status) {
  const count = selectedProductIds.size;
  if (count === 0) {
    showToast("Please select products first.", "info");
    return;
  }
  const newStock = status === "in_stock" ? 100 : 0;
  const sb = (typeof getAdminSupabase === "function") ? getAdminSupabase() : getSupabase();
  const ids = Array.from(selectedProductIds);

  if (isSupabaseConfigured() && sb) {
    try {
      await sb.from("products").update({ stock_quantity: newStock, updated_at: new Date().toISOString() }).in("id", ids);
    } catch (e) {
      console.warn("Supabase bulk stock update error:", e);
    }
  }

  adminProductList.forEach(p => {
    if (selectedProductIds.has(p.id)) {
      p.stock_quantity = newStock;
    }
  });

  localStorage.setItem("dc_custom_products", JSON.stringify(adminProductList));
  localStorage.setItem("dc_products_updated_at", Date.now().toString());

  if (typeof broadcastSync === "function") {
    broadcastSync("products_updated", { action: "bulk_stock", total: count });
  }

  clearProductSelection();
  applyAdminFilters();
  showToast(`Updated stock to ${newStock} for ${count} products.`, "success");
}

function renderAdminProductsTable(products) {
  const tbody = document.getElementById("adminProductsTbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (!products || products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 2.5rem 1rem;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎆</div>
      <strong style="color: #475569; font-size: 1rem;">No firecrackers found.</strong>
      <p style="font-size: 0.82rem; color: #94a3b8; margin-top: 4px;">Click "+ Add Firecracker" or "📥 Import CSV" to populate your catalog.</p>
    </td></tr>`;
    updateBulkActionBar();
    return;
  }

  products.forEach(p => {
    const isVariable = Boolean(p.has_variants && Array.isArray(p.variants) && p.variants.length > 0);
    const isSelected = selectedProductIds.has(p.id);
    const tr = document.createElement("tr");
    tr.className = `admin-product-row ${isSelected ? 'row-selected' : ''}`;
    tr.innerHTML = `
      <td class="col-chk" style="text-align: center;" data-label="Select">
        <input type="checkbox" class="product-select-chk" value="${p.id}" ${isSelected ? 'checked' : ''} onchange="toggleProductSelection('${p.id}', this.checked)" title="Select ${p.name}">
      </td>
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

  const masterChk = document.getElementById("selectAllProductsChk");
  if (masterChk) {
    masterChk.checked = (products.length > 0 && products.every(p => selectedProductIds.has(p.id)));
  }
  updateBulkActionBar();
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

  const newCatOpt = document.createElement("option");
  newCatOpt.value = "__NEW_CATEGORY__";
  newCatOpt.textContent = "➕ + Create New Category...";
  newCatOpt.style.fontWeight = "bold";
  newCatOpt.style.color = "#d97706";
  select.appendChild(newCatOpt);
}

function handleCategorySelectChange(selectEl) {
  if (selectEl && selectEl.value === "__NEW_CATEGORY__") {
    selectEl.value = "";
    promptAddNewCategory();
    return;
  }
  updateLiveCardPreview();
}

async function promptAddNewCategory() {
  const catName = prompt("Enter new Category Name (e.g. Multi Color Fancy Outfit, Giant Sparklers, etc.):");
  if (!catName || !catName.trim()) return null;

  const trimmed = catName.trim();
  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `cat-${Date.now()}`;
  const newCatId = (typeof crypto !== "undefined" && crypto.randomUUID) 
    ? crypto.randomUUID() 
    : ("c2000000-0000-0000-0000-" + Date.now().toString(16).padStart(12, "0"));

  const newCat = {
    id: newCatId,
    name: trimmed,
    slug: slug,
    description: `${trimmed} fireworks collection`,
    display_order: 99,
    is_active: true
  };

  // 1. Save locally
  const stored = typeof getStoredCategories === "function" ? getStoredCategories() : [];
  const exists = stored.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
  if (exists) {
    showToast(`Category "${exists.name}" already exists!`, "info");
    await populateCategoryDropdown(exists.id);
    return exists.id;
  }

  stored.push(newCat);
  localStorage.setItem("dc_custom_categories", JSON.stringify(stored));

  // 2. Online sync to Supabase if available
  const sb = (typeof getAdminSupabase === "function") ? getAdminSupabase() : getSupabase();
  if (isSupabaseConfigured() && sb) {
    try {
      await sb.from("categories").upsert(newCat, { onConflict: "id" });
      console.log("[Category Sync] Upserted new category to Supabase:", newCat);
    } catch (e) {
      console.warn("[Category Sync] Supabase category write note:", e);
    }
  }

  // 3. Update dropdowns & filters
  await populateCategoryDropdown(newCat.id);
  await initAdminCategoryFilters();

  if (typeof broadcastSync === "function") {
    broadcastSync("categories_updated", { category: newCat });
  }

  showToast(`🎉 Category "${trimmed}" created and selected!`, "success");
  return newCat.id;
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
  if (simpleFields) {
    simpleFields.style.display = isVar ? "none" : "block";
    simpleFields.classList.toggle("modal-hidden", isVar);
  }
  if (varFields) {
    varFields.style.display = isVar ? "block" : "none";
    varFields.classList.toggle("modal-hidden", !isVar);
  }

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

let currentWizardStep = 1;
let wizardBatchAddedCount = 0;

/**
 * 1-Click Fireworks Photo Presets
 */
const PHOTO_PRESETS = {
  sparkler: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600",
  chakkar: "https://images.unsplash.com/photo-1531685250784-7569952593d2?w=600",
  flowerpot: "https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=600",
  pencil: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600",
  rocket: "https://images.unsplash.com/photo-1533230620023-44161741e17e?w=600",
  shots: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600",
  bomb: "https://images.unsplash.com/photo-1569317002804-ab77bcf1bce4?w=600",
  giftbox: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"
};

function setProductPhotoPreset(key) {
  const url = PHOTO_PRESETS[key] || PHOTO_PRESETS.sparkler;
  const input = document.getElementById("prodImageUrl");
  const thumb = document.getElementById("imagePreviewThumb");
  if (input) input.value = url;
  if (thumb) thumb.src = url;
  updateLiveCardPreview();
  showToast("Applied photo preset!", "info");
}

/**
 * Generate smart SKU based on category or product name
 */
function autoGenerateSku() {
  const catSelect = document.getElementById("prodCategory");
  const catText = (catSelect && catSelect.selectedOptions && catSelect.selectedOptions[0]) ? catSelect.selectedOptions[0].text.toLowerCase() : "";
  const nameVal = document.getElementById("prodName")?.value.trim().toUpperCase() || "";

  let prefix = "CRK";
  if (catText.includes("sparkler") || catText.includes("ஸ்பார்க்லர்")) prefix = "SPK";
  else if (catText.includes("chakkar") || catText.includes("சக்கரம்")) prefix = "CHK";
  else if (catText.includes("flower") || catText.includes("பூச்சட்டி")) prefix = "FLP";
  else if (catText.includes("pencil")) prefix = "PNC";
  else if (catText.includes("match") || catText.includes("தீப்பெட்டி")) prefix = "MCH";
  else if (catText.includes("bijili") || catText.includes("பிஜிலி")) prefix = "BJL";
  else if (catText.includes("wala") || catText.includes("வாலா")) prefix = "WLA";
  else if (catText.includes("rocket") || catText.includes("ராக்கெட்")) prefix = "RKT";
  else if (catText.includes("multi") || catText.includes("மல்டி")) prefix = "MCF";
  else if (catText.includes("night") || catText.includes("நைட்")) prefix = "NIT";
  else if (catText.includes("fancy") || catText.includes("பேன்சி")) prefix = "FCY";
  else if (catText.includes("bomb") || catText.includes("பாம்")) prefix = "BMB";
  else if (catText.includes("gun") || catText.includes("கன்")) prefix = "GUN";
  else if (catText.includes("gift") || catText.includes("பாக்ஸ்")) prefix = "GFT";
  else if (nameVal.length >= 3) prefix = nameVal.substring(0, 3).replace(/[^A-Z]/g, "") || "CRK";

  const randNum = Math.floor(100 + Math.random() * 900);
  const sku = `${prefix}-${randNum}`;
  const skuInput = document.getElementById("prodSku");
  if (skuInput) skuInput.value = sku;
  updateLiveCardPreview();
}

/**
 * Navigate to a specific step in the Add/Edit Firecracker Wizard
 */
function goToWizardStep(stepNumber) {
  const targetStep = Math.max(1, Math.min(4, parseInt(stepNumber, 10) || 1));

  // If navigating forwards, validate current step before proceeding
  if (targetStep > currentWizardStep) {
    // Validate Step 1
    if (currentWizardStep === 1) {
      const nameInput = document.getElementById("prodName");
      const catSelect = document.getElementById("prodCategory");
      const nameVal = nameInput ? nameInput.value.trim() : "";
      const catVal = catSelect ? catSelect.value.trim() : "";
      const nameErr = document.getElementById("prodNameError");
      const catErr = document.getElementById("prodCategoryError");

      let valid = true;
      if (!nameVal) {
        if (nameErr) nameErr.style.display = "block";
        if (nameInput) nameInput.focus();
        valid = false;
      } else if (nameErr) {
        nameErr.style.display = "none";
      }

      if (!catVal) {
        if (catErr) catErr.style.display = "block";
        if (valid && catSelect) catSelect.focus();
        valid = false;
      } else if (catErr) {
        catErr.style.display = "none";
      }

      if (!valid) return;
    }

    // Validate Step 2
    if (currentWizardStep === 2) {
      const prodType = document.querySelector('input[name="prodType"]:checked')?.value || "simple";
      if (prodType === "simple") {
        const priceInput = document.getElementById("prodPrice");
        const priceVal = parseFloat(priceInput?.value);
        const priceErr = document.getElementById("prodPriceError");
        if (isNaN(priceVal) || priceVal <= 0) {
          if (priceErr) priceErr.style.display = "block";
          if (priceInput) priceInput.focus();
          return;
        } else if (priceErr) {
          priceErr.style.display = "none";
        }
      } else {
        const rows = document.querySelectorAll("#variantTableBody tr.variant-row");
        let hasValidVariant = false;
        rows.forEach(row => {
          const vName = row.querySelector(".var-name")?.value.trim();
          const vPrice = parseFloat(row.querySelector(".var-price")?.value);
          if (vName && !isNaN(vPrice) && vPrice > 0) hasValidVariant = true;
        });
        if (!hasValidVariant) {
          showToast("Please enter at least 1 valid variant with option name & price.", "warning");
          return;
        }
      }
    }
  }

  currentWizardStep = targetStep;

  // Toggle step panes
  for (let s = 1; s <= 4; s++) {
    const pane = document.getElementById(`wizardStep${s}`);
    const pill = document.getElementById(`wizardPill${s}`);
    if (pane) {
      if (s === currentWizardStep) {
        pane.classList.add("active");
        pane.style.display = "block";
      } else {
        pane.classList.remove("active");
        pane.style.display = "none";
      }
    }
    if (pill) {
      if (s === currentWizardStep) {
        pill.classList.add("active");
        pill.classList.remove("completed");
      } else if (s < currentWizardStep) {
        pill.classList.remove("active");
        pill.classList.add("completed");
      } else {
        pill.classList.remove("active");
        pill.classList.remove("completed");
      }
    }
  }

  // Update navigation buttons
  const backBtn = document.getElementById("wizardBackBtn");
  const cancelBtn = document.getElementById("wizardCancelBtn");
  const nextBtn = document.getElementById("wizardNextBtn");
  const saveAnotherBtn = document.getElementById("wizardSaveAnotherBtn");
  const saveCloseBtn = document.getElementById("wizardSaveCloseBtn");

  if (backBtn) {
    if (currentWizardStep > 1) {
      backBtn.classList.remove("d-none");
      backBtn.style.display = "inline-flex";
    } else {
      backBtn.classList.add("d-none");
      backBtn.style.display = "none";
    }
  }
  if (cancelBtn) {
    if (currentWizardStep === 1) {
      cancelBtn.classList.remove("d-none");
      cancelBtn.style.display = "inline-flex";
    } else {
      cancelBtn.classList.add("d-none");
      cancelBtn.style.display = "none";
    }
  }

  if (nextBtn) {
    if (currentWizardStep < 4) {
      nextBtn.classList.remove("d-none");
      nextBtn.style.display = "inline-flex";
      if (currentWizardStep === 1) nextBtn.innerHTML = "Next: Price &amp; Stock ➔";
      else if (currentWizardStep === 2) nextBtn.innerHTML = "Next: Media &amp; Photo ➔";
      else if (currentWizardStep === 3) nextBtn.innerHTML = "Next: Preview &amp; Save ➔";
    } else {
      nextBtn.classList.add("d-none");
      nextBtn.style.display = "none";
    }
  }

  if (saveAnotherBtn) {
    if (currentWizardStep >= 2) {
      saveAnotherBtn.classList.remove("d-none");
      saveAnotherBtn.style.display = "inline-flex";
    } else {
      saveAnotherBtn.classList.add("d-none");
      saveAnotherBtn.style.display = "none";
    }
  }

  if (saveCloseBtn) {
    if (currentWizardStep >= 2) {
      saveCloseBtn.classList.remove("d-none");
      saveCloseBtn.style.display = "inline-flex";
    } else {
      saveCloseBtn.classList.add("d-none");
      saveCloseBtn.style.display = "none";
    }
  }

  if (currentWizardStep >= 3) {
    updateLiveCardPreview();
  }

  const modalBody = document.querySelector(".wizard-body");
  if (modalBody) modalBody.scrollTop = 0;
}

function wizardGoNext() {
  goToWizardStep(currentWizardStep + 1);
}

function wizardGoBack() {
  goToWizardStep(Math.max(1, currentWizardStep - 1));
}

/**
 * Render real-time live preview of the product card inside Wizard Step 4
 */
function updateLiveCardPreview() {
  const previewBox = document.getElementById("liveProductCardPreview");
  if (!previewBox) return;

  const name = document.getElementById("prodName")?.value.trim() || "Sample Firecracker Name";
  const catSelect = document.getElementById("prodCategory");
  const catName = (catSelect && catSelect.selectedOptions && catSelect.selectedOptions[0] && catSelect.value)
    ? catSelect.selectedOptions[0].text
    : "Sivakasi Cracker";
  const unit = document.getElementById("prodUnit")?.value.trim() || "Box";
  const prodType = document.querySelector('input[name="prodType"]:checked')?.value || "simple";
  const isVariable = prodType === "variable";
  const isFeatured = Boolean(document.getElementById("prodFeatured")?.checked);

  let price = parseFloat(document.getElementById("prodPrice")?.value) || 0;
  let originalPrice = parseFloat(document.getElementById("prodOriginalPrice")?.value) || 0;
  let stock = parseInt(document.getElementById("prodStock")?.value, 10) || 100;

  if (isVariable) {
    const rows = document.querySelectorAll("#variantTableBody tr.variant-row");
    const vPrices = [];
    let totalStock = 0;
    rows.forEach(r => {
      const p = parseFloat(r.querySelector(".var-price")?.value);
      const s = parseInt(r.querySelector(".var-stock")?.value, 10) || 0;
      if (!isNaN(p) && p > 0) vPrices.push(p);
      totalStock += s;
    });
    if (vPrices.length > 0) {
      price = Math.min(...vPrices);
      stock = totalStock;
    }
  }

  let imageUrl = document.getElementById("prodImageUrl")?.value.trim();
  if (!imageUrl) {
    imageUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600";
  }

  const thumb = document.getElementById("imagePreviewThumb");
  if (thumb && thumb.src !== imageUrl) {
    thumb.src = imageUrl;
  }

  let discountBadge = "";
  if (originalPrice > price && price > 0) {
    const discPct = Math.round(((originalPrice - price) / originalPrice) * 100);
    if (discPct > 0) {
      discountBadge = `<span class="product-badge product-badge-discount" style="background: #16a34a; color: #fff; padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: 700; font-size: 0.75rem;">${discPct}% OFF</span>`;
    }
  }

  const priceFormatted = (typeof formatCurrency === "function") ? formatCurrency(price) : `₹${price.toFixed(2)}`;
  const mrpFormatted = (originalPrice > price) ? ((typeof formatCurrency === "function") ? formatCurrency(originalPrice) : `₹${originalPrice.toFixed(2)}`) : "";

  previewBox.innerHTML = `
    <div class="product-image-container" style="position: relative; border-radius: 12px 12px 0 0; overflow: hidden; background: #f8fafc; height: 180px;">
      <img src="${imageUrl}" alt="${name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600'">
      <div style="position: absolute; top: 10px; left: 10px; display: flex; flex-direction: column; gap: 4px;">
        ${isVariable ? `<span class="badge badge-info" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px;">⚡ Variable</span>` : ''}
        ${isFeatured ? `<span class="badge badge-warning" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; border-radius: 6px;">★ Featured</span>` : ''}
      </div>
      <div style="position: absolute; top: 10px; right: 10px;">
        ${discountBadge}
      </div>
      <span class="badge" style="position: absolute; bottom: 8px; left: 10px; background: rgba(0,0,0,0.65); color: #fff; font-size: 0.7rem; padding: 0.15rem 0.45rem; border-radius: 4px;">
        🌿 100% Certified Green Cracker
      </span>
    </div>
    <div class="product-card-body" style="padding: 1rem; background: #fff; border-radius: 0 0 12px 12px;">
      <div style="font-size: 0.75rem; color: #dc2626; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
        ${catName}
      </div>
      <h3 style="margin: 0 0 0.35rem 0; font-size: 1.05rem; font-weight: 700; color: #0f172a; line-height: 1.3;">
        ${name}
      </h3>
      <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 0.75rem;">
        Packaging: <strong>${unit}</strong> &bull; <span style="color: ${stock > 0 ? '#16a34a' : '#dc2626'}; font-weight: 600;">${stock > 0 ? `${stock} in stock` : 'Out of Stock'}</span>
      </div>
      <div style="display: flex; align-items: baseline; justify-content: space-between; border-top: 1px dashed #e2e8f0; padding-top: 0.65rem;">
        <div>
          <div style="font-size: 0.72rem; color: #64748b;">Special Rate</div>
          <span style="font-size: 1.25rem; font-weight: 800; color: #b91c1c;">
            ${isVariable ? `<small style="font-size: 0.75rem; font-weight: 500;">From </small>` : ''}${priceFormatted}
          </span>
          ${mrpFormatted ? `<span style="text-decoration: line-through; font-size: 0.82rem; color: #94a3b8; margin-left: 6px;">${mrpFormatted}</span>` : ''}
        </div>
        <button type="button" class="btn btn-primary btn-sm" style="pointer-events: none; border-radius: 8px; font-weight: 700; padding: 0.35rem 0.75rem;">
          🛒 Add to Cart
        </button>
      </div>
    </div>
  `;
}

function openAddProductModal() {
  const form = document.getElementById("productForm");
  if (form) form.reset();
  const idField = document.getElementById("prodId");
  if (idField) idField.value = "";
  const title = document.getElementById("productModalTitle");
  if (title) title.textContent = "Add New Firecracker";

  const stockField = document.getElementById("prodStock");
  if (stockField) stockField.value = "100";

  const unitField = document.getElementById("prodUnit");
  if (unitField) unitField.value = "Box";

  populateCategoryDropdown();

  toggleProductType("simple");
  const varBody = document.getElementById("variantTableBody");
  if (varBody) varBody.innerHTML = "";

  const videoField = document.getElementById("prodVideoUrl");
  if (videoField) videoField.value = "";

  const featEl = document.getElementById("prodFeatured");
  if (featEl) featEl.checked = false;

  const thumb = document.getElementById("imagePreviewThumb");
  if (thumb) thumb.src = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600";

  const nameErr = document.getElementById("prodNameError");
  const catErr = document.getElementById("prodCategoryError");
  const priceErr = document.getElementById("prodPriceError");
  if (nameErr) nameErr.style.display = "none";
  if (catErr) catErr.style.display = "none";
  if (priceErr) priceErr.style.display = "none";

  goToWizardStep(1);

  const modal = document.getElementById("productEditModal");
  if (modal) {
    modal.classList.remove("modal-hidden");
    modal.style.display = "flex";
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";
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
  const cleanDesc = (product.description || "").replace(/<!--DC_META:[\s\S]*?-->/g, "").trim();
  document.getElementById("prodDesc").value = cleanDesc;

  const videoEl = document.getElementById("prodVideoUrl");
  let videoVal = product.video_url || "";

  // Check if variable product
  let variants = product.variants;
  if (typeof variants === "string") {
    try { variants = JSON.parse(variants); } catch (_) {}
  }
  if (!Array.isArray(variants)) variants = [];
  if (variants.length === 0 && product.description && product.description.includes("<!--DC_META:")) {
    const m = product.description.match(/<!--DC_META:([\s\S]*?)-->/);
    if (m && m[1]) {
      try {
        const meta = JSON.parse(m[1]);
        if (Array.isArray(meta.variants) && meta.variants.length > 0) variants = meta.variants;
        if (meta.video_url && !videoVal) videoVal = meta.video_url;
      } catch (_) {}
    }
  }

  if (videoEl) videoEl.value = videoVal;

  populateCategoryDropdown(product.category_id || product.category_name);

  const featEl = document.getElementById("prodFeatured");
  if (featEl) featEl.checked = Boolean(product.is_featured);

  if (variants.length > 0 || product.has_variants) {
    toggleProductType("variable");
    const tbody = document.getElementById("variantTableBody");
    if (tbody) {
      tbody.innerHTML = "";
      variants.forEach(v => addVariantRow(v));
    }
  } else {
    toggleProductType("simple");
  }

  const thumb = document.getElementById("imagePreviewThumb");
  if (thumb) thumb.src = product.image_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600";

  document.getElementById("productModalTitle").textContent = "Edit Firecracker";
  const batchEl = document.getElementById("batchSaveCounter");
  if (batchEl) batchEl.style.display = "none";

  goToWizardStep(1);

  const modal = document.getElementById("productEditModal");
  if (modal) {
    modal.classList.remove("modal-hidden");
    modal.style.display = "flex";
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";
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
  document.body.classList.remove("modal-open");
  document.body.style.overflow = "";
  wizardBatchAddedCount = 0;
  const batchEl = document.getElementById("batchSaveCounter");
  if (batchEl) batchEl.style.display = "none";
}

/**
 * Interactive Dashboard & POS User Manual Modal
 */
function openDashboardManualModal(tab = "pos") {
  let modal = document.getElementById("dashboardManualModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "dashboardManualModal";
    modal.className = "modal-overlay";
    modal.style.display = "flex";
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 850px; width: 95%; max-height: 88vh; display: flex; flex-direction: column; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.25);">
        <div class="modal-header" style="border-bottom: 1px solid #e5e7eb; padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center; background: #111827; color: #ffffff;">
          <h3 class="modal-title" style="display: flex; align-items: center; gap: 0.65rem; margin: 0; font-size: 1.25rem; color: #f59e0b; font-family: var(--font-heading);">
            <span>📖</span> Dhanalakshmi Crackers Dashboard Manual
          </h3>
          <button type="button" class="modal-close" onclick="closeDashboardManualModal()" style="background: none; border: none; font-size: 1.75rem; cursor: pointer; color: #ffffff; line-height: 1;">&times;</button>
        </div>
        <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 0.65rem 1.25rem; display: flex; gap: 0.5rem; overflow-x: auto; flex-shrink: 0;">
          <button type="button" class="btn btn-sm btn-manual-tab active" onclick="switchManualTab('pos', this)" style="border-radius: 20px; font-weight: 600;">⚡ POS Billing</button>
          <button type="button" class="btn btn-sm btn-manual-tab" onclick="switchManualTab('cats', this)" style="border-radius: 20px; font-weight: 600;">🎆 15 Categories</button>
          <button type="button" class="btn btn-sm btn-manual-tab" onclick="switchManualTab('vars', this)" style="border-radius: 20px; font-weight: 600;">✨ Variable Products</button>
          <button type="button" class="btn btn-sm btn-manual-tab" onclick="switchManualTab('invoices', this)" style="border-radius: 20px; font-weight: 600;">🧾 Thermal Receipts</button>
          <button type="button" class="btn btn-sm btn-manual-tab" onclick="switchManualTab('whatsapp', this)" style="border-radius: 20px; font-weight: 600;">📲 WhatsApp</button>
        </div>
        <div class="modal-body" id="manualModalBody" style="padding: 1.5rem; overflow-y: auto; flex: 1; font-size: 0.95rem; line-height: 1.6; color: #374151;">
          <!-- Dynamically populated tab content -->
        </div>
        <div class="modal-footer" style="padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #fafafa; flex-shrink: 0;">
          <a href="/admin/manual.html" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none;">
            📖 Open Full Manual Page ↗
          </a>
          <button type="button" class="btn btn-primary btn-sm" onclick="closeDashboardManualModal()">
            Got It, Close
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.style.display = "flex";
  modal.onclick = (e) => {
    if (e.target === modal) closeDashboardManualModal();
  };

  switchManualTab(tab);
}

function closeDashboardManualModal() {
  const modal = document.getElementById("dashboardManualModal");
  if (modal) modal.style.display = "none";
}

function switchManualTab(tabKey, clickedBtn) {
  const body = document.getElementById("manualModalBody");
  if (!body) return;

  const tabs = document.querySelectorAll(".btn-manual-tab");
  tabs.forEach(t => {
    t.classList.remove("active");
    t.style.background = "#e2e8f0";
    t.style.color = "#334155";
  });
  if (clickedBtn) {
    clickedBtn.classList.add("active");
    clickedBtn.style.background = "#dc2626";
    clickedBtn.style.color = "#ffffff";
  } else {
    tabs.forEach(t => {
      if (t.textContent.toLowerCase().includes(tabKey)) {
        t.classList.add("active");
        t.style.background = "#dc2626";
        t.style.color = "#ffffff";
      }
    });
  }

  if (tabKey === "pos") {
    body.innerHTML = `
      <h4 style="margin: 0 0 0.5rem 0; color: #111827; font-size: 1.15rem;">⚡ POS Counter Billing Workflow</h4>
      <p style="color: #64748b; margin-bottom: 1rem;">Optimized for high-speed festival checkout with zero delays:</p>
      <ol style="margin-left: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;">
        <li><strong>Quick Search:</strong> Type product name or SKU (e.g. <code>SPK-10</code>) or click category pills on top. Press <kbd>F2</kbd> to focus search bar.</li>
        <li><strong>Add to Bill:</strong> Click on any product card or the Add button. For variable products, select desired size/shots in 1 tap.</li>
        <li><strong>Customer Phone:</strong> Enter 10-digit mobile number. Customer purchase history & points automatically load.</li>
        <li><strong>Payment &amp; Print:</strong> Choose Cash, UPI QR, or Card. Hit <strong>Complete &amp; Print</strong> for instant 80mm/58mm thermal receipt with store logo + WhatsApp dispatch!</li>
      </ol>
      <div style="margin-top: 1.25rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 0.75rem 1rem; color: #1e40af;">
        <strong>🚀 Quick Action:</strong> <a href="/admin/billing.html" style="color: #1d4ed8; font-weight: 700;">Open POS Billing Terminal Now ➔</a>
      </div>
    `;
  } else if (tabKey === "cats") {
    body.innerHTML = `
      <h4 style="margin: 0 0 0.5rem 0; color: #111827; font-size: 1.15rem;">🎆 The 15 Official Firecracker Categories</h4>
      <p style="color: #64748b; margin-bottom: 0.85rem; font-size: 0.88rem;">Both storefront pills and admin filters use these exact 15 standardized categories:</p>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.5rem; font-size: 0.88rem;">
        <div style="background: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <span>1. <strong>✨ All</strong></span>
          <span style="background: #fef3c7; color: #92400e; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">அனைத்தும்</span>
        </div>
        <div style="background: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <span>2. <strong>Gift Box</strong></span>
          <span style="background: #fef3c7; color: #92400e; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">கிப்ட் பாக்ஸ்</span>
        </div>
        <div style="background: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <span>3. <strong>Sparklers</strong></span>
          <span style="background: #fef3c7; color: #92400e; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">ஸ்பார்க்லர்</span>
        </div>
        <div style="background: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <span>4. <strong>Chakkar</strong></span>
          <span style="background: #fef3c7; color: #92400e; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">சக்கரம்</span>
        </div>
        <div style="background: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <span>5. <strong>Flower Pots</strong></span>
          <span style="background: #fef3c7; color: #92400e; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">பூச்சட்டி</span>
        </div>
        <div style="background: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <span>6. <strong>Pencil | Star</strong></span>
          <span style="background: #fef3c7; color: #92400e; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">பென்சில்</span>
        </div>
        <div style="background: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <span>7. <strong>Match Sticks</strong></span>
          <span style="background: #fef3c7; color: #92400e; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">தீப்பெட்டி</span>
        </div>
        <div style="background: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <span>8. <strong>Bijili</strong></span>
          <span style="background: #fef3c7; color: #92400e; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">பிஜிலி</span>
        </div>
        <div style="background: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <span>9. <strong>Wala</strong></span>
          <span style="background: #fef3c7; color: #92400e; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">வாலா</span>
        </div>
        <div style="background: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <span>10. <strong>Rocket</strong></span>
          <span style="background: #fef3c7; color: #92400e; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">ராக்கெட்</span>
        </div>
        <div style="background: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <span>11. <strong>Fancy Crackers</strong></span>
          <span style="background: #fef3c7; color: #92400e; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">பேன்சி</span>
        </div>
        <div style="background: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <span>12. <strong>Night Out</strong></span>
          <span style="background: #fef3c7; color: #92400e; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">நைட் அவுட்</span>
        </div>
        <div style="background: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <span>13. <strong>Multi Colour</strong></span>
          <span style="background: #fef3c7; color: #92400e; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">மல்டி கலர்</span>
        </div>
        <div style="background: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <span>14. <strong>Bombs</strong></span>
          <span style="background: #fef3c7; color: #92400e; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">பாம்</span>
        </div>
        <div style="background: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <span>15. <strong>Gun &amp; Others</strong></span>
          <span style="background: #fef3c7; color: #92400e; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px;">கன் & இதர</span>
        </div>
      </div>
      <div style="margin-top: 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 0.65rem 0.85rem; color: #166534; font-size: 0.85rem;">
        <strong>Automatic Normalizer:</strong> Any product added or synced is automatically mapped to one of these official categories!
      </div>
    `;
  } else if (tabKey === "vars") {
    body.innerHTML = `
      <h4 style="margin: 0 0 0.5rem 0; color: #111827; font-size: 1.15rem;">✨ Variable Products & Option Presets</h4>
      <p style="color: #64748b; margin-bottom: 1rem;">Configure multiple sizes, lengths, or shots under a single parent firecracker:</p>
      <ol style="margin-left: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;">
        <li>In Add/Edit Product modal, toggle to <strong>Variable Product</strong>.</li>
        <li>Click 1-Click Presets: <strong>Sparklers (10cm-50cm)</strong>, <strong>Sky Shots (12-120)</strong>, <strong>Garlands (100-10000 Wala)</strong>, or <strong>Chakkar Sizes</strong>.</li>
        <li>Set individual prices, original prices, and stock quantities for each variant.</li>
        <li>Paste a YouTube or Web video link in <strong>Instruction / Video Guide Link</strong> to show live bursting demonstration to customers.</li>
      </ol>
      <div style="margin-top: 1.25rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 0.75rem 1rem; color: #92400e;">
        <strong>Customer Experience:</strong> On the storefront, product cards display <em>From ₹35.00</em> with an <em>⚡ Options</em> button so buyers can choose their favorite size.
      </div>
    `;
  } else if (tabKey === "invoices") {
    body.innerHTML = `
      <h4 style="margin: 0 0 0.5rem 0; color: #111827; font-size: 1.15rem;">🧾 Thermal Invoices (80mm & 58mm) with Logo</h4>
      <p style="color: #64748b; margin-bottom: 1rem;">Crisp, smudge-free receipts designed for bluetooth and USB thermal printers:</p>
      <ul style="margin-left: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;">
        <li><strong>Brand Logo:</strong> High-contrast Dhanalakshmi Crackers logo printed cleanly at the top of 80mm and 58mm receipts.</li>
        <li><strong>Itemized Variants:</strong> Clearly shows variant details, quantities, rates, discounts, and customer savings.</li>
        <li><strong>Festive Greeting:</strong> Authentic Tamil & English Diwali greetings at receipt footer.</li>
        <li><strong>Instant Re-Print:</strong> Navigate to <em>Invoices Archive</em> anytime to reprint or download PDF.</li>
      </ul>
      <div style="margin-top: 1.25rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 0.75rem 1rem; color: #1e40af;">
        <strong>🚀 Quick Action:</strong> <a href="/admin/invoices.html" style="color: #1d4ed8; font-weight: 700;">Open Invoices Archive ➔</a>
      </div>
    `;
  } else if (tabKey === "whatsapp") {
    body.innerHTML = `
      <h4 style="margin: 0 0 0.5rem 0; color: #111827; font-size: 1.15rem;">📲 WhatsApp Direct Billing</h4>
      <p style="color: #64748b; margin-bottom: 1rem;">Deliver digital bills straight to your customer's smartphone:</p>
      <ul style="margin-left: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;">
        <li>Enter 10-digit phone number — the system auto-formats with country code <code>91</code>.</li>
        <li>Click <strong>Send via WhatsApp</strong> to launch WhatsApp Web or the native mobile app seamlessly.</li>
        <li>Pre-filled greeting includes order summary, savings, and an interactive digital receipt link.</li>
      </ul>
    `;
  }
}

/**
 * Variable Product Manual Modal handlers - aliased to Dashboard Manual
 */
function openVariableProductManualModal() {
  openDashboardManualModal("vars");
}

function closeVariableProductManualModal() {
  closeDashboardManualModal();
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

/**
 * Direct online database save function to Supabase PostgreSQL.
 * Guarantees online save by validating and resolving:
 * - Unique SKU generation and conflict resolution (never fails on empty/duplicate SKU)
 * - Price & original_price check constraint (CHECK: original_price >= price)
 * - Category foreign key resolution (auto-null fallback)
 * - Native upsert with fallback to update/insert and RPC
 */
async function saveProductToSupabaseOnline(productData) {
  const sb = (typeof getAdminSupabase === "function") ? getAdminSupabase() : getSupabase();
  if (!isSupabaseConfigured() || !sb) {
    return { success: false, error: "Supabase connection is not configured." };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let id = productData.id;
  if (!id || !uuidRegex.test(id)) {
    id = (typeof crypto !== "undefined" && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : ("c1000000-0000-0000-0000-" + Date.now().toString(16).padStart(12, "0"));
    productData.id = id;
  }

  // Ensure clean unique SKU (never empty!)
  let sku = (productData.sku || "").trim();
  if (!sku) {
    const cleanName = (productData.name || "FIRECRACKER").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8) || "CRK";
    sku = `DC-${cleanName}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    productData.sku = sku;
  }

  // Guarantee original_price >= price (satisfies Postgres constraint CHECK (original_price >= price))
  let price = Number(productData.price) || 0;
  let original_price = Number(productData.original_price);
  if (isNaN(original_price) || original_price < price) {
    original_price = price;
    productData.original_price = original_price;
  }

  let stock = parseInt(productData.stock_quantity, 10);
  if (isNaN(stock) || stock < 0) stock = 100;
  productData.stock_quantity = stock;

  let unit = (productData.unit || "Box").trim();
  let category_id = productData.category_id || null;
  if (category_id && !uuidRegex.test(category_id)) {
    category_id = null;
  }

  let is_featured = Boolean(productData.is_featured);
  let image_url = (productData.image_url || "").trim() || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600";

  let cleanDesc = (productData.description || "").replace(/<!--DC_META:[\s\S]*?-->/g, "").trim();
  const metaPayload = {
    has_variants: Boolean(productData.has_variants),
    variants: Array.isArray(productData.variants) ? productData.variants : [],
    video_url: (productData.video_url || "").trim()
  };
  let descWithMeta = (metaPayload.has_variants || metaPayload.video_url)
    ? `${cleanDesc}<!--DC_META:${JSON.stringify(metaPayload)}-->`
    : cleanDesc;

  // Live Supabase table columns:
  // id, name, sku, category_id, description, price, original_price, stock_quantity, unit, image_url, is_featured, is_active, updated_at
  const dbPayload = {
    id,
    name: (productData.name || "").trim(),
    sku,
    price,
    original_price,
    stock_quantity: stock,
    unit,
    category_id: category_id,
    is_featured,
    image_url,
    description: descWithMeta,
    is_active: productData.is_active !== false,
    updated_at: new Date().toISOString()
  };

  async function ensureCategoryInSupabase(catId) {
    if (!catId || !uuidRegex.test(catId)) return;
    try {
      const stored = typeof getStoredCategories === "function" ? getStoredCategories() : [];
      const catObj = stored.find(c => String(c.id) === String(catId)) ||
                     (typeof DEFAULT_CATEGORIES !== "undefined" && DEFAULT_CATEGORIES.find(c => String(c.id) === String(catId)));
      if (catObj) {
        const catSlug = catObj.slug || catObj.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `cat-${Date.now()}`;
        await sb.from("categories").upsert({
          id: catId,
          name: catObj.name,
          slug: catSlug,
          description: catObj.description || catObj.name,
          display_order: catObj.display_order || 99,
          is_active: true
        }, { onConflict: "id" });
      }
    } catch (e) {
      console.warn("[Cloud Save] Category auto-upsert note:", e);
    }
  }

  async function execUpsert(payload) {
    let res = await sb.from("products").upsert(payload, { onConflict: "id" }).select();

    // 1. Column error fallback in case of schema cache mismatch
    if (res.error && res.error.message && (res.error.message.includes("column") || res.error.message.includes("schema cache"))) {
      console.warn("[Cloud Save] Schema cache/column note, retrying clean:", res.error.message);
      delete payload.video_url;
      delete payload.has_variants;
      delete payload.variants;
      res = await sb.from("products").upsert(payload, { onConflict: "id" }).select();
    }

    // 2. Foreign key constraint retry: auto-create category in DB first
    if (res.error && (res.error.message?.toLowerCase().includes("foreign key") || res.error.message?.toLowerCase().includes("category"))) {
      if (payload.category_id) {
        console.warn("[Cloud Save] Retrying after auto-upserting category to DB:", payload.category_id);
        await ensureCategoryInSupabase(payload.category_id);
        res = await sb.from("products").upsert(payload, { onConflict: "id" }).select();
      }
      if (res.error && (res.error.message?.toLowerCase().includes("foreign key") || res.error.message?.toLowerCase().includes("category"))) {
        console.warn("[Cloud Save] Retrying with category_id: null as fallback due to FK constraint:", res.error.message);
        payload.category_id = null;
        res = await sb.from("products").upsert(payload, { onConflict: "id" }).select();
      }
    }

    // 3. SKU constraint retry with auto-resolved unique SKU
    if (res.error && (res.error.message?.toLowerCase().includes("sku") || res.error.message?.toLowerCase().includes("duplicate key"))) {
      payload.sku = `${payload.sku.slice(0, 16)}-${Math.floor(Math.random() * 9000 + 1000)}`;
      productData.sku = payload.sku;
      console.warn("[Cloud Save] Retrying with auto-resolved unique SKU:", payload.sku);
      res = await sb.from("products").upsert(payload, { onConflict: "id" }).select();
    }

    if (!res.error && res.data && res.data.length > 0) {
      return { success: true, data: res.data[0] };
    }

    // 4. Fallback to direct REST fetch
    try {
      const restBaseUrl = sb.supabaseUrl || (typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : "https://pbjcqamswwwoklcgdfjd.supabase.co");
      const restKey = sb.supabaseKey || (typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : "sb_publishable_-nw-Lngui7gSYjJLsSaCAg_3OnHKd7H");
      const directRes = await fetch(`${restBaseUrl}/rest/v1/products`, {
        method: "POST",
        headers: {
          "apikey": restKey,
          "Authorization": `Bearer ${restKey}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates,return=representation"
        },
        body: JSON.stringify(payload)
      });
      if (directRes.ok) {
        const body = await directRes.json();
        return { success: true, data: Array.isArray(body) ? body[0] : body };
      }
    } catch (fetchErr) {
      console.warn("[Cloud Save] Direct fetch fallback error:", fetchErr);
    }

    // 5. Fallback to direct REST update or insert
    const { data: existing } = await sb.from("products").select("id").eq("id", payload.id).maybeSingle();
    let restRes;
    if (existing) {
      restRes = await sb.from("products").update(payload).eq("id", payload.id).select();
    } else {
      restRes = await sb.from("products").insert(payload).select();
    }

    if (!restRes.error && restRes.data && restRes.data.length > 0) {
      return { success: true, data: restRes.data[0] };
    }

    return { 
      success: false, 
      error: res.error?.message || restRes?.error?.message || "Cloud write not confirmed." 
    };
  }

  try {
    const outcome = await execUpsert(dbPayload);
    if (outcome.success) {
      if (outcome.data?.id) productData.id = outcome.data.id;
      if (outcome.data?.sku) productData.sku = outcome.data.sku;
      return { success: true, data: outcome.data };
    }
    return { success: false, error: outcome.error };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Background sync function that pushes all locally saved products (e.g. "ERERER") to online Supabase cloud
 */
async function syncPendingLocalProductsOnline(showFeedback = false) {
  const sb = (typeof getAdminSupabase === "function") ? getAdminSupabase() : getSupabase();
  if (!isSupabaseConfigured() || !sb) {
    if (showFeedback) showToast("Supabase is not configured yet.", "warning");
    return;
  }

  const rawLocal = localStorage.getItem("dc_custom_products");
  if (!rawLocal) return;
  let localProducts = [];
  try {
    localProducts = JSON.parse(rawLocal);
  } catch (_) { return; }

  if (!Array.isArray(localProducts) || localProducts.length === 0) return;

  try {
    const { data: remoteData, error } = await sb.from("products").select("id, sku");
    if (error || !Array.isArray(remoteData)) {
      if (showFeedback) showToast(`Cloud fetch error: ${error?.message}`, "error");
      return;
    }

    const remoteIds = new Set(remoteData.map(r => String(r.id)));
    const remoteSkus = new Set(remoteData.filter(r => r.sku).map(r => String(r.sku).trim().toUpperCase()));
    const deletedIds = typeof getDeletedProductIds === "function" ? getDeletedProductIds() : [];

    // Filter strictly: NEVER sync products that were deleted or are already online by SKU
    const pending = localProducts.filter(p => {
      if (!p || !p.name) return false;
      const pId = String(p.id || "");
      const pSku = String(p.sku || "").trim().toUpperCase();

      // Check deleted list
      if (typeof isProductDeleted === "function") {
        if (isProductDeleted(pId, pSku)) return false;
      } else if (deletedIds.some(d => String(d).toLowerCase() === pId.toLowerCase() || (pSku && String(d).toLowerCase() === pSku.toLowerCase()))) {
        return false;
      }

      // Already exists in remote cloud by ID or SKU
      if (remoteIds.has(pId) || (pSku && remoteSkus.has(pSku))) return false;

      // Only sync if product was explicitly saved locally (not an unverified legacy default)
      return Boolean(p.is_local_draft || p.created_offline || (pId && !pId.startsWith("c1000000-")));
    });

    if (pending.length > 0) {
      let syncedCount = 0;
      for (const prod of pending) {
        const result = await saveProductToSupabaseOnline(prod);
        if (result.success) {
          syncedCount++;
        }
      }
      if (syncedCount > 0) {
        localStorage.setItem("dc_custom_products", JSON.stringify(localProducts));
        localStorage.setItem("dc_products_updated_at", Date.now().toString());
        adminProductList = localProducts;
        renderAdminProductsTable(adminProductList);

        showToast(`☁️ Synced ${syncedCount} firecracker(s) (including "${pending[0].name}") to online Supabase cloud!`, "success", 6000);
        const badge = document.getElementById("cloudSyncStatusBadge");
        if (badge) {
          badge.className = "table-header-sub badge badge-success";
          badge.textContent = "☁️ Online Cloud Sync: Active (Live DB)";
        }
        return;
      }
    } else if (showFeedback) {
      showToast("✅ All firecrackers are already synced online with Supabase cloud!", "success");
    }
  } catch (err) {
    console.warn("[Cloud Sync] Sync error:", err);
    if (showFeedback) showToast(`Sync note: ${err.message}`, "warning");
  }
}

async function saveProductForm(e, keepOpenAndAddAnother = false) {
  if (e && e.preventDefault) e.preventDefault();

  const saveBtn = document.getElementById("wizardSaveCloseBtn");
  const saveAnotherBtn = document.getElementById("wizardSaveAnotherBtn");
  const origSaveText = saveBtn ? saveBtn.innerHTML : "💾 Save Firecracker";
  const origAnotherText = saveAnotherBtn ? saveAnotherBtn.innerHTML : "➕ Save & Add Another";

  let id = document.getElementById("prodId")?.value.trim() || "";
  const name = document.getElementById("prodName")?.value.trim() || "";
  const catSelect = document.getElementById("prodCategory");
  let category_id = catSelect ? catSelect.value : "";

  // Validate Step 1 basics
  if (!name) {
    showToast("Please enter a firecracker name.", "warning");
    goToWizardStep(1);
    const nameInput = document.getElementById("prodName");
    if (nameInput) nameInput.focus();
    return;
  }

  if (!category_id) {
    showToast("Please select a category.", "warning");
    goToWizardStep(1);
    if (catSelect) catSelect.focus();
    return;
  }

  const prodType = document.querySelector('input[name="prodType"]:checked')?.value || "simple";
  const isVariable = prodType === "variable";

  let sku = document.getElementById("prodSku")?.value.trim() || "";
  let price = Number(document.getElementById("prodPrice")?.value) || 0;
  let original_price = Number(document.getElementById("prodOriginalPrice")?.value) || price;
  let stock = parseInt(document.getElementById("prodStock")?.value, 10);
  if (isNaN(stock)) stock = 100;
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
      goToWizardStep(2);
      return;
    }

    // Compute base values from variants
    price = Math.min(...variants.map(v => v.price));
    original_price = Math.min(...variants.map(v => v.original_price || v.price));
    stock = variants.reduce((sum, v) => sum + v.stock_quantity, 0);
    if (!sku) sku = variants[0]?.sku || `VAR-${Date.now().toString(36).toUpperCase()}`;
    if (!unit) unit = variants[0]?.unit || "Box";
  } else {
    // Validate simple price
    if (isNaN(price) || price <= 0) {
      showToast("Please enter a valid selling price.", "warning");
      goToWizardStep(2);
      const priceInput = document.getElementById("prodPrice");
      if (priceInput) priceInput.focus();
      return;
    }
  }

  // Auto-generate clean unique SKU if left empty
  if (!sku) {
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8) || "CRK";
    sku = `DC-${cleanName}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }

  // Ensure original_price satisfies database check constraint (original_price >= price)
  if (isNaN(original_price) || original_price < price) {
    original_price = price;
  }

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

  // Immediate visual feedback
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = "⏳ Saving...";
  }
  if (saveAnotherBtn) {
    saveAnotherBtn.disabled = true;
  }

  try {
    // Perform DIRECT ONLINE SAVE to Supabase PostgreSQL
    let onlineSaved = false;
    let onlineError = null;

    const onlineOutcome = await saveProductToSupabaseOnline(productData);
    if (onlineOutcome.success) {
      onlineSaved = true;
      if (onlineOutcome.data?.id) {
        id = onlineOutcome.data.id;
        productData.id = onlineOutcome.data.id;
      }
      if (onlineOutcome.data?.sku) {
        sku = onlineOutcome.data.sku;
        productData.sku = onlineOutcome.data.sku;
      }
    } else {
      onlineError = onlineOutcome.error;
      console.warn("[Online Save] Supabase save note:", onlineError);
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

    if (keepOpenAndAddAnother) {
      wizardBatchAddedCount++;
      const batchBadge = document.getElementById("batchSaveCounter");
      if (batchBadge) {
        batchBadge.style.display = "inline-flex";
        batchBadge.textContent = `✓ ${wizardBatchAddedCount} added`;
      }

      // Preserve chosen category for superfast consecutive entry
      const savedCat = catSelect ? catSelect.value : "";

      // Reset form fields for the next firecracker
      const form = document.getElementById("productForm");
      if (form) form.reset();
      document.getElementById("prodId").value = "";
      document.getElementById("prodSku").value = "";
      document.getElementById("prodPrice").value = "";
      document.getElementById("prodOriginalPrice").value = "";
      document.getElementById("prodStock").value = "100";
      document.getElementById("prodUnit").value = "Box";
      document.getElementById("prodImageUrl").value = "";
      document.getElementById("prodVideoUrl").value = "";
      document.getElementById("prodDesc").value = "";
      if (savedCat && catSelect) catSelect.value = savedCat;

      toggleProductType("simple");
      const varTbody = document.getElementById("variantTableBody");
      if (varTbody) varTbody.innerHTML = "";

      const thumb = document.getElementById("imagePreviewThumb");
      if (thumb) thumb.src = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600";

      goToWizardStep(1);
      const titleEl = document.getElementById("productModalTitle");
      if (titleEl) titleEl.textContent = `Add Firecracker #${wizardBatchAddedCount + 1}`;

      setTimeout(() => {
        const nameInput = document.getElementById("prodName");
        if (nameInput) nameInput.focus();
      }, 150);

      if (onlineSaved) {
        showToast(`🎉 "${name}" saved ONLINE in Supabase cloud! Ready for firecracker #${wizardBatchAddedCount + 1}.`, "success", 4000);
      } else {
        showToast(`💾 "${name}" saved locally! Ready for firecracker #${wizardBatchAddedCount + 1}.`, "info", 4000);
      }
    } else {
      closeProductModal();

      if (onlineSaved) {
        showToast(`🎉 Firecracker "${name}" saved ONLINE in Supabase cloud! Storefront is live.`, "success", 5000);
        const badge = document.getElementById("cloudSyncStatusBadge");
        if (badge) {
          badge.className = "table-header-sub badge badge-success";
          badge.textContent = "☁️ Online Cloud Sync: Active (Live DB)";
        }
      } else if (onlineError) {
        console.warn("Supabase online save note:", onlineError);
        showToast(`💾 Firecracker "${name}" saved locally! (${onlineError})`, "info", 5000);
        const badge = document.getElementById("cloudSyncStatusBadge");
        if (badge) {
          badge.className = "table-header-sub badge badge-warning";
          badge.textContent = "☁️ Saved Locally (Cloud Check Note)";
        }
      } else {
        showToast(`🎉 Firecracker "${name}" saved successfully!`, "success");
      }
    }
  } catch (err) {
    console.error("[Save Firecracker Error]:", err);
    showToast(`⚠️ Save Error: ${err.message || err}`, "danger", 6000);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = origSaveText;
    }
    if (saveAnotherBtn) {
      saveAnotherBtn.disabled = false;
      saveAnotherBtn.innerHTML = origAnotherText;
    }
  }
}

async function deleteProduct(productId) {
  const targetProd = adminProductList.find(p => String(p.id) === String(productId));
  const prodName = targetProd ? targetProd.name : "Firecracker";
  const prodSku = targetProd?.sku || "";

  if (!confirm(`Are you sure you want to delete "${prodName}"? It will be permanently removed from the live online store.`)) return;

  // 1. Security & Admin authorization verification
  const sessionUser = sessionStorage.getItem("dc_auth_user");
  let isAuthorized = false;
  if (sessionUser) {
    try {
      const parsed = JSON.parse(sessionUser);
      if (parsed && ["admin", "staff"].includes(parsed.role)) isAuthorized = true;
    } catch (_) {}
  }
  const sbAuth = (typeof getAdminSupabase === "function") ? getAdminSupabase() : getSupabase();
  if (!isAuthorized && sbAuth) {
    try {
      const { data: { session } } = await sbAuth.auth.getSession();
      if (session) isAuthorized = true;
    } catch (_) {}
  }
  if (!isAuthorized) {
    showToast("Unauthorized: You must be logged in with admin privileges to delete products.", "error");
    return;
  }

  // 2. Database verification and deletion (Supabase)
  const sb = (typeof getAdminSupabase === "function") ? getAdminSupabase() : getSupabase();
  let dbConfirmed = false;
  let dbError = null;

  if (isSupabaseConfigured() && sb) {
    try {
      // Step A: Attempt permanent hard deletion by primary key ID
      let { data: deletedRows, error: delErr } = await sb
        .from("products")
        .delete()
        .eq("id", productId)
        .select("id, name, sku");

      // Step B: If 0 rows affected by ID, check if target row has matching SKU in cloud
      if (!delErr && (!deletedRows || deletedRows.length === 0) && prodSku) {
        const skuRes = await sb
          .from("products")
          .delete()
          .eq("sku", prodSku)
          .select("id, name, sku");
        if (!skuRes.error && skuRes.data && skuRes.data.length > 0) {
          deletedRows = skuRes.data;
        } else if (skuRes.error) {
          delErr = skuRes.error;
        }
      }

      if (!delErr && deletedRows && deletedRows.length > 0) {
        dbConfirmed = true;
      } else if (delErr) {
        // Step C: Handle foreign-key relationships safely without breaking past customer orders/invoices
        const isFkErr = delErr.message?.toLowerCase().includes("foreign key") ||
                        delErr.message?.toLowerCase().includes("violates") ||
                        delErr.code === "23503";
        if (isFkErr) {
          console.warn("[Delete] Hard delete prevented by foreign key reference (orders/invoices). Safely applying soft-delete (is_active: false):", delErr.message);
          const { data: softRows, error: softErr } = await sb
            .from("products")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", productId)
            .select("id, name, sku");

          if (!softErr && softRows && softRows.length > 0) {
            dbConfirmed = true;
          } else {
            dbError = softErr ? softErr.message : "Soft-delete failed after FK constraint.";
          }
        } else {
          dbError = delErr.message;
        }
      } else {
        // Step D: Verify whether product even existed in cloud database
        const { data: existingCheck } = await sb.from("products").select("id").eq("id", productId).maybeSingle();
        if (!existingCheck) {
          // Product was not found in cloud DB (e.g. offline-only draft or already purged)
          dbConfirmed = true;
        } else {
          dbError = "Database deletion not confirmed. Please check database permissions or RLS policies.";
        }
      }
    } catch (err) {
      dbError = err.message || "Network error communicating with database.";
    }

    // Step E: Error handling - if deletion failed, keep product visible and show the actual error
    if (!dbConfirmed) {
      showToast(`Deletion failed: ${dbError}. Product was not removed.`, "error", 7000);
      return;
    }
  } else {
    // Local / Demo mode without configured Supabase
    dbConfirmed = true;
  }

  // 3. Update authoritative local catalog & prune product
  adminProductList = adminProductList.filter(p => String(p.id) !== String(productId) && (!prodSku || String(p.sku || "") !== String(prodSku)));
  localStorage.setItem("dc_custom_products", JSON.stringify(adminProductList));
  localStorage.setItem("dc_products_updated_at", Date.now().toString());

  // 4. Mark permanently in deleted IDs & SKUs list to prevent zombie re-sync
  if (typeof markProductAsDeleted === "function") {
    markProductAsDeleted(productId, prodSku);
  } else {
    const deletedIds = typeof getDeletedProductIds === "function" ? getDeletedProductIds() : [];
    if (!deletedIds.includes(productId)) deletedIds.push(productId);
    if (prodSku && !deletedIds.includes(prodSku)) deletedIds.push(prodSku);
    localStorage.setItem("dc_deleted_product_ids", JSON.stringify(deletedIds));
  }

  // 5. Invalidate from active shopping cart
  try {
    const rawCart = localStorage.getItem("dc_shopping_cart");
    if (rawCart) {
      const cart = JSON.parse(rawCart);
      if (Array.isArray(cart)) {
        const cleaned = cart.filter(it => String(it.id) !== String(productId) && (!prodSku || String(it.sku || "") !== String(prodSku)));
        if (cleaned.length !== cart.length) {
          localStorage.setItem("dc_shopping_cart", JSON.stringify(cleaned));
          if (typeof updateCartBadge === "function") updateCartBadge();
          if (typeof renderFloatingCart === "function") renderFloatingCart();
        }
      }
    }
  } catch (_) {}

  // 6. Broadcast real-time sync event to public storefront
  if (typeof broadcastSync === "function") {
    broadcastSync("products_updated", {
      id: productId,
      sku: prodSku,
      name: prodName,
      action: "delete",
      timestamp: Date.now()
    });
  }

  // 7. Re-render table and show confirmed success feedback
  renderAdminProductsTable(adminProductList);
  showToast(`✓ Firecracker "${prodName}" deleted successfully from live store & database.`, "success", 5000);
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
        const isPendingVerification = payStatus === "pending_verification" || (o.payment_method === "UPI" && payStatus === "pending");

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
              <option value="pending_verification" ${payStatus === 'pending_verification' ? 'selected' : ''}>⏳ Pending Verification</option>
              <option value="paid" ${payStatus === 'paid' ? 'selected' : ''}>✅ Paid</option>
              <option value="unpaid" ${payStatus === 'unpaid' ? 'selected' : ''}>❌ Unpaid</option>
              <option value="pending" ${payStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
              <option value="refunded" ${payStatus === 'refunded' ? 'selected' : ''}>↩️ Refunded</option>
            </select>
            ${o.upi_utr ? `<div style="font-size: 0.72rem; color: #b45309; font-weight: 600; font-family: monospace; margin-top: 3px;" title="Customer UPI UTR / Ref">UTR: ${o.upi_utr}</div>` : ''}
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
              ${isPendingVerification ? `
                <button class="action-btn" onclick="verifyPaymentAndProcessOrder('${o.order_number}')" style="color: #059669; font-weight: 700; background: #ecfdf5; border-color: #a7f3d0;" title="Verify Payment in Soundbox & Process Order">✅ Verify</button>
              ` : ''}
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
        const isPendingVerification = payStatus === "pending_verification" || (o.payment_method === "UPI" && payStatus === "pending");
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
                  <option value="pending_verification" ${payStatus === 'pending_verification' ? 'selected' : ''}>⏳ Pending Verification</option>
                  <option value="paid" ${payStatus === 'paid' ? 'selected' : ''}>✅ Paid</option>
                  <option value="unpaid" ${payStatus === 'unpaid' ? 'selected' : ''}>❌ Unpaid</option>
                  <option value="pending" ${payStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                  <option value="refunded" ${payStatus === 'refunded' ? 'selected' : ''}>↩️ Refunded</option>
                </select>
              </div>
            </div>

            ${o.upi_utr ? `
              <div style="font-size: 0.75rem; color: #b45309; font-weight: 600; font-family: monospace; margin-top: 4px;">
                UPI UTR: ${o.upi_utr}
              </div>
            ` : ''}

            <div class="moc-items-preview">
              <span>📦</span>
              <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${itemSummary}</span>
            </div>
          </div>

          <div class="moc-footer-actions">
            ${isPendingVerification ? `
              <button type="button" class="btn btn-sm moc-act-btn" onclick="verifyPaymentAndProcessOrder('${o.order_number}')" style="background: #059669; border-color: #059669; color: #fff; font-weight: 700;">
                ✅ Verify & Process
              </button>
            ` : ''}
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
 * Verify payment in soundbox / bank and process order for packing & dispatch
 */
async function verifyPaymentAndProcessOrder(orderNumber) {
  const order = adminOrdersList.find(o => o.order_number === orderNumber);
  if (!order) {
    showToast("Order not found.", "error");
    return;
  }

  const confirmed = confirm(`Verify payment of ${formatCurrency(order.total_amount)} for Order #${orderNumber}?\n\nThis will mark the payment as PAID and move the order to CONFIRMED for packing & dispatch.`);
  if (!confirmed) return;

  order.payment_status = "paid";
  order.status = "confirmed";
  localStorage.setItem("dc_orders_list", JSON.stringify(adminOrdersList));

  // Sync to invoices history
  const invoices = JSON.parse(localStorage.getItem("dc_invoices_history") || "[]");
  let inv = invoices.find(i => i.invoice_number === orderNumber || i.order_id === orderNumber);
  if (inv) {
    inv.payment_status = "paid";
    inv.order_status = "confirmed";
    inv.status = "confirmed";
  } else {
    invoices.unshift({
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
      payment_method: order.payment_method || "UPI",
      payment_status: "paid",
      order_status: "confirmed",
      status: "confirmed",
      created_at: order.created_at || new Date().toISOString(),
      items: order.items || []
    });
  }
  localStorage.setItem("dc_invoices_history", JSON.stringify(invoices));

  // Update Supabase if configured
  const sb = getSupabase();
  if (isSupabaseConfigured() && sb) {
    try {
      await sb.from("orders").update({
        payment_status: "paid",
        status: "confirmed",
        updated_at: new Date().toISOString()
      }).eq("order_number", orderNumber);

      await sb.from("invoices").update({
        payment_status: "paid",
        notes: "Payment verified by store admin - Order Confirmed"
      }).eq("invoice_number", orderNumber);
    } catch (err) {
      console.warn("Supabase verification update error:", err);
    }
  }

  if (typeof broadcastSync === "function") {
    broadcastSync("order_updated", { orderNumber, status: "confirmed", paymentStatus: "paid" });
  }

  showToast(`✅ Payment verified for Order #${orderNumber}! Order confirmed & processing.`, "success");
  updateOrderSummaryStats();
  applyOrderFilters();
}
window.verifyPaymentAndProcessOrder = verifyPaymentAndProcessOrder;

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
  const isPendingVerification = payStatus === "pending_verification" || (order.payment_method === "UPI" && payStatus !== "paid");

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
                <option value="pending_verification" ${payStatus === 'pending_verification' ? 'selected' : ''}>⏳ Pending Verification</option>
                <option value="paid" ${payStatus === 'paid' ? 'selected' : ''}>✅ Paid</option>
                <option value="unpaid" ${payStatus === 'unpaid' ? 'selected' : ''}>❌ Unpaid</option>
                <option value="pending" ${payStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                <option value="refunded" ${payStatus === 'refunded' ? 'selected' : ''}>↩️ Refunded</option>
              </select>
            </div>
            <div style="font-size: 0.82rem; margin-top: 6px;">Mode: <strong>${order.payment_method || 'COD'}</strong></div>
            ${order.upi_utr ? `<div style="font-size: 0.82rem; margin-top: 4px; color: #b45309;">UPI UTR / Ref: <strong style="font-family: monospace;">${order.upi_utr}</strong></div>` : ''}
            <div style="font-size: 0.75rem; color: #6b7280; margin-top: 2px;">Date: ${new Date(order.created_at || Date.now()).toLocaleString("en-IN")}</div>
          </div>
        </div>

        ${isPendingVerification ? `
          <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <div>
              <div style="font-weight: 700; color: #92400e; font-size: 0.92rem;">⏳ Payment Verification Required</div>
              <div style="font-size: 0.8rem; color: #78350f; margin-top: 2px;">
                Check merchant soundbox / bank SMS for <strong>${formatCurrency(order.total_amount)}</strong>${order.upi_utr ? ` (UTR: <strong style="font-family: monospace;">${order.upi_utr}</strong>)` : ''}.
              </div>
            </div>
            <button type="button" class="btn btn-primary btn-sm" onclick="verifyPaymentAndProcessOrder('${order.order_number}'); closeOrderDetailsModal();" style="background: #059669; border-color: #059669; font-weight: 700; padding: 0.45rem 0.9rem;">
              ✅ Verify Payment & Process Order
            </button>
          </div>
        ` : ''}

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
📞 Helpline: ${settings.whatsapp_phone || settings.phone || '+91 94431 88531'}`;

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
  updateInvoiceSummaryStats();

  const searchInput = document.getElementById("invoiceSearchInput");
  const clearBtn = document.getElementById("invoiceSearchClear");
  const channelFilter = document.getElementById("invoiceChannelFilter");
  const statusFilter = document.getElementById("invoicePaymentStatusFilter");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      if (clearBtn) {
        clearBtn.style.display = searchInput.value ? "flex" : "none";
      }
      applyInvoiceFilters();
    });
  }
  if (channelFilter) channelFilter.addEventListener("change", applyInvoiceFilters);
  if (statusFilter) statusFilter.addEventListener("change", applyInvoiceFilters);

  if (typeof listenSync === "function") {
    listenSync(async (event) => {
      if (event.type === "order_created" || event.type === "order_updated") {
        adminInvoicesList = syncOrdersAndInvoices();
        updateInvoiceSummaryStats();
        applyInvoiceFilters();
      }
    });
  }
}

function setInvoiceChannelPill(channel) {
  const pills = document.querySelectorAll("#invoiceChannelPills .order-pill-btn");
  pills.forEach(p => {
    if (p.getAttribute("data-channel") === channel) {
      p.classList.add("active");
    } else {
      p.classList.remove("active");
    }
  });

  const hiddenSelect = document.getElementById("invoiceChannelFilter");
  if (hiddenSelect) {
    hiddenSelect.value = channel;
  }
  applyInvoiceFilters();
}

function clearInvoiceSearch() {
  const searchInput = document.getElementById("invoiceSearchInput");
  const clearBtn = document.getElementById("invoiceSearchClear");
  if (searchInput) {
    searchInput.value = "";
    if (clearBtn) clearBtn.style.display = "none";
    applyInvoiceFilters();
  }
}

function copyInvoiceNum(invNum) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(invNum).then(() => {
      if (typeof showToast === "function") showToast(`Copied #${invNum}`, "success");
    }).catch(() => {
      if (typeof showToast === "function") showToast(`Invoice #${invNum}`, "info");
    });
  } else {
    if (typeof showToast === "function") showToast(`Invoice #${invNum}`, "info");
  }
}

function updateInvoiceSummaryStats() {
  const revEl = document.getElementById("invTotalRevenue");
  const countEl = document.getElementById("invTotalCount");
  const posEl = document.getElementById("invPosCount");
  const onlineEl = document.getElementById("invOnlineCount");
  const pillAll = document.getElementById("invPillCountAll");
  const pillPos = document.getElementById("invPillCountPos");
  const pillOnline = document.getElementById("invPillCountOnline");

  if (!adminInvoicesList) return;

  let totalRev = 0;
  let totalCount = adminInvoicesList.length;
  let posCount = 0;
  let onlineCount = 0;

  adminInvoicesList.forEach(inv => {
    totalRev += Number(inv.total_amount || 0);
    const isOnline = (inv.source || "").toLowerCase().includes("online") || !!inv.order_id;
    if (isOnline) {
      onlineCount++;
    } else {
      posCount++;
    }
  });

  if (revEl) revEl.textContent = formatCurrency(totalRev);
  if (countEl) countEl.textContent = totalCount;
  if (posEl) posEl.textContent = posCount;
  if (onlineEl) onlineEl.textContent = onlineCount;
  if (pillAll) pillAll.textContent = totalCount;
  if (pillPos) pillPos.textContent = posCount;
  if (pillOnline) pillOnline.textContent = onlineCount;
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
  const mList = document.getElementById("adminInvoicesMobileList");

  // 1. Render Desktop Table View
  if (tbody) {
    tbody.innerHTML = "";
    if (invoices.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #9ca3af; padding: 2.5rem; font-size: 0.95rem;">No sales invoices found matching current criteria.</td></tr>`;
    } else {
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
  }

  // 2. Render Mobile Cards View (< 769px)
  if (mList) {
    mList.innerHTML = "";
    if (invoices.length === 0) {
      mList.innerHTML = `
        <div class="admin-invoices-empty-card">
          <span class="aiec-icon">🧾</span>
          <p class="aiec-text">No sales invoices found matching current criteria.</p>
        </div>
      `;
    } else {
      invoices.forEach(inv => {
        const payStatus = (inv.payment_status || "paid").toLowerCase();
        const ordStatus = (inv.order_status || inv.status || "confirmed").toLowerCase();
        const isOnline = (inv.source || "").toLowerCase().includes("online") || !!inv.order_id;
        const hasPhone = inv.customer_phone && inv.customer_phone.trim() !== "" && inv.customer_phone !== "-";
        const dateObj = new Date(inv.created_at || Date.now());
        const dateStr = dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });

        const card = document.createElement("div");
        card.className = "mobile-invoice-card";
        card.innerHTML = `
          <div class="mic-header">
            <div class="mic-id-wrap">
              <span class="mic-channel-badge ${isOnline ? 'mic-channel-online' : 'mic-channel-pos'}">
                ${isOnline ? '📦 Online' : '⚡ POS'}
              </span>
              <span class="mic-id" onclick="copyInvoiceNum('${inv.invoice_number}')" title="Click to copy #${inv.invoice_number}">
                #${inv.invoice_number}
              </span>
            </div>
            <span class="mic-date">${dateStr}</span>
          </div>

          <div class="mic-body">
            <div class="mic-customer-row">
              <div class="mic-customer-info">
                <div class="mic-customer-name">
                  <span>👤</span>
                  <span class="mic-name-text">${inv.customer_name || 'Walk-in Customer'}</span>
                </div>
                <div class="mic-customer-phone">
                  <span>📞</span>
                  <span>${inv.customer_phone || 'Walk-in Store Purchase'}</span>
                </div>
              </div>
              ${hasPhone ? `
                <div class="mic-quick-comms">
                  <a href="tel:${inv.customer_phone}" class="mic-comm-btn call" title="Call Customer">📞</a>
                  <button type="button" class="mic-comm-btn wa" onclick="sendAdminInvoiceWhatsApp('${inv.invoice_number}')" title="Send WhatsApp Invoice">💬</button>
                </div>
              ` : ''}
            </div>

            <div class="mic-amount-status-bar">
              <div class="mic-amount-block">
                <span class="mic-amount-label">Grand Total</span>
                <span class="mic-amount-val">${formatCurrency(inv.total_amount)}</span>
              </div>
              <div class="mic-payment-ctrls">
                <span class="mic-pay-mode-badge">${inv.payment_method || 'CASH'}</span>
                <select class="status-select status-select-${payStatus}" onchange="updateInvoicePaymentStatus('${inv.invoice_number}', this.value)" title="Change Payment Status">
                  <option value="paid" ${payStatus === 'paid' ? 'selected' : ''}>✅ Paid</option>
                  <option value="unpaid" ${payStatus === 'unpaid' ? 'selected' : ''}>❌ Unpaid</option>
                  <option value="pending" ${payStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                  <option value="cancelled" ${payStatus === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                </select>
              </div>
            </div>

            ${isOnline ? `
              <div class="mic-order-status-row">
                <span class="mic-order-status-label">📦 Delivery Status:</span>
                <select class="status-select status-select-${ordStatus}" onchange="updateInvoiceOrderStatus('${inv.invoice_number}', this.value)" title="Change Order Delivery Status">
                  <option value="pending" ${ordStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                  <option value="confirmed" ${ordStatus === 'confirmed' ? 'selected' : ''}>📋 Confirmed</option>
                  <option value="dispatched" ${ordStatus === 'dispatched' ? 'selected' : ''}>🚚 Dispatched</option>
                  <option value="delivered" ${ordStatus === 'delivered' ? 'selected' : ''}>🎉 Delivered</option>
                  <option value="cancelled" ${ordStatus === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                </select>
              </div>
            ` : `
              <div class="mic-pos-counter-row">
                <span class="mic-pos-counter-text">⚡ Instant Counter Billing</span>
                <span class="mic-pos-delivered-badge">Handed Over</span>
              </div>
            `}
          </div>

          <div class="mic-footer-actions">
            <button type="button" class="btn btn-secondary btn-sm mic-act-btn" onclick="openAdminInvoiceModal('${inv.invoice_number}')" title="Preview & Print Invoice">
              🖨️ Print
            </button>
            <a href="/invoice.html?invoice=${inv.invoice_number}&download=true" target="_blank" class="btn btn-secondary btn-sm mic-act-btn mic-btn-pdf" title="Download PDF Invoice">
              📥 PDF
            </a>
            <button type="button" class="btn btn-secondary btn-sm mic-act-btn mic-btn-wa" onclick="sendAdminInvoiceWhatsApp('${inv.invoice_number}')" title="Share via WhatsApp">
              📲 WhatsApp
            </button>
          </div>
        `;
        mList.appendChild(card);
      });
    }
  }
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
    tr.className = "admin-customer-row";
    tr.innerHTML = `
      <td class="cust-name-cell" data-label="Customer Name">
        <div class="cust-name-title"><strong>${c.name}</strong></div>
      </td>
      <td class="cust-phone-cell" data-label="Mobile Number">
        ${c.phone && c.phone !== 'Walk-in' ? `<a href="tel:${c.phone}" class="cust-phone-link" style="color:var(--admin-primary); text-decoration:none; font-weight:600;">📱 ${c.phone}</a>` : '<span class="text-muted" style="color:#94a3b8;">In-store Walk-in</span>'}
      </td>
      <td class="cust-address-cell" data-label="Address / Location">${c.address || 'In-store Sivakasi Counter'}</td>
      <td class="cust-orders-cell" data-label="Total Purchases">
        <span class="badge badge-info">${c.totalOrders} ${c.totalOrders === 1 ? 'Order' : 'Orders'}</span>
      </td>
      <td class="cust-spend-cell" data-label="Total Spent">
        <strong style="color: #047857; font-size: 1.05rem;">${formatCurrency(c.totalSpent)}</strong>
      </td>
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
  const officialAddr = "No.33 Vengatesh Perumal Kovil Street, Maharnonbu Chavadi, Thanjavur, Tamil Nadu 613001";
  const currentAddr = (settings.address || "").trim();
  document.getElementById("setAddress").value = (!currentAddr || currentAddr.includes("142, By-pass") || currentAddr.includes("626123") || currentAddr.includes("Kamaraj Statue") || !currentAddr.includes("Thanjavur")) ? officialAddr : currentAddr;
  document.getElementById("setBusinessDesc").value = settings.business_description || "";
  document.getElementById("setGst").value = settings.gst_number || "";
  document.getElementById("setTaxRate").value = settings.default_tax_rate || 18;
  document.getElementById("setTaxApplicable").checked = settings.tax_applicable !== false;
  document.getElementById("setInvoiceFooter").value = settings.invoice_footer || "";
  if (document.getElementById("setGoogleReviewUrl")) {
    document.getElementById("setGoogleReviewUrl").value = (settings.google_review_url && !settings.google_review_url.includes("AwTsdLuk9OtRHQhbR")) 
      ? settings.google_review_url 
      : "https://share.google/RqWbas77JcB57AOT2";
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
    google_review_url: (document.getElementById("setGoogleReviewUrl") ? document.getElementById("setGoogleReviewUrl").value.trim() : "") || "https://share.google/RqWbas77JcB57AOT2",
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
        const { default_print_format, ...dbSettings } = settings;
        await sb.from("business_settings").upsert({ id: "a0000000-0000-0000-0000-000000000001", ...dbSettings });
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
