// ==============================================================================
// Dhanalakshmi Crackers - Invoice Preview & Multi-Format Printing
// Supports A4 Full-Page, 80mm Thermal, and 58mm Thermal Receipts
// ==============================================================================

let currentViewingInvoice = null;
let currentPrintFormat = "a4"; // "a4", "80mm", "58mm"

/**
 * Open Invoice Preview & Print Modal
 */
function openInvoiceModal(invoice) {
  currentViewingInvoice = invoice;
  let modal = document.getElementById("invoicePreviewModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "invoicePreviewModal";
    modal.className = "modal-overlay";
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 850px;">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <h3 class="modal-title">Invoice #${invoice.invoice_number}</h3>
          <!-- Format Selector Buttons -->
          <div style="display: flex; gap: 0.35rem; background: #f3f4f6; padding: 3px; border-radius: 8px;">
            <button class="btn btn-sm ${currentPrintFormat === 'a4' ? 'btn-primary' : 'btn-secondary'}" onclick="setInvoiceFormat('a4')">📄 A4</button>
            <button class="btn btn-sm ${currentPrintFormat === '80mm' ? 'btn-primary' : 'btn-secondary'}" onclick="setInvoiceFormat('80mm')">🧾 80mm</button>
            <button class="btn btn-sm ${currentPrintFormat === '58mm' ? 'btn-primary' : 'btn-secondary'}" onclick="setInvoiceFormat('58mm')">🧾 58mm</button>
          </div>
        </div>
        <button class="modal-close" onclick="closeInvoiceModal()">&times;</button>
      </div>

      <div class="modal-body" style="background: #e5e7eb; padding: 1.5rem; max-height: 70vh; overflow-y: auto;">
        <div id="printableInvoice">
          <!-- Dynamically generated according to currentPrintFormat -->
        </div>
      </div>

      <div class="modal-footer" style="background: #fff; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-accent btn-sm" onclick="shareCurrentInvoiceWhatsApp()">
            📲 WhatsApp Customer
          </button>
          <button class="btn btn-secondary btn-sm" onclick="emailCurrentInvoice()">
            ✉️ Email
          </button>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-secondary btn-sm" onclick="closeInvoiceModal()">Close</button>
          <button class="btn btn-primary btn-sm" onclick="triggerBrowserPrint()">
            🖨️ Print
          </button>
          <button class="btn btn-primary btn-sm" style="background: #059669; border-color: #059669;" onclick="downloadInvoicePDF(currentViewingInvoice)">
            📥 Download PDF
          </button>
        </div>
      </div>
    </div>
  `;

  renderFormattedInvoiceContent();
  modal.style.display = "flex";
}

function closeInvoiceModal() {
  const modal = document.getElementById("invoicePreviewModal");
  if (modal) modal.style.display = "none";
}

/**
 * Switch between A4, 80mm, and 58mm layouts
 */
function setInvoiceFormat(format) {
  currentPrintFormat = format;
  renderFormattedInvoiceContent();
  
  // Update button highlights
  const buttons = document.querySelectorAll(".modal-header .btn-sm");
  buttons.forEach(btn => {
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-secondary");
  });
  if (event && event.target) {
    event.target.classList.remove("btn-secondary");
    event.target.classList.add("btn-primary");
  }
}

/**
 * Render the invoice HTML based on selected format
 */
function renderFormattedInvoiceContent() {
  const container = document.getElementById("printableInvoice");
  if (!container || !currentViewingInvoice) return;

  const inv = currentViewingInvoice;
  const settings = JSON.parse(localStorage.getItem("dc_business_settings") || "{}");
  const shopName = settings.shop_name || "Dhanalakshmi Crackers";
  const shopAddress = settings.address || "142, By-pass Road, Sivakasi - 626123";
  const shopPhone = settings.phone || "+91 98765 43210";
  const gstNo = settings.gst_number || "";
  const logoUrl = settings.logo_url || "";
  const isTaxApplicable = settings.tax_applicable !== false && Number(inv.tax_amount || 0) > 0;
  const footerNote = settings.invoice_footer || "Thank you for celebrating with Dhanalakshmi Crackers!";
  const dateStr = inv.created_at ? new Date(inv.created_at).toLocaleString("en-IN") : new Date().toLocaleString("en-IN");

  if (currentPrintFormat === "a4") {
    container.className = "invoice-print-container format-a4";
    container.innerHTML = `
      <div class="header-grid">
        <div style="display: flex; gap: 1rem; align-items: center;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${shopName}" style="max-height: 65px; border-radius: 6px;">` : ''}
          <div>
            <div class="invoice-title">${shopName}</div>
            <div style="color: #6b7280; font-size: 13px;">${shopAddress}</div>
            <div style="color: #6b7280; font-size: 13px;">Phone: ${shopPhone} ${isTaxApplicable && gstNo ? `| GSTIN: ${gstNo}` : ''}</div>
          </div>
        </div>
        <div style="text-align: right;">
          <h2 style="font-size: 20px; color: #111827; margin-bottom: 4px;">${isTaxApplicable ? 'TAX INVOICE' : 'RETAIL INVOICE'}</h2>
          <div style="font-weight: 700; color: #b91c1c;">${inv.invoice_number}</div>
          <div style="font-size: 12px; color: #6b7280;">Date: ${dateStr}</div>
        </div>
      </div>

      <div class="meta-grid">
        <div style="background: #f9fafb; padding: 12px; border-radius: 6px;">
          <div style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">Billed To:</div>
          <div style="font-weight: 700; font-size: 14px;">${inv.customer_name || 'Walk-in Customer'}</div>
          <div style="font-size: 13px; color: #4b5563;">Phone: ${inv.customer_phone || 'N/A'}</div>
          ${inv.customer_address ? `<div style="font-size: 12px; color: #6b7280;">${inv.customer_address}</div>` : ''}
        </div>
        <div style="background: #f9fafb; padding: 12px; border-radius: 6px; text-align: right;">
          <div style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">Payment Info:</div>
          <div>Mode: <strong>${inv.payment_method}</strong></div>
          <div>Status: <strong style="color: #15803d;">${inv.payment_status.toUpperCase()}</strong></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 50px;">S.No</th>
            <th>Item Description</th>
            <th style="width: 100px;">SKU</th>
            <th style="width: 90px; text-align: right;">Rate (₹)</th>
            <th style="width: 70px; text-align: center;">Qty</th>
            <th style="width: 110px; text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${(inv.items || []).map((item, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td style="font-weight: 600;">${item.product_name}</td>
              <td style="color: #6b7280;">${item.sku || '-'}</td>
              <td style="text-align: right;">${Number(item.unit_price).toFixed(2)}</td>
              <td style="text-align: center; font-weight: 700;">${item.quantity}</td>
              <td style="text-align: right; font-weight: 700;">${Number(item.subtotal).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals-table">
        <div class="summary-row">
          <span>Subtotal:</span>
          <span>₹${Number(inv.subtotal).toFixed(2)}</span>
        </div>
        ${inv.discount_amount > 0 ? `
          <div class="summary-row">
            <span>Discount:</span>
            <span>- ₹${Number(inv.discount_amount).toFixed(2)}</span>
          </div>
        ` : ''}
        ${isTaxApplicable ? `
          <div class="summary-row">
            <span>GST (${inv.tax_rate}%):</span>
            <span>₹${Number(inv.tax_amount || 0).toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="summary-row total-row">
          <span>Grand Total:</span>
          <span class="total-val">₹${Number(inv.total_amount).toFixed(2)}</span>
        </div>
      </div>

      <div style="border-top: 1px dashed #d1d5db; padding-top: 15px; text-align: center; font-size: 12px; color: #6b7280;">
        <p>${footerNote}</p>
        <p style="font-size: 11px; margin-top: 4px;">For any queries or bulk festival bookings, call: ${shopPhone}</p>
      </div>
    `;
  } else {
    // Thermal Receipt (80mm or 58mm)
    const is80 = currentPrintFormat === "80mm";
    container.className = `invoice-print-container format-${currentPrintFormat}`;
    container.innerHTML = `
      <div class="thermal-center">
        ${logoUrl ? `<img src="${logoUrl}" alt="${shopName}" style="max-height: 40px; margin-bottom: 4px;">` : ''}
        <div class="thermal-shop-name">${shopName}</div>
        <div>${shopAddress}</div>
        <div>Tel: ${shopPhone}</div>
        ${isTaxApplicable && gstNo ? `<div>GSTIN: ${gstNo}</div>` : ''}
      </div>

      <div class="thermal-divider"></div>

      <div class="thermal-row">
        <span>Inv: ${inv.invoice_number}</span>
        <span>${dateStr.split(",")[0]}</span>
      </div>
      <div class="thermal-row">
        <span>Cust: ${inv.customer_name || 'Walk-in'}</span>
        <span>Ph: ${inv.customer_phone || '-'}</span>
      </div>

      <div class="thermal-double-divider"></div>

      <table class="thermal-table">
        <thead>
          <tr>
            <th style="text-align: left;">Item</th>
            <th style="text-align: center;">Qty</th>
            <th class="text-right">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${(inv.items || []).map(item => `
            <tr>
              <td>${item.product_name}</td>
              <td style="text-align: center;">${item.quantity}</td>
              <td class="text-right">₹${Number(item.subtotal).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="thermal-divider"></div>

      <div class="thermal-row">
        <span>Subtotal:</span>
        <span>₹${Number(inv.subtotal).toFixed(2)}</span>
      </div>
      ${inv.discount_amount > 0 ? `
        <div class="thermal-row">
          <span>Discount:</span>
          <span>-₹${Number(inv.discount_amount).toFixed(2)}</span>
        </div>
      ` : ''}
      ${isTaxApplicable ? `
        <div class="thermal-row">
          <span>GST (${inv.tax_rate}%):</span>
          <span>₹${Number(inv.tax_amount || 0).toFixed(2)}</span>
        </div>
      ` : ''}

      <div class="thermal-double-divider"></div>

      <div class="thermal-row thermal-bold" style="font-size: ${is80 ? '13px' : '11px'};">
        <span>TOTAL:</span>
        <span>₹${Number(inv.total_amount).toFixed(2)}</span>
      </div>
      <div class="thermal-row">
        <span>Pay Mode:</span>
        <span>${inv.payment_method} (${inv.payment_status.toUpperCase()})</span>
      </div>

      <div class="thermal-divider"></div>

      <div class="thermal-footer">
        ${footerNote}
        <br>*** VISIT AGAIN ***
      </div>
    `;
  }
}

/**
 * Trigger standard browser print with format class attached to body
 */
function triggerBrowserPrint() {
  document.body.classList.remove("print-mode-a4", "print-mode-80mm", "print-mode-58mm");
  document.body.classList.add(`print-mode-${currentPrintFormat}`);
  window.print();
}

/**
 * Send current viewed invoice via WhatsApp with PDF download link
 */
function shareCurrentInvoiceWhatsApp() {
  if (!currentViewingInvoice) return;
  const phone = currentViewingInvoice.customer_phone || prompt("Enter customer WhatsApp mobile number (10 digits):");
  if (phone) {
    const settings = JSON.parse(localStorage.getItem("dc_business_settings") || "{}");
    sendInvoiceViaWhatsApp(phone, currentViewingInvoice, settings);
  }
}

/**
 * Generate and download PDF invoice directly
 */
function downloadInvoicePDF(invoice = null) {
  const inv = invoice || currentViewingInvoice;
  if (!inv) {
    alert("No invoice selected to download.");
    return;
  }

  const fileName = `Invoice-${inv.invoice_number}.pdf`;
  const printableEl = document.getElementById("printableInvoice");

  if (typeof html2pdf !== "undefined" && printableEl) {
    // If not A4 format, temporarily switch to A4 for high quality PDF
    const prevFormat = currentPrintFormat;
    currentPrintFormat = "a4";
    renderFormattedInvoiceContent();

    const opt = {
      margin: [10, 10, 10, 10],
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(printableEl).save().then(() => {
      currentPrintFormat = prevFormat;
      renderFormattedInvoiceContent();
      if (typeof showToast === "function") showToast("Invoice PDF downloaded successfully! 📄", "success");
    }).catch(err => {
      console.warn("PDF generation error, opening invoice print view:", err);
      window.open(`/invoice.html?invoice=${inv.invoice_number}&download=true`, "_blank");
    });
  } else {
    // Navigate or open dedicated invoice page with auto-download
    window.open(`/invoice.html?invoice=${inv.invoice_number}&download=true`, "_blank");
  }
}

/**
 * Send invoice details and PDF link via Email
 */
function emailCurrentInvoice() {
  const inv = currentViewingInvoice;
  if (!inv) return;

  const email = inv.customer_email || prompt("Enter customer email address:", "customer@example.com");
  if (!email) return;

  const settings = JSON.parse(localStorage.getItem("dc_business_settings") || "{}");
  const shopName = settings.shop_name || "Dhanalakshmi Crackers";
  const downloadUrl = `${window.location.origin}/invoice.html?invoice=${inv.invoice_number}&download=true`;

  const subject = encodeURIComponent(`Invoice #${inv.invoice_number} from ${shopName} [PAID]`);
  const body = encodeURIComponent(
`Dear ${inv.customer_name || 'Customer'},

Thank you for your fireworks order with ${shopName}!

Invoice Number: #${inv.invoice_number}
Total Paid: ₹${Number(inv.total_amount).toFixed(2)}
Payment Mode: ${inv.payment_method} (PAID)

You can view and download your official GST Tax Invoice PDF anytime using the link below:
${downloadUrl}

Wishing you and your family a sparkling and safe Diwali!

Best regards,
${shopName}
${settings.phone || '+91 98765 43210'}
${settings.address || '142, By-pass Road, Sivakasi'}`
  );

  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

