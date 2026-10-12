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
}

function renderAdminProductsTable(products) {
  const tbody = document.getElementById("adminProductsTbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #9ca3af; padding: 2rem;">No products found.</td></tr>`;
    return;
  }

  products.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <img src="${p.image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=60'}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">
      </td>
      <td>
        <strong>${p.name}</strong>
        <div style="font-size: 0.75rem; color: #6b7280;">Unit: ${p.unit || 'Box'}</div>
      </td>
      <td><code>${p.sku || '-'}</code></td>
      <td><strong>${formatCurrency(p.price)}</strong></td>
      <td>
        <span class="badge ${p.stock_quantity <= 10 ? 'badge-danger' : 'badge-success'}">
          ${p.stock_quantity} left
        </span>
      </td>
      <td>${p.category_name || '-'}</td>
      <td>
        <div class="action-btn-group">
          <button class="action-btn" onclick="openEditProductModal('${p.id}')">✏️ Edit</button>
          <button class="action-btn delete" onclick="deleteProduct('${p.id}')">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddProductModal() {
  const form = document.getElementById("productForm");
  if (form) form.reset();
  const idField = document.getElementById("prodId");
  if (idField) idField.value = "";
  const title = document.getElementById("productModalTitle");
  if (title) title.textContent = "Add New Firecracker";

  const modal = document.getElementById("productEditModal");
  if (modal) modal.style.display = "flex";
}

function openEditProductModal(productId) {
  const product = adminProductList.find(p => p.id === productId);
  if (!product) return;

  document.getElementById("prodId").value = product.id;
  document.getElementById("prodName").value = product.name;
  document.getElementById("prodSku").value = product.sku || "";
  document.getElementById("prodPrice").value = product.price;
  document.getElementById("prodOriginalPrice").value = product.original_price || "";
  document.getElementById("prodStock").value = product.stock_quantity;
  document.getElementById("prodUnit").value = product.unit || "Box";
  document.getElementById("prodImageUrl").value = product.image_url || "";
  document.getElementById("prodDesc").value = product.description || "";

  document.getElementById("productModalTitle").textContent = "Edit Firecracker";
  const modal = document.getElementById("productEditModal");
  if (modal) modal.style.display = "flex";
}

function closeProductModal() {
  const modal = document.getElementById("productEditModal");
  if (modal) modal.style.display = "none";
}

async function saveProductForm(e) {
  e.preventDefault();
  const id = document.getElementById("prodId").value;
  const name = document.getElementById("prodName").value.trim();
  const sku = document.getElementById("prodSku").value.trim();
  const price = Number(document.getElementById("prodPrice").value);
  const original_price = Number(document.getElementById("prodOriginalPrice").value) || price;
  const stock = parseInt(document.getElementById("prodStock").value, 10);
  const unit = document.getElementById("prodUnit").value.trim();
  const image_url = document.getElementById("prodImageUrl").value.trim();
  const desc = document.getElementById("prodDesc").value.trim();

  const productData = {
    name,
    sku,
    price,
    original_price,
    stock_quantity: stock,
    unit,
    image_url: image_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600",
    description: desc,
    is_active: true
  };

  const sb = getSupabase();
  if (isSupabaseConfigured() && sb) {
    try {
      if (id) {
        await sb.from("products").update(productData).eq("id", id);
      } else {
        await sb.from("products").insert(productData);
      }
    } catch (err) {
      console.warn("Supabase product save error:", err);
    }
  }

  // Update local copy
  if (id) {
    const idx = adminProductList.findIndex(p => p.id === id);
    if (idx !== -1) adminProductList[idx] = { ...adminProductList[idx], ...productData };
  } else {
    productData.id = "prod-" + Date.now();
    adminProductList.unshift(productData);
  }

  localStorage.setItem("dc_custom_products", JSON.stringify(adminProductList));
  renderAdminProductsTable(adminProductList);
  closeProductModal();
  showToast("Product saved successfully!", "success");
}

async function deleteProduct(productId) {
  if (!confirm("Are you sure you want to remove this product?")) return;

  const sb = getSupabase();
  if (isSupabaseConfigured() && sb) {
    try {
      await sb.from("products").delete().eq("id", productId);
    } catch (e) {
      console.warn(e);
    }
  }

  adminProductList = adminProductList.filter(p => p.id !== productId);
  localStorage.setItem("dc_custom_products", JSON.stringify(adminProductList));
  renderAdminProductsTable(adminProductList);
  showToast("Product deleted successfully.", "success");
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

  renderAdminOrdersTable(adminOrdersList);

  const statusFilter = document.getElementById("orderStatusFilter");
  const paymentFilter = document.getElementById("orderPaymentStatusFilter");
  const searchInput = document.getElementById("orderSearchInput");

  if (statusFilter) statusFilter.addEventListener("change", applyOrderFilters);
  if (paymentFilter) paymentFilter.addEventListener("change", applyOrderFilters);
  if (searchInput) searchInput.addEventListener("input", applyOrderFilters);
}

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
  if (!tbody) return;

  tbody.innerHTML = "";
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #9ca3af; padding: 2.5rem; font-size: 0.95rem;">No orders matching current filter or search.</td></tr>`;
    return;
  }

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
        <select class="status-select status-select-${payStatus}" onchange="updateOrderPaymentStatus('${o.order_number}', this.value)" title="Change Payment Status">
          <option value="paid" ${payStatus === 'paid' ? 'selected' : ''}>✅ Paid</option>
          <option value="unpaid" ${payStatus === 'unpaid' ? 'selected' : ''}>❌ Unpaid</option>
          <option value="pending" ${payStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
          <option value="refunded" ${payStatus === 'refunded' ? 'selected' : ''}>↩️ Refunded</option>
        </select>
      </td>
      <td>
        <select class="status-select status-select-${ordStatus}" onchange="updateOrderStatus('${o.order_number}', this.value)" title="Change Order Status">
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
          <a href="../invoice.html?invoice=${o.order_number}&download=true" target="_blank" class="action-btn" style="color: #059669;" title="Download PDF Invoice">📥 PDF</a>
          <button class="action-btn" onclick="printOrderInvoice('${o.order_number}')" title="Print Invoice (A4 / 80mm / 58mm)">🖨️ Print</button>
          <button class="action-btn" onclick="openOrderDetailsModal('${o.order_number}')" title="View Order Details">👁️ Details</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
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
      <div class="modal-body" style="padding: 1.5rem;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem; background: #f9fafb; padding: 1.25rem; border-radius: 8px; border: 1px solid #e5e7eb;">
          <div>
            <div style="font-size: 0.75rem; color: #6b7280; font-weight: 700; text-transform: uppercase;">Customer Info</div>
            <div style="font-weight: 700; font-size: 1rem; margin-top: 2px;">${order.customer_name || 'Valued Customer'}</div>
            <div style="font-size: 0.85rem; color: #4b5563;">📞 ${order.customer_phone || '-'}</div>
            <div style="font-size: 0.8rem; color: #6b7280; margin-top: 4px;">📍 ${order.customer_address || 'Online order'}</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: #6b7280; font-weight: 700; text-transform: uppercase;">Order & Payment Controls</div>
            <div style="margin-top: 6px; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
              <span style="font-size: 0.85rem; font-weight: 600;">Order Status:</span>
              <select class="status-select status-select-${ordStatus}" onchange="updateOrderStatus('${order.order_number}', this.value); openOrderDetailsModal('${order.order_number}');">
                <option value="pending" ${ordStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                <option value="confirmed" ${ordStatus === 'confirmed' ? 'selected' : ''}>📋 Confirmed</option>
                <option value="dispatched" ${ordStatus === 'dispatched' ? 'selected' : ''}>🚚 Dispatched</option>
                <option value="delivered" ${ordStatus === 'delivered' ? 'selected' : ''}>🎉 Delivered</option>
                <option value="cancelled" ${ordStatus === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
              </select>
            </div>
            <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
              <span style="font-size: 0.85rem; font-weight: 600;">Payment Status:</span>
              <select class="status-select status-select-${payStatus}" onchange="updateOrderPaymentStatus('${order.order_number}', this.value); openOrderDetailsModal('${order.order_number}');">
                <option value="paid" ${payStatus === 'paid' ? 'selected' : ''}>✅ Paid</option>
                <option value="unpaid" ${payStatus === 'unpaid' ? 'selected' : ''}>❌ Unpaid</option>
                <option value="pending" ${payStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                <option value="refunded" ${payStatus === 'refunded' ? 'selected' : ''}>↩️ Refunded</option>
              </select>
            </div>
            <div style="font-size: 0.85rem; margin-top: 8px;">Method: <strong>${order.payment_method || 'COD'}</strong></div>
            <div style="font-size: 0.78rem; color: #6b7280; margin-top: 4px;">Date: ${new Date(order.created_at || Date.now()).toLocaleString("en-IN")}</div>
          </div>
        </div>

        <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem;">Ordered Fireworks Items</h4>
        <div style="max-height: 200px; overflow-y: auto; margin-bottom: 1.25rem; border: 1px solid #e5e7eb; border-radius: 6px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
            <thead>
              <tr style="background: #f3f4f6; text-align: left;">
                <th style="padding: 6px 10px;">Item</th>
                <th style="padding: 6px 10px; width: 60px; text-align: center;">Qty</th>
                <th style="padding: 6px 10px; width: 85px; text-align: right;">Rate</th>
                <th style="padding: 6px 10px; width: 95px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items && order.items.length > 0) ? order.items.map(it => `
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="padding: 6px 10px;">${it.product_name}</td>
                  <td style="padding: 6px 10px; text-align: center;">${it.quantity}</td>
                  <td style="padding: 6px 10px; text-align: right;">${formatCurrency(it.unit_price || it.price)}</td>
                  <td style="padding: 6px 10px; text-align: right; font-weight: 700;">${formatCurrency(it.subtotal || (it.price * it.quantity))}</td>
                </tr>
              `).join('') : `
                <tr><td colspan="4" style="padding: 10px; text-align: center; color: #9ca3af;">Assorted Festival Box Package</td></tr>
              `}
            </tbody>
          </table>
        </div>

        <div style="display: flex; justify-content: flex-end; font-size: 1.2rem; font-weight: 800; color: #c21d1d; margin-bottom: 1.5rem;">
          Total Payable: ${formatCurrency(order.total_amount)}
        </div>

        <div style="display: flex; justify-content: space-between; gap: 0.75rem; border-top: 1px solid #e5e7eb; padding-top: 1.25rem;">
          <button class="btn btn-accent btn-sm" onclick="sendOrderCustomerWhatsApp('${order.order_number}')">
            📲 WhatsApp Customer
          </button>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="closeOrderDetailsModal()">Close</button>
            <a href="../invoice.html?invoice=${order.order_number}&download=true" target="_blank" class="btn btn-sm" style="background: #059669; color: #fff; display: inline-flex; align-items: center;">📥 PDF</a>
            <button class="btn btn-primary btn-sm" onclick="closeOrderDetailsModal(); printOrderInvoice('${order.order_number}');">
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
          <a href="../invoice.html?invoice=${inv.invoice_number}&download=true" target="_blank" class="action-btn" style="color: #059669;" title="Download PDF Invoice">📥 PDF</a>
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
  document.getElementById("setUpiId").value = settings.upi_id || "";
  document.getElementById("setUpiName").value = settings.upi_name || "";

  // Supabase Credentials Config
  const currentSbUrl = localStorage.getItem("dc_supabase_url");
  const currentSbKey = localStorage.getItem("dc_supabase_anon_key");
  document.getElementById("setSupabaseUrl").value = (currentSbUrl && !currentSbUrl.includes("your-project")) ? currentSbUrl : DEFAULT_SUPABASE_URL;
  document.getElementById("setSupabaseAnonKey").value = (currentSbKey && !currentSbKey.includes("your-public-anon-key")) ? currentSbKey : DEFAULT_SUPABASE_ANON_KEY;

  const form = document.getElementById("settingsForm");
  if (form) {
    form.addEventListener("submit", saveAdminSettings);
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
    google_review_url: (document.getElementById("setGoogleReviewUrl") ? document.getElementById("setGoogleReviewUrl").value.trim() : "") || "https://share.google/AwTsdLuk9OtRHQhbR"
  };

  const sbUrl = document.getElementById("setSupabaseUrl").value.trim();
  const sbKey = document.getElementById("setSupabaseAnonKey").value.trim();

  if (sbUrl) localStorage.setItem("dc_supabase_url", sbUrl);
  if (sbKey) localStorage.setItem("dc_supabase_anon_key", sbKey);

  localStorage.setItem("dc_business_settings", JSON.stringify(settings));

  const sb = getSupabase();
  if (isSupabaseConfigured() && sb) {
    try {
      await sb.from("business_settings").upsert({ id: "a0000000-0000-0000-0000-000000000001", ...settings });
    } catch (err) {
      console.warn("Supabase settings update error", err);
    }
  }

  showToast("Business Settings updated successfully!", "success");
}
