// ==============================================================================
// Dhanalakshmi Crackers - Checkout & Order Submission
// ==============================================================================

/**
 * Initialize Checkout Page
 */
document.addEventListener("DOMContentLoaded", () => {
  const checkoutSummaryContainer = document.getElementById("checkoutItemsSummary");
  if (!checkoutSummaryContainer) return;

  const cart = getCart();
  if (cart.length === 0) {
    window.location.href = "cart.html";
    return;
  }

  renderCheckoutSummary();

  // Payment radio option visual state sync
  const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
  paymentRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.payment-method-card').forEach(card => card.classList.remove('active'));
      const activeCard = radio.closest('.payment-method-card');
      if (activeCard) activeCard.classList.add('active');
    });
  });

  const checkoutForm = document.getElementById("checkoutOrderForm");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", handleOrderSubmit);
  }
});

/**
 * Render items in checkout sidebar
 */
function renderCheckoutSummary() {
  const container = document.getElementById("checkoutItemsSummary");
  if (!container) return;

  const cart = getCart();
  container.innerHTML = "";

  cart.forEach(item => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.marginBottom = "0.75rem";
    row.style.fontSize = "0.9rem";

    row.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <div style="font-size: 0.75rem; color: #6b7280;">${item.quantity} x ${formatCurrency(item.price)}</div>
      </div>
      <div style="font-weight: 700;">
        ${formatCurrency(item.price * item.quantity)}
      </div>
    `;
    container.appendChild(row);
  });

  const totals = getCartTotals(0);
  const subtotalEl = document.getElementById("checkoutSubtotal");
  const totalEl = document.getElementById("checkoutTotal");

  if (subtotalEl) subtotalEl.textContent = formatCurrency(totals.subtotal);
  if (totalEl) totalEl.textContent = formatCurrency(totals.grandTotal);
}

/**
 * Submit Order
 */
async function handleOrderSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("custFullName")?.value.trim();
  const phone = document.getElementById("custPhone")?.value.trim();
  const address = document.getElementById("custAddress")?.value.trim();
  const city = document.getElementById("custCity")?.value.trim();
  const pincode = document.getElementById("custPincode")?.value.trim();
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || "COD";
  const notes = document.getElementById("orderNotes")?.value.trim();

  if (!name || !phone || !address || !pincode) {
    showToast("Please fill in all required customer details.", "error");
    return;
  }

  if (phone.length < 10) {
    showToast("Please enter a valid 10-digit mobile number.", "error");
    return;
  }

  let cart = getCart();
  if (cart.length === 0) {
    showToast("Your cart is empty.", "error");
    window.location.href = "products.html";
    return;
  }

  // Verify that all items in cart are active in the product catalog
  if (typeof fetchProducts === "function") {
    try {
      const activeProducts = await fetchProducts(true);
      if (Array.isArray(activeProducts) && activeProducts.length > 0) {
        const validIds = new Set(activeProducts.map(p => String(p.id)));
        const validSkus = new Set(activeProducts.filter(p => p.sku).map(p => String(p.sku).trim().toUpperCase()));
        const deletedIds = typeof getDeletedProductIds === "function" ? getDeletedProductIds() : [];

        const unavailableItems = cart.filter(item => {
          const iId = String(item.id || "").trim();
          const iSku = String(item.sku || "").trim().toUpperCase();
          if (typeof isProductDeleted === "function" && isProductDeleted(iId, iSku)) return true;
          if (deletedIds.some(d => String(d).toLowerCase() === iId.toLowerCase() || (iSku && String(d).toLowerCase() === iSku.toLowerCase()))) return true;
          return !validIds.has(iId) && (!iSku || !validSkus.has(iSku));
        });

        if (unavailableItems.length > 0) {
          if (typeof syncCartWithCatalog === "function") {
            syncCartWithCatalog(activeProducts);
          }
          renderCheckoutSummary();
          showToast(`Unavailable item(s) detected: ${unavailableItems.map(i => i.name).join(", ")}. Cart has been updated. Please review before proceeding.`, "error", 7000);
          return;
        }
      }
    } catch (_) {}
  }

  cart = getCart();
  if (cart.length === 0) {
    showToast("Your cart is empty after removing unavailable products.", "error");
    window.location.href = "products.html";
    return;
  }

  const totals = getCartTotals(0);
  const orderNumber = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const orderPayload = {
    order_number: orderNumber,
    customer_name: name,
    customer_phone: phone,
    customer_address: `${address}, ${city} - ${pincode}`,
    subtotal: totals.subtotal,
    discount: 0,
    tax_amount: 0,
    total_amount: totals.grandTotal,
    status: "pending",
    payment_status: paymentMethod === "COD" ? "unpaid" : "paid",
    payment_method: paymentMethod,
    notes: notes,
    created_at: new Date().toISOString(),
    items: cart.map(item => ({
      product_id: item.id,
      product_name: item.name,
      sku: item.sku,
      unit_price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity
    }))
  };

  // Handle UPI modal flow if selected
  if (paymentMethod === "UPI" && typeof showUPIQRModal === "function") {
    showUPIQRModal(totals.grandTotal, orderNumber, async (payResult) => {
      orderPayload.payment_status = "pending_verification";
      orderPayload.upi_utr = (payResult && payResult.utrNumber) ? payResult.utrNumber.trim() : "";
      if (orderPayload.upi_utr) {
        orderPayload.notes = (orderPayload.notes ? orderPayload.notes + " | " : "") + `UPI UTR: ${orderPayload.upi_utr}`;
      }
      await executeOrderPlacement(orderPayload, cart);
    }, { mode: "checkout" });
    return;
  }

  await executeOrderPlacement(orderPayload, cart);
}

/**
 * Persist order, generate invoice, clear cart, and display rich confirmation
 */
async function executeOrderPlacement(orderPayload, cart) {
  const submitBtn = document.getElementById("btnSubmitOrder");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Processing Order...";
  }

  // 1. Save to Supabase if configured
  const sb = getSupabase();
  if (isSupabaseConfigured() && sb) {
    try {
      const { data: insertedOrder, error: orderErr } = await sb
        .from("orders")
        .insert({
          order_number: orderPayload.order_number,
          customer_name: orderPayload.customer_name,
          customer_phone: orderPayload.customer_phone,
          customer_address: orderPayload.customer_address,
          subtotal: orderPayload.subtotal,
          total_amount: orderPayload.total_amount,
          status: "pending",
          payment_status: orderPayload.payment_status,
          payment_method: orderPayload.payment_method,
          notes: orderPayload.notes
        })
        .select()
        .single();

      if (orderErr) throw new Error(orderErr.message);

      // Insert order items
      if (insertedOrder) {
        const orderItemsToInsert = cart.map(item => ({
          order_id: insertedOrder.id,
          product_name: item.name,
          sku: item.sku,
          unit_price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity
        }));
        await sb.from("order_items").insert(orderItemsToInsert);

        // If paid, create Supabase invoice record
        if (orderPayload.payment_status === "paid") {
          await sb.from("invoices").insert({
            invoice_number: orderPayload.order_number,
            order_id: insertedOrder.id,
            customer_name: orderPayload.customer_name,
            customer_phone: orderPayload.customer_phone,
            customer_address: orderPayload.customer_address,
            subtotal: orderPayload.subtotal,
            discount_amount: orderPayload.discount || 0,
            tax_rate: 18,
            tax_amount: orderPayload.tax_amount || 0,
            total_amount: orderPayload.total_amount,
            payment_method: orderPayload.payment_method,
            payment_status: "paid"
          });
        }
      }
    } catch (err) {
      console.warn("Could not save to Supabase, saving to local store:", err);
    }
  }

  // 2. Cache order locally
  const ordersList = JSON.parse(localStorage.getItem("dc_orders_list") || "[]");
  ordersList.unshift(orderPayload);
  localStorage.setItem("dc_orders_list", JSON.stringify(ordersList));

  // 3. Automatically create corresponding invoice record
  const invoiceRecord = {
    invoice_number: orderPayload.order_number,
    order_id: orderPayload.order_number,
    customer_name: orderPayload.customer_name,
    customer_phone: orderPayload.customer_phone,
    customer_address: orderPayload.customer_address,
    subtotal: orderPayload.subtotal,
    discount_amount: orderPayload.discount || 0,
    tax_rate: 18,
    tax_amount: orderPayload.tax_amount || 0,
    total_amount: orderPayload.total_amount,
    payment_method: orderPayload.payment_method,
    payment_status: orderPayload.payment_status,
    created_at: orderPayload.created_at,
    items: orderPayload.items
  };
  const invoicesHistory = JSON.parse(localStorage.getItem("dc_invoices_history") || "[]");
  invoicesHistory.unshift(invoiceRecord);
  localStorage.setItem("dc_invoices_history", JSON.stringify(invoicesHistory));

  // 4. Deduct ordered items from local inventory stock
  try {
    const products = typeof getStoredCustomProducts === "function" 
      ? getStoredCustomProducts() 
      : JSON.parse(localStorage.getItem("dc_custom_products") || "[]");
    let stockModified = false;
    cart.forEach(item => {
      const prod = products.find(p => p.id === item.id || (item.sku && p.sku === item.sku));
      if (prod) {
        prod.stock_quantity = Math.max(0, Number(prod.stock_quantity || 0) - Number(item.quantity || 1));
        stockModified = true;
      }
    });
    if (stockModified) {
      localStorage.setItem("dc_custom_products", JSON.stringify(products));
      localStorage.setItem("dc_products_updated_at", Date.now().toString());
    }
  } catch (err) {
    console.warn("Stock deduction error:", err);
  }

  // 5. Broadcast real-time order creation and stock changes to Admin Panel & Storefront
  if (typeof broadcastSync === "function") {
    broadcastSync("order_created", orderPayload);
    broadcastSync("products_updated", { source: "online_checkout" });
  }

  // 6. Clear shopping cart
  clearCart();

  // Reset Submit Button
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Place Fireworks Order Now →";
  }

  // 7. Show Success Confirmation View
  showOrderConfirmationModal(orderPayload);
}

/**
 * Display Order Confirmation with Invoice PDF options
 */
function showOrderConfirmationModal(order) {
  let modal = document.getElementById("orderConfirmModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "orderConfirmModal";
    modal.className = "modal-overlay";
    document.body.appendChild(modal);
  }

  const isPaid = order.payment_status === "paid";
  const isPendingVerification = order.payment_status === "pending_verification" || (order.payment_method === "UPI" && !isPaid);

  let iconHtml = '📦';
  let iconBg = '#fef3c7';
  let iconColor = '#d97706';
  let headingText = 'Order Placed Successfully!';
  let subText = `Your order <strong>#${order.order_number}</strong> has been received by Dhanalakshmi Crackers.`;
  let badgeClass = 'badge-warning';
  let badgeText = 'CASH ON DELIVERY';

  if (isPaid) {
    iconHtml = '✓';
    iconBg = '#dcfce7';
    iconColor = '#16a34a';
    headingText = 'Payment Confirmed & Order Placed! 🎉';
    subText = `Your payment has been received! Official GST Invoice <strong>#${order.order_number}</strong> is generated below.`;
    badgeClass = 'badge-success';
    badgeText = 'PAID (VERIFIED)';
  } else if (isPendingVerification) {
    iconHtml = '⏳';
    iconBg = '#eff6ff';
    iconColor = '#2563eb';
    headingText = 'Order Placed — Verification Pending ⏳';
    subText = `Thank you, <strong>${order.customer_name || 'Customer'}</strong>! We have received your order <strong>#${order.order_number}</strong> with UPI payment details.`;
    badgeClass = '';
    badgeText = '⏳ PENDING VERIFICATION';
  }

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 520px; text-align: center; position: relative; border-radius: 16px; overflow: hidden;">
      <button type="button" class="modal-close" onclick="closeOrderConfirmModal()" style="position: absolute; top: 1rem; right: 1rem; font-size: 1.5rem; background: none; border: none; cursor: pointer; color: #64748b;">&times;</button>
      <div class="modal-body" style="padding: 2.25rem 1.75rem;">
        <div style="width: 64px; height: 64px; background: ${iconBg}; color: ${iconColor}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; margin: 0 auto 1rem auto; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          ${iconHtml}
        </div>
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.45rem; font-weight: 800; margin-bottom: 0.35rem; color: #111827;">
          ${headingText}
        </h2>
        <p style="color: #6b7280; font-size: 0.9rem; margin-bottom: 1.25rem; line-height: 1.45;">
          ${subText}
        </p>

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.1rem; text-align: left; margin-bottom: 1.25rem; font-size: 0.9rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
            <span style="color: #6b7280;">Total Amount:</span>
            <strong style="color: #c21d1d; font-size: 1.15rem;">${formatCurrency(order.total_amount)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem; align-items: center;">
            <span style="color: #6b7280;">Payment Status:</span>
            ${isPendingVerification ? `
              <span class="badge" style="background: #fffbeb; color: #b45309; border: 1px solid #fde68a; font-weight: 700; font-size: 0.78rem;">
                ⏳ PENDING VERIFICATION
              </span>
            ` : `
              <span class="badge ${badgeClass}">${badgeText}</span>
            `}
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
            <span style="color: #6b7280;">Payment Mode:</span>
            <span style="font-weight: 600;">${order.payment_method}</span>
          </div>
          ${order.upi_utr ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
              <span style="color: #6b7280;">UPI UTR / Ref No:</span>
              <strong style="font-family: monospace; color: #1e293b;">${order.upi_utr}</strong>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #6b7280;">Customer:</span>
            <span style="font-weight: 600;">${order.customer_name}</span>
          </div>
        </div>

        ${isPendingVerification ? `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 0.85rem 1rem; text-align: left; font-size: 0.82rem; color: #166534; margin-bottom: 1.25rem; line-height: 1.45;">
            ✅ <strong>Verification in Progress:</strong><br>
            Our store team is verifying your payment with our merchant soundbox / bank statement. Once verified, we will pack and dispatch your order. You can also send payment proof directly via WhatsApp below!
          </div>
        ` : ''}

        <!-- Invoice PDF and Sharing Actions -->
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <a href="invoice.html?invoice=${order.order_number}&download=true" target="_blank" class="btn btn-primary btn-block" style="background: #059669; border-color: #059669; padding: 0.85rem; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>📥</span> Download Invoice / Order Slip
          </a>

          <button type="button" class="btn btn-accent btn-block" onclick="sendOrderConfirmationWhatsApp('${order.order_number}')">
            <span>📲</span> ${isPendingVerification ? 'Send Payment Proof via WhatsApp' : 'Send Invoice via WhatsApp'}
          </button>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="emailOrderInvoice('${order.order_number}')">
              ✉️ Email Invoice
            </button>
            <a href="invoice.html?invoice=${order.order_number}" target="_blank" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; justify-content: center;">
              📄 View Invoice
            </a>
          </div>

          <button type="button" class="btn btn-outline btn-block" style="margin-top: 0.5rem;" onclick="closeOrderConfirmModal()">
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  `;

  modal.style.display = "flex";

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  modal.onclick = (e) => {
    if (e.target === modal) {
      closeOrderConfirmModal();
    }
  };

  // If paid, auto-prompt PDF download after a short delay for effortless customer experience
  if (isPaid) {
    showToast("Invoice PDF ready! Tap 'Download Invoice PDF' or check your downloads.", "success");
  }
}

function closeOrderConfirmModal() {
  const modal = document.getElementById("orderConfirmModal");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "";
  window.location.href = "index.html";
}

/**
 * Send order confirmation and PDF link to WhatsApp
 */
function sendOrderConfirmationWhatsApp(orderNumber) {
  const ordersList = JSON.parse(localStorage.getItem("dc_orders_list") || "[]");
  const order = ordersList.find(o => o.order_number === orderNumber);
  if (!order) return;

  const settings = JSON.parse(localStorage.getItem("dc_business_settings") || "{}");
  const phone = cleanPhoneNumber(order.customer_phone);
  if (!phone) {
    showToast("No valid phone number found", "error");
    return;
  }

  const origin = window.location.origin;
  const pdfLink = `${origin}/invoice.html?invoice=${order.order_number}&download=true`;

  const isPendingVerification = order.payment_status === "pending_verification" || (order.payment_method === "UPI" && order.payment_status !== "paid");
  const payStatusDisplay = isPendingVerification 
    ? `UPI (PENDING VERIFICATION)${order.upi_utr ? '\n🔢 *UPI UTR / Ref:* ' + order.upi_utr : ''}`
    : `${order.payment_method} (${(order.payment_status || 'PAID').toUpperCase()})`;

  const msg = 
`🎆 *${settings.shop_name || 'Dhanalakshmi Crackers'}* 🎆
_Direct from Sivakasi - Safe & Certified Fireworks_

🧾 *ORDER: #${order.order_number}*
👤 *Customer:* ${order.customer_name}
💰 *Total Amount:* ${formatCurrency(order.total_amount)}
💳 *Payment:* ${payStatusDisplay}
━━━━━━━━━━━━━━━━━━━━━
📄 *Download Official PDF Invoice / Slip:*
${pdfLink}
━━━━━━━━━━━━━━━━━━━━━
${isPendingVerification ? '⏳ *Verification:* Store staff will verify receipt in merchant soundbox/bank before dispatch.\n━━━━━━━━━━━━━━━━━━━━━\n' : ''}✨ Thank you for choosing Dhanalakshmi Crackers! Wishing you a sparkling and safe Diwali! 🪔
📞 Helpline / WhatsApp: ${settings.whatsapp_phone || settings.phone || '+91 94431 88531'}`;

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
}

/**
 * Send order invoice PDF link via customer's email client
 */
function emailOrderInvoice(orderNumber) {
  const ordersList = JSON.parse(localStorage.getItem("dc_orders_list") || "[]");
  const order = ordersList.find(o => o.order_number === orderNumber);
  if (!order) return;

  const email = prompt("Enter customer email address:", "customer@example.com");
  if (!email) return;

  const settings = JSON.parse(localStorage.getItem("dc_business_settings") || "{}");
  const shopName = settings.shop_name || "Dhanalakshmi Crackers";
  const downloadUrl = `${window.location.origin}/invoice.html?invoice=${order.order_number}&download=true`;

  const subject = encodeURIComponent(`Invoice #${order.order_number} - ${shopName} [PAID]`);
  const body = encodeURIComponent(
`Dear ${order.customer_name},

Thank you for your order with ${shopName}!

Invoice / Order Number: #${order.order_number}
Total Amount: ${formatCurrency(order.total_amount)}
Payment Method: ${order.payment_method} (${(order.payment_status || 'PAID').toUpperCase()})

You can download your official GST Tax Invoice PDF anytime using the link below:
${downloadUrl}

Wishing you and your family a safe, sparkling Diwali!

Best regards,
${shopName} Sivakasi
${settings.phone || '+91 94431 88531'}`
  );

  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

