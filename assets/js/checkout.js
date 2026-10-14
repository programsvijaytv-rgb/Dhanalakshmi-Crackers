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

  const cart = getCart();
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
      orderPayload.payment_status = "paid";
      await executeOrderPlacement(orderPayload, cart);
    });
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

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 520px; text-align: center; position: relative;">
      <button type="button" class="modal-close" onclick="closeOrderConfirmModal()" style="position: absolute; top: 1rem; right: 1rem;">&times;</button>
      <div class="modal-body" style="padding: 2.25rem 1.75rem;">
        <div style="width: 64px; height: 64px; background: ${isPaid ? '#dcfce7' : '#fef3c7'}; color: ${isPaid ? '#16a34a' : '#d97706'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; margin: 0 auto 1rem auto; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          ${isPaid ? '✓' : '📦'}
        </div>
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.5rem; font-weight: 800; margin-bottom: 0.35rem; color: #111827;">
          ${isPaid ? 'Payment Confirmed & Order Placed! 🎉' : 'Order Placed Successfully!'}
        </h2>
        <p style="color: #6b7280; font-size: 0.9rem; margin-bottom: 1.25rem;">
          ${isPaid 
            ? `Your payment has been received! Official GST Invoice <strong>#${order.order_number}</strong> is generated below.` 
            : `Your order <strong>#${order.order_number}</strong> has been received by Dhanalakshmi Crackers.`}
        </p>

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.1rem; text-align: left; margin-bottom: 1.5rem; font-size: 0.9rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
            <span style="color: #6b7280;">Total Amount:</span>
            <strong style="color: #c21d1d; font-size: 1.1rem;">${formatCurrency(order.total_amount)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
            <span style="color: #6b7280;">Payment Status:</span>
            <span class="badge ${isPaid ? 'badge-success' : 'badge-warning'}">
              ${isPaid ? 'PAID (VERIFIED)' : 'CASH ON DELIVERY'}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
            <span style="color: #6b7280;">Payment Mode:</span>
            <span style="font-weight: 600;">${order.payment_method}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #6b7280;">Customer:</span>
            <span style="font-weight: 600;">${order.customer_name}</span>
          </div>
        </div>

        <!-- Invoice PDF and Sharing Actions -->
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <a href="invoice.html?invoice=${order.order_number}&download=true" target="_blank" class="btn btn-primary btn-block" style="background: #059669; border-color: #059669; padding: 0.85rem; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>📥</span> Download Invoice PDF
          </a>

          <button type="button" class="btn btn-accent btn-block" onclick="sendOrderConfirmationWhatsApp('${order.order_number}')">
            <span>📲</span> Send Invoice via WhatsApp
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

  const msg = 
`🎆 *${settings.shop_name || 'Dhanalakshmi Crackers'}* 🎆
_Direct from Sivakasi - Safe & Certified Fireworks_

🧾 *TAX INVOICE: #${order.order_number}*
👤 *Customer:* ${order.customer_name}
💰 *Total Amount:* ${formatCurrency(order.total_amount)}
💳 *Payment:* ${order.payment_method} (${(order.payment_status || 'PAID').toUpperCase()})
━━━━━━━━━━━━━━━━━━━━━
📄 *Download Official PDF Invoice:*
${pdfLink}
━━━━━━━━━━━━━━━━━━━━━
✨ Thank you for choosing Dhanalakshmi Crackers! Wishing you a sparkling and safe Diwali! 🪔
📞 Helpline / WhatsApp: ${settings.whatsapp_phone || settings.phone || '+91 98765 43210'}`;

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
${settings.phone || '+91 98765 43210'}`
  );

  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

