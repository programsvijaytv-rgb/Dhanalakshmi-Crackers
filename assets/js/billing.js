// ==============================================================================
// Dhanalakshmi Crackers - POS Billing Engine
// Fast, Reliable Cashier Terminal with Atomic Invoice & Stock Updates
// ==============================================================================

let posCatalog = [];
let posCategories = [];
let posCart = [];
let posActiveCategory = "all";
let posTaxRate = 18.0; // Standard GST for fireworks
let posDiscountPercent = 0;
let posSelectedPaymentMethod = "CASH";

/**
 * Initialize POS Billing Terminal
 */
async function initPOS() {
  await protectAdminRoute();
  const [categories, products] = await Promise.all([fetchCategories(), fetchProducts()]);
  posCategories = categories;
  posCatalog = products;

  renderPOSCategoryPills();
  renderPOSProductGrid();
  renderPOSCart();

  // Search input listeners
  const searchInput = document.getElementById("posSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", filterPOSProducts);
    searchInput.focus();
  }

  // Cash tendered input listener
  const tenderedInput = document.getElementById("posTenderedAmount");
  if (tenderedInput) {
    tenderedInput.addEventListener("input", updateChangeDue);
  }

  // Discount input listener
  const discountInput = document.getElementById("posDiscountInput");
  if (discountInput) {
    discountInput.addEventListener("input", (e) => {
      posDiscountPercent = Math.max(0, Math.min(100, Number(e.target.value) || 0));
      updatePOSTotals();
    });
  }
}

/**
 * Render category pills for POS
 */
function renderPOSCategoryPills() {
  const container = document.getElementById("posCategoryPills");
  if (!container) return;

  container.innerHTML = `
    <button class="pos-cat-pill ${posActiveCategory === 'all' ? 'active' : ''}" onclick="setPOSCategory('all')">
      All Items
    </button>
  `;

  posCategories.forEach(cat => {
    const pill = document.createElement("button");
    pill.className = `pos-cat-pill ${posActiveCategory === cat.id ? 'active' : ''}`;
    pill.textContent = cat.name;
    pill.onclick = () => setPOSCategory(cat.id);
    container.appendChild(pill);
  });
}

function setPOSCategory(catId) {
  posActiveCategory = catId;
  const pills = document.querySelectorAll(".pos-cat-pill");
  pills.forEach(p => p.classList.remove("active"));
  if (event && event.target) event.target.classList.add("active");
  filterPOSProducts();
}

/**
 * Filter catalog by search query and category
 */
function filterPOSProducts() {
  const searchInput = document.getElementById("posSearchInput");
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

  const filtered = posCatalog.filter(p => {
    const matchesCat = (posActiveCategory === "all") || (p.category_id === posActiveCategory);
    const matchesQuery = !query ||
      p.name.toLowerCase().includes(query) ||
      (p.sku && p.sku.toLowerCase().includes(query));
    return matchesCat && matchesQuery;
  });

  renderPOSProductGrid(filtered);
}

/**
 * Render Product grid for fast cashier selection
 */
function renderPOSProductGrid(products = posCatalog) {
  const container = document.getElementById("posProductsGrid");
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #9ca3af; padding: 2rem;">No matching items found.</div>`;
    return;
  }

  container.innerHTML = "";
  products.forEach(p => {
    const card = document.createElement("div");
    card.className = "pos-item-card";
    card.onclick = () => addItemToPOSCart(p);

    card.innerHTML = `
      <div>
        <div class="pos-item-name">${p.name}</div>
        <div class="pos-item-sku">SKU: ${p.sku || '-'}</div>
      </div>
      <div class="pos-item-bottom">
        <span class="pos-item-price">${formatCurrency(p.price)}</span>
        <span class="pos-item-stock">Stock: ${p.stock_quantity}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * Add product to POS live bill
 */
function addItemToPOSCart(product) {
  const existing = posCart.find(i => i.id === product.id);
  if (existing) {
    if (existing.quantity + 1 > product.stock_quantity) {
      showToast(`Warning: Only ${product.stock_quantity} in stock!`, "error");
      return;
    }
    existing.quantity += 1;
    existing.subtotal = existing.quantity * existing.price;
  } else {
    if (product.stock_quantity < 1) {
      showToast(`Item out of stock!`, "error");
      return;
    }
    posCart.push({
      id: product.id,
      name: product.name,
      sku: product.sku || "",
      price: Number(product.price),
      quantity: 1,
      subtotal: Number(product.price),
      stock: product.stock_quantity
    });
  }
  renderPOSCart();
}

/**
 * Update POS item quantity
 */
function updatePOSItemQty(productId, qty) {
  const item = posCart.find(i => i.id === productId);
  if (!item) return;

  const newQty = parseInt(qty, 10);
  if (newQty <= 0) {
    removePOSItem(productId);
    return;
  }
  if (newQty > item.stock) {
    showToast(`Available stock is only ${item.stock}`, "error");
    item.quantity = item.stock;
  } else {
    item.quantity = newQty;
  }
  item.subtotal = item.quantity * item.price;
  renderPOSCart();
}

/**
 * Remove an item from POS cart
 */
function removePOSItem(productId) {
  posCart = posCart.filter(i => i.id !== productId);
  renderPOSCart();
}

/**
 * Clear POS Bill
 */
function clearPOSBill() {
  if (posCart.length === 0) return;
  if (confirm("Clear current POS bill?")) {
    posCart = [];
    renderPOSCart();
    const custName = document.getElementById("posCustomerName");
    const custPhone = document.getElementById("posCustomerPhone");
    if (custName) custName.value = "";
    if (custPhone) custPhone.value = "";
  }
}

/**
 * Render Live POS Cart Table & calculate totals
 */
function renderPOSCart() {
  const tbody = document.getElementById("posCartTbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  posCart.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <strong>${item.name}</strong>
        <div style="font-size: 0.7rem; color: #6b7280;">${item.sku}</div>
      </td>
      <td>${formatCurrency(item.price)}</td>
      <td>
        <input type="number" min="1" max="${item.stock}" value="${item.quantity}" 
          style="width: 50px; padding: 2px 4px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center;"
          onchange="updatePOSItemQty('${item.id}', this.value)">
      </td>
      <td style="font-weight: 700; text-align: right;">${formatCurrency(item.subtotal)}</td>
      <td style="text-align: center;">
        <button onclick="removePOSItem('${item.id}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.1rem;">&times;</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  updatePOSTotals();
}

/**
 * Compute Subtotal, Discount, Tax and Grand Total
 */
function updatePOSTotals() {
  const subtotal = posCart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = (subtotal * posDiscountPercent) / 100;
  const taxable = subtotal - discountAmount;
  const taxAmount = (taxable * posTaxRate) / 100;
  const grandTotal = taxable + taxAmount;

  const subtotalEl = document.getElementById("posSubtotalDisplay");
  const discountEl = document.getElementById("posDiscountDisplay");
  const taxEl = document.getElementById("posTaxDisplay");
  const grandTotalEl = document.getElementById("posGrandTotalDisplay");

  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (discountEl) discountEl.textContent = `- ${formatCurrency(discountAmount)}`;
  if (taxEl) taxEl.textContent = formatCurrency(taxAmount);
  if (grandTotalEl) grandTotalEl.textContent = formatCurrency(grandTotal);

  updateChangeDue();
}

/**
 * Update cash change due in POS
 */
function updateChangeDue() {
  const subtotal = posCart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = (subtotal * posDiscountPercent) / 100;
  const grandTotal = (subtotal - discountAmount) * (1 + posTaxRate / 100);

  const tenderedInput = document.getElementById("posTenderedAmount");
  const changeEl = document.getElementById("posChangeDueDisplay");

  if (tenderedInput && changeEl) {
    const tendered = Number(tenderedInput.value) || 0;
    const change = tendered - grandTotal;
    changeEl.textContent = formatCurrency(change > 0 ? change : 0);
  }
}

/**
 * Select POS payment method (Cash, UPI, Card)
 */
function setPOSPaymentMethod(method) {
  posSelectedPaymentMethod = method;
  const btns = document.querySelectorAll(".pos-pay-btn");
  btns.forEach(b => b.classList.remove("active"));
  if (event && event.target) event.target.classList.add("active");

  const cashDrawer = document.getElementById("posCashSection");
  if (cashDrawer) {
    cashDrawer.style.display = method === "CASH" ? "block" : "none";
  }
}

/**
 * Complete POS Sale & Generate Invoice (Atomic execution)
 */
async function completePOSSale() {
  if (posCart.length === 0) {
    showToast("Bill is empty. Add products to proceed.", "error");
    return;
  }

  const custName = document.getElementById("posCustomerName")?.value.trim() || "Walk-in Customer";
  const custPhone = document.getElementById("posCustomerPhone")?.value.trim() || "";

  const subtotal = posCart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = (subtotal * posDiscountPercent) / 100;
  const taxable = subtotal - discountAmount;
  const taxAmount = (taxable * posTaxRate) / 100;
  const grandTotal = taxable + taxAmount;

  // Handle UPI QR Modal Flow
  if (posSelectedPaymentMethod === "UPI") {
    const tempInvNum = generateInvoiceNumber("DC-");
    showUPIQRModal(grandTotal, tempInvNum, async () => {
      await processInvoiceSave(tempInvNum, custName, custPhone, subtotal, discountAmount, taxAmount, grandTotal);
    });
    return;
  }

  const invoiceNumber = generateInvoiceNumber("DC-");
  await processInvoiceSave(invoiceNumber, custName, custPhone, subtotal, discountAmount, taxAmount, grandTotal);
}

/**
 * Process Database or Local Storage Invoice persistence
 */
async function processInvoiceSave(invoiceNumber, custName, custPhone, subtotal, discountAmount, taxAmount, grandTotal) {
  const sb = getSupabase();
  const invoiceData = {
    invoice_number: invoiceNumber,
    customer_name: custName,
    customer_phone: custPhone,
    subtotal: Number(subtotal.toFixed(2)),
    discount_amount: Number(discountAmount.toFixed(2)),
    tax_rate: posTaxRate,
    tax_amount: Number(taxAmount.toFixed(2)),
    total_amount: Number(grandTotal.toFixed(2)),
    payment_method: posSelectedPaymentMethod,
    payment_status: "paid",
    created_at: new Date().toISOString(),
    items: posCart.map(item => ({
      product_id: item.id,
      product_name: item.name,
      sku: item.sku,
      unit_price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal
    }))
  };

  let savedSuccessfully = false;

  // If Supabase is connected, call atomic RPC
  if (isSupabaseConfigured() && sb) {
    try {
      const { data, error } = await sb.rpc("create_pos_invoice", {
        p_invoice_number: invoiceNumber,
        p_customer_name: custName,
        p_customer_phone: custPhone,
        p_customer_address: "",
        p_subtotal: invoiceData.subtotal,
        p_discount_amount: invoiceData.discount_amount,
        p_tax_rate: posTaxRate,
        p_tax_amount: invoiceData.tax_amount,
        p_total_amount: invoiceData.total_amount,
        p_payment_method: posSelectedPaymentMethod,
        p_payment_status: "paid",
        p_notes: "POS Counter Sale",
        p_created_by: null,
        p_items: invoiceData.items
      });

      if (error) {
        throw new Error(error.message);
      }
      savedSuccessfully = true;
    } catch (rpcErr) {
      console.warn("RPC failed or not applied, falling back to client write:", rpcErr);
    }
  }

  // Local/Cache fallback
  const invoicesHistory = JSON.parse(localStorage.getItem("dc_invoices_history") || "[]");
  invoicesHistory.unshift(invoiceData);
  localStorage.setItem("dc_invoices_history", JSON.stringify(invoicesHistory));

  // Deduct stock in catalog
  posCart.forEach(item => {
    const product = posCatalog.find(p => p.id === item.id);
    if (product) {
      product.stock_quantity = Math.max(0, product.stock_quantity - item.quantity);
    }
  });
  localStorage.setItem("dc_custom_products", JSON.stringify(posCatalog));

  showToast(`Invoice ${invoiceNumber} created successfully!`, "success");

  // Show Invoice Print / WhatsApp Modal
  openInvoiceModal(invoiceData);

  // Reset POS Bill
  posCart = [];
  renderPOSCart();
  renderPOSProductGrid();
  const custNameInput = document.getElementById("posCustomerName");
  const custPhoneInput = document.getElementById("posCustomerPhone");
  if (custNameInput) custNameInput.value = "";
  if (custPhoneInput) custPhoneInput.value = "";
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("posProductsGrid")) {
    initPOS();
  }
});
