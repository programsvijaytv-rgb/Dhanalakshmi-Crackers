// ==============================================================================
// Dhanalakshmi Crackers - WhatsApp Integration
// Formatted invoice sharing via WhatsApp Click-to-Chat API
// ==============================================================================

/**
 * Clean phone number to WhatsApp international standard (e.g. 919876543210)
 */
function cleanPhoneNumber(phone) {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }
  return cleaned;
}

/**
 * Format invoice receipt for WhatsApp sharing
 */
function formatWhatsAppInvoiceMessage(invoice, businessSettings = null) {
  const shopName = businessSettings?.shop_name || "Dhanalakshmi Crackers";
  const contactPhone = businessSettings?.whatsapp_phone || businessSettings?.phone || "+91 94431 88531";
  const dateStr = invoice.created_at ? new Date(invoice.created_at).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");
  const isTaxApplicable = businessSettings?.tax_applicable !== false && Number(invoice.tax_amount || 0) > 0;
  const taxLine = isTaxApplicable ? `GST / Tax (${invoice.tax_rate || 18}%): + ₹${Number(invoice.tax_amount || 0).toFixed(2)}\n` : "";

  let paymentLinkLine = "";
  const paymentStatus = (invoice.payment_status || "paid").toLowerCase();
  if (paymentStatus !== "paid" && businessSettings?.upi_id) {
    const upiLink = `upi://pay?pa=${businessSettings.upi_id}&pn=${encodeURIComponent(shopName)}&am=${Number(invoice.total_amount || 0).toFixed(2)}&tn=${encodeURIComponent('Bill ' + invoice.invoice_number)}`;
    paymentLinkLine = `📲 *Pay via UPI:* ${businessSettings.upi_id}\n🔗 UPI Link: ${upiLink}\n`;
  }
  
  let itemsSummary = "";
  if (invoice.items && Array.isArray(invoice.items)) {
    invoice.items.forEach((item, index) => {
      itemsSummary += `▫️ ${index + 1}. *${item.product_name}* (${item.quantity} x ₹${Number(item.unit_price || 0).toFixed(2)}) = ₹${Number(item.subtotal || 0).toFixed(2)}\n`;
    });
  }

  const origin = (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin !== "null") ? window.location.origin : "";
  const pdfDownloadLink = origin ? `📄 *Download Official PDF Invoice:*\n${origin}/invoice.html?invoice=${invoice.invoice_number}&download=true\n` : `📄 *Invoice Number:* ${invoice.invoice_number}\n`;
  const subtotalAmt = Number(invoice.subtotal || invoice.total_amount || 0).toFixed(2);
  const discountAmt = Number(invoice.discount_amount || 0);
  const totalAmt = Number(invoice.total_amount || 0).toFixed(2);
  const payStatusStr = (invoice.payment_status || "paid").toUpperCase();

  const message = 
`🎆 *${shopName}* 🎆
_Direct from Sivakasi - Safe & Certified Fireworks_

🧾 *INVOICE: ${invoice.invoice_number}*
📅 *Date:* ${dateStr}
👤 *Customer:* ${invoice.customer_name || 'Valued Customer'}
━━━━━━━━━━━━━━━━━━━━━
*PURCHASE DETAILS:*
${itemsSummary}━━━━━━━━━━━━━━━━━━━━━
Subtotal: ₹${subtotalAmt}
${discountAmt > 0 ? `Discount: - ₹${discountAmt.toFixed(2)}\n` : ""}${taxLine}*GRAND TOTAL: ₹${totalAmt}*
💳 *Payment Mode:* ${invoice.payment_method || 'CASH'}
✅ *Status:* ${payStatusStr}
${paymentLinkLine}━━━━━━━━━━━━━━━━━━━━━
${pdfDownloadLink}━━━━━━━━━━━━━━━━━━━━━
✨ Thank you for choosing ${shopName}!
Wishing you and your family a safe, sparkling Diwali! 🪔
📞 Helpline / WhatsApp: ${contactPhone}`;

  return message;
}

/**
 * Format online order notification for customer or store
 */
function formatWhatsAppOrderMessage(order, businessSettings = null) {
  const shopName = businessSettings?.shop_name || "Dhanalakshmi Crackers";
  const origin = (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin !== "null") ? window.location.origin : "";
  const pdfDownloadLink = origin ? `📄 *Download PDF Invoice:*\n${origin}/invoice.html?order=${order.order_number}&download=true\n` : "";
  
  let itemsSummary = "";
  if (order.items && Array.isArray(order.items)) {
    order.items.forEach((item, index) => {
      itemsSummary += `▫️ ${index + 1}. *${item.product_name}* (${item.quantity} Nos) - ₹${Number(item.subtotal || 0).toFixed(2)}\n`;
    });
  }

  return `🎆 *ORDER CONFIRMED - ${shopName}* 🎆
🛒 *Order Number:* ${order.order_number}
👤 *Customer:* ${order.customer_name}
📱 *Phone:* ${order.customer_phone}
📍 *Address:* ${order.customer_address}
━━━━━━━━━━━━━━━━━━━━━
*ITEMS ORDERED:*
${itemsSummary}━━━━━━━━━━━━━━━━━━━━━
*TOTAL AMOUNT:* ₹${Number(order.total_amount || 0).toFixed(2)}
💳 *Payment:* ${order.payment_method} (${order.payment_status ? order.payment_status.toUpperCase() : 'PENDING'})
━━━━━━━━━━━━━━━━━━━━━
${pdfDownloadLink}✨ Thank you for choosing Dhanalakshmi Crackers!`;
}

/**
 * Open WhatsApp click-to-chat in a new tab or trigger native app on mobile
 */
function sendInvoiceViaWhatsApp(customerPhone, invoice, businessSettings = null) {
  if (!businessSettings && typeof localStorage !== "undefined") {
    try {
      businessSettings = JSON.parse(localStorage.getItem("dc_business_settings") || "{}");
    } catch (e) {}
  }

  let phone = cleanPhoneNumber(customerPhone);
  if (!phone || phone.length < 10) {
    const prefill = (customerPhone && /\d/.test(customerPhone)) ? String(customerPhone).replace(/[^0-9]/g, "") : "";
    const entered = prompt("Enter customer 10-digit WhatsApp mobile number (e.g. 9876543210):", prefill);
    if (!entered) {
      if (typeof showToast === "function") showToast("WhatsApp sending cancelled.", "info");
      return false;
    }
    phone = cleanPhoneNumber(entered);
  }

  if (!phone || phone.length < 10) {
    if (typeof showToast === "function") showToast("Please provide a valid 10-digit mobile number.", "error");
    return false;
  }

  try {
    const text = formatWhatsAppInvoiceMessage(invoice, businessSettings);
    // Use api.whatsapp.com for best mobile deep-linking compatibility
    const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
    
    // Popup-blocker-safe dispatch:
    const link = document.createElement("a");
    link.href = waUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Fallback for strict mobile browsers that block new tab popups
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (isMobile) {
      setTimeout(() => {
        // If still on the same page after 400ms, direct redirect to launch WhatsApp app
        if (!document.hidden) {
          window.location.href = waUrl;
        }
      }, 400);
    }

    if (typeof showToast === "function") showToast("Opening WhatsApp with invoice details...", "success");
    return true;
  } catch (err) {
    console.error("WhatsApp format error:", err);
    if (typeof showToast === "function") showToast("Could not prepare WhatsApp message: " + err.message, "error");
    return false;
  }
}
