// ==============================================================================
// Dhanalakshmi Crackers - Invoice Preview & Multi-Format Printing
// Supports A4 Full-Page (CA/GST Compliant), 80mm Thermal, and 58mm Thermal Receipts
// ==============================================================================

let currentViewingInvoice = null;
let currentPrintFormat = localStorage.getItem("dc_default_print_format") || "a4"; // "a4", "80mm", "58mm"

/**
 * Convert numbers to Indian Rupees in Words (e.g. INR One Thousand Seven Hundred Only)
 */
function numberToIndianWords(amount) {
  const words = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function numToWords(n) {
    if (n === 0) return '';
    if (n < 20) return words[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + words[n % 10] : '') + ' ';
    if (n < 1000) return words[Math.floor(n / 100)] + ' Hundred ' + (n % 100 !== 0 ? numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? numToWords(n % 1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? numToWords(n % 100000) : '');
    return numToWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? numToWords(n % 10000000) : '');
  }

  const rounded = Math.round(Number(amount) || 0);
  if (rounded === 0) return 'INR Zero Only';
  return 'INR ' + numToWords(rounded).trim() + ' Only';
}

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
    <div class="modal-content invoice-preview-modal-content" style="max-width: 880px;">
      <div class="modal-header invoice-modal-header">
        <div class="invoice-modal-title-row">
          <h3 class="modal-title" style="margin:0;">Invoice #${invoice.invoice_number}</h3>
          <!-- Format Selector Buttons -->
          <div class="invoice-format-pill-group">
            <button type="button" class="btn btn-sm ${currentPrintFormat === 'a4' ? 'btn-primary' : 'btn-secondary'}" onclick="setInvoiceFormat('a4')">📄 A4</button>
            <button type="button" class="btn btn-sm ${currentPrintFormat === '80mm' ? 'btn-primary' : 'btn-secondary'}" onclick="setInvoiceFormat('80mm')">🧾 80mm</button>
            <button type="button" class="btn btn-sm ${currentPrintFormat === '58mm' ? 'btn-primary' : 'btn-secondary'}" onclick="setInvoiceFormat('58mm')">🧾 58mm</button>
          </div>
        </div>
        <div class="invoice-modal-header-actions">
          <button type="button" class="btn btn-accent btn-sm" onclick="shareCurrentInvoiceWhatsApp()" style="font-size: 0.78rem; padding: 4px 8px;" title="Send Invoice via WhatsApp">
            📲 WhatsApp
          </button>
          <a href="/invoice.html?invoice=${invoice.invoice_number}" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 0.78rem; text-decoration:none;" title="Open Standalone Invoice Page">
            🔗 Full Tab
          </a>
          <button class="modal-close" onclick="closeInvoiceModal()">&times;</button>
        </div>
      </div>

      <div class="modal-body" style="background: #e2e8f0; padding: 1.25rem; max-height: 75vh; overflow-y: auto;">
        <div id="printableInvoice">
          <!-- Dynamically generated according to currentPrintFormat -->
        </div>
      </div>

      <div class="modal-footer invoice-modal-footer">
        <div class="invoice-modal-share-actions">
          <button type="button" class="btn btn-accent btn-sm" onclick="shareCurrentInvoiceWhatsApp()">
            📲 WhatsApp
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="emailCurrentInvoice()">
            ✉️ Email
          </button>
        </div>
        <div class="invoice-modal-print-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeInvoiceModal()">Close</button>
          <button type="button" class="btn btn-primary btn-sm" onclick="triggerBrowserPrint()">
            🖨️ Print
          </button>
          <button type="button" class="btn btn-primary btn-sm" style="background: #059669; border-color: #059669;" onclick="downloadInvoicePDF(currentViewingInvoice)">
            📥 PDF
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
    if (btn.textContent.includes("Full Tab")) return;
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
  const shopAddress = settings.address || "142, By-pass Road, Sivakasi - 626123, Tamil Nadu";
  const shopPhone = settings.phone || "+91 94431 88531";
  const gstNo = settings.gst_number || "33AAAAA0000A1Z5";
  const isInsideAdmin = typeof window !== "undefined" && window.location.pathname.includes("/admin");
  const defaultLocalLogo = isInsideAdmin ? "../assets/img/Dhanalakshmi%20Crackers_%2040%20Years%20of%20Celebration.png" : "assets/img/Dhanalakshmi%20Crackers_%2040%20Years%20of%20Celebration.png";
  const logoUrl = settings.logo_url || defaultLocalLogo;
  const isTaxApplicable = settings.tax_applicable !== false;
  const footerNote = settings.invoice_footer || "Thank you for shopping with Dhanalakshmi Crackers! Have a safe and sparkling Diwali celebration. 🪔";
  const dateStr = inv.created_at ? new Date(inv.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString("en-IN");
  const timeStr = inv.created_at ? new Date(inv.created_at).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' }) : "";

  // GST Breakdown calculations
  const totalAmount = Number(inv.total_amount || 0);
  const subtotal = Number(inv.subtotal || totalAmount);
  const discountAmount = Number(inv.discount_amount || 0);
  const taxAmount = Number(inv.tax_amount || (isTaxApplicable ? (totalAmount * 0.18 / 1.18) : 0));
  const cgst = Number((taxAmount / 2).toFixed(2));
  const sgst = Number((taxAmount / 2).toFixed(2));
  const taxableValue = Number((totalAmount - taxAmount).toFixed(2));

  if (currentPrintFormat === "a4") {
    container.className = "invoice-paper format-a4";
    container.innerHTML = `
      <!-- A4 Official Header -->
      <div class="a4-inv-header">
        <div class="a4-brand-col">
          <div class="a4-brand-title-wrap">
            ${logoUrl ? `<img src="${logoUrl}" alt="${shopName}" class="a4-brand-img">` : `<span class="a4-brand-logo">🪔</span>`}
            <div>
              <div class="a4-brand-name">${shopName}</div>
              <div class="a4-brand-tagline">Direct from Sivakasi - Certified Factory Fireworks</div>
            </div>
          </div>
          <div class="a4-brand-meta">
            📍 ${shopAddress}<br>
            📞 Helpline: ${shopPhone} | ✉️ contact@dhanalakshmicrackers.com<br>
            <strong>GSTIN:</strong> ${gstNo} | <strong>State:</strong> Tamil Nadu (Code: 33) | <strong>HSN:</strong> 3604
          </div>
        </div>

        <div class="a4-meta-col">
          <span class="a4-doc-type-badge">${isTaxApplicable ? 'TAX INVOICE' : 'RETAIL INVOICE'}</span>
          <div class="a4-inv-num">#${inv.invoice_number}</div>
          <div class="a4-inv-date">Date: <strong>${dateStr}</strong> ${timeStr ? `&bull; ${timeStr}` : ''}</div>
          <div class="a4-status-badge ${inv.payment_status === 'paid' ? 'a4-status-paid' : 'a4-status-unpaid'}">
            ● ${(inv.payment_status || 'PAID').toUpperCase()}
          </div>
        </div>
      </div>

      <!-- Customer & Dispatch Details Grid -->
      <div class="a4-details-grid">
        <div class="a4-info-card">
          <div class="a4-card-heading">BILLED TO (CUSTOMER DETAILS)</div>
          <div class="a4-cust-name">${inv.customer_name || 'Walk-in Customer'}</div>
          <div class="a4-cust-line">📱 <strong>Phone:</strong> ${inv.customer_phone ? '+91 ' + String(inv.customer_phone).replace(/[^0-9]/g,'').slice(-10) : 'Direct Counter Pickup'}</div>
          <div class="a4-cust-line">📍 <strong>Address:</strong> ${inv.customer_address || 'Sivakasi Store Counter Pickup'}</div>
        </div>

        <div class="a4-info-card">
          <div class="a4-card-heading">INVOICE & PAYMENT SUMMARY</div>
          <div class="a4-cust-line">💳 <strong>Payment Method:</strong> ${inv.payment_method || 'UPI / Cash'}</div>
          <div class="a4-cust-line">🏷️ <strong>Supply Type:</strong> Sivakasi Direct Factory Supply</div>
          <div class="a4-cust-line">🌐 <strong>Place of Supply:</strong> Tamil Nadu (State Code: 33)</div>
          <div class="a4-cust-line">⚖️ <strong>Reverse Charge:</strong> No</div>
        </div>
      </div>

      <!-- Itemized Table -->
      <div class="a4-table-wrap">
        <table class="a4-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Description of Goods (Fireworks)</th>
              <th style="width: 65px; text-align: center;">HSN</th>
              <th style="width: 55px; text-align: center;">Qty</th>
              <th style="width: 85px; text-align: right;">Rate (₹)</th>
              <th style="width: 95px; text-align: right;">Taxable (₹)</th>
              <th style="width: 80px; text-align: right;">GST (18%)</th>
              <th style="width: 100px; text-align: right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${(inv.items || []).map((item, idx) => {
              const itemTotal = Number(item.subtotal || (Number(item.unit_price || 0) * Number(item.quantity || 1)));
              const itemTaxable = Number((itemTotal / 1.18).toFixed(2));
              const itemGst = Number((itemTotal - itemTaxable).toFixed(2));
              return `
                <tr>
                  <td style="text-align: center; color: #64748b;">${idx + 1}</td>
                  <td>
                    <div class="a4-item-name">${item.product_name}</div>
                    <div class="a4-item-sku">SKU: ${item.sku || 'SIV-' + (idx + 101)}</div>
                  </td>
                  <td style="text-align: center; color: #475569;">3604</td>
                  <td style="text-align: center; font-weight: 700;">${item.quantity}</td>
                  <td style="text-align: right;">${Number(item.unit_price).toFixed(2)}</td>
                  <td style="text-align: right;">${itemTaxable.toFixed(2)}</td>
                  <td style="text-align: right; color: #475569;">${itemGst.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 700;">${itemTotal.toFixed(2)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Calculation and Words Row -->
      <div class="a4-summary-row">
        <div class="a4-summary-left">
          <div class="a4-words-card">
            <div class="a4-words-label">AMOUNT CHARGEABLE (IN WORDS)</div>
            <div class="a4-words-val">${numberToIndianWords(totalAmount)}</div>
          </div>
          <div class="a4-payment-meta">
            <strong>UPI ID:</strong> ${settings.upi_id || 'dhanalakshmi@upi'}<br>
            <strong>Payment Reference:</strong> Verified Digital Counter Transaction (${inv.payment_method})
          </div>
        </div>

        <div class="a4-summary-right">
          <div class="a4-calc-line">
            <span>Items Subtotal:</span>
            <span>₹${subtotal.toFixed(2)}</span>
          </div>
          ${discountAmount > 0 ? `
            <div class="a4-calc-line a4-calc-discount">
              <span>Festival Discount:</span>
              <span>-₹${discountAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          ${isTaxApplicable ? `
            <div class="a4-calc-line">
              <span>CGST (9.0%):</span>
              <span>₹${cgst.toFixed(2)}</span>
            </div>
            <div class="a4-calc-line">
              <span>SGST (9.0%):</span>
              <span>₹${sgst.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="a4-calc-grand">
            <span>TOTAL AMOUNT:</span>
            <span>₹${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- Footer & Statutory Disclaimer -->
      <div class="a4-inv-footer">
        <div class="a4-terms-col">
          <strong>Terms & Safety Information:</strong><br>
          1. 100% PESO Certified fireworks manufactured strictly under Indian safety regulations.<br>
          2. Store in a cool, dry place. Light outdoors only under adult supervision.<br>
          3. This is a computer-generated tax invoice and requires no physical signature.<br>
          <em>${footerNote}</em>
        </div>
        <div class="a4-sign-col">
          <div class="a4-sign-space"></div>
          <div class="a4-sign-label">For ${shopName}</div>
          <div class="a4-sign-sub">Authorized Signatory</div>
        </div>
      </div>
    `;
  } else {
    // Thermal Receipt Format (80mm or 58mm)
    const is80 = currentPrintFormat === "80mm";
    container.className = `invoice-print-container format-${currentPrintFormat}`;
    
    // Dynamic mini UPI QR for counter payment verification
    const upiId = settings.upi_id || "dhanalakshmi@upi";
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Bill ' + inv.invoice_number)}`;
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${is80 ? '110x110' : '90x90'}&margin=4&data=${encodeURIComponent(upiUri)}`;

    container.innerHTML = `
      <div class="thermal-center">
        <div class="thermal-logo-wrap">
          <img src="${logoUrl}" alt="${shopName}" class="thermal-brand-logo-img" onerror="this.style.display='none'">
        </div>
        <div class="thermal-shop-name">${shopName}</div>
        <div class="thermal-meta">${shopAddress}</div>
        <div class="thermal-meta">Helpline: ${shopPhone}</div>
        ${gstNo ? `<div class="thermal-meta">GSTIN: ${gstNo} | State: 33</div>` : ''}
      </div>

      <div class="thermal-divider"></div>

      <div class="thermal-row">
        <span>Bill: ${inv.invoice_number}</span>
        <span>${dateStr}</span>
      </div>
      <div class="thermal-row">
        <span>Cust: ${inv.customer_name || 'Walk-in'}</span>
        <span>${timeStr}</span>
      </div>
      ${inv.customer_phone ? `<div class="thermal-row"><span>Mobile:</span><span>${inv.customer_phone}</span></div>` : ''}

      <div class="thermal-double-divider"></div>

      <table class="thermal-table">
        <thead>
          <tr>
            <th style="text-align: left;">Item Description</th>
            <th style="text-align: center; width: 35px;">Qty</th>
            <th class="text-right" style="width: ${is80 ? '70px' : '55px'};">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${(inv.items || []).map(item => `
            <tr>
              <td>
                <div class="thermal-item-title">${item.product_name}</div>
                <div class="thermal-item-sub">${item.quantity} x ₹${Number(item.unit_price).toFixed(2)}</div>
              </td>
              <td style="text-align: center; font-weight: 700; padding-top: 3px;">${item.quantity}</td>
              <td class="text-right" style="font-weight: 700; padding-top: 3px;">₹${Number(item.subtotal).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="thermal-divider"></div>

      <div class="thermal-row">
        <span>Subtotal:</span>
        <span>₹${subtotal.toFixed(2)}</span>
      </div>

      ${discountAmount > 0 ? `
        <div class="thermal-row">
          <span>Festival Discount:</span>
          <span>-₹${discountAmount.toFixed(2)}</span>
        </div>
      ` : ''}

      ${isTaxApplicable ? `
        <div class="thermal-row" style="font-size:${is80 ? '10px' : '8.5px'};">
          <span>CGST (9%) + SGST (9%):</span>
          <span>₹${taxAmount.toFixed(2)}</span>
        </div>
      ` : ''}

      <div class="thermal-double-divider"></div>

      <div class="thermal-row thermal-bold" style="font-size: ${is80 ? '14px' : '12px'};">
        <span>NET PAYABLE:</span>
        <span>₹${totalAmount.toFixed(2)}</span>
      </div>

      <div class="thermal-row" style="margin-top: 3px;">
        <span>Payment Mode:</span>
        <span><strong>${inv.payment_method || 'CASH'} (${(inv.payment_status || 'PAID').toUpperCase()})</strong></span>
      </div>

      <div class="thermal-divider"></div>

      <!-- Thermal UPI QR for Verification -->
      <div class="thermal-qr-box">
        <img src="${qrImgUrl}" alt="Scan UPI" class="thermal-qr-img">
        <div style="font-size: ${is80 ? '9px' : '7.5px'}; margin-top: 3px; font-weight: 700;">SCAN TO VERIFY / PAY VIA UPI</div>
      </div>

      <div class="thermal-footer">
        ${footerNote}
        <br>PESO Certified Fireworks.
        <br>*** THANK YOU - VISIT AGAIN ***
      </div>
    `;
  }
}

/**
 * Bulletproof Browser Print: Clones invoice to root #cleanPrintRoot to eliminate all modal scroll displacement and blank top gaps
 */
function triggerBrowserPrint() {
  document.body.classList.remove("print-mode-a4", "print-mode-80mm", "print-mode-58mm");
  document.body.classList.add(`print-mode-${currentPrintFormat}`);

  // 1. Reset scroll on modal body
  const modalBody = document.querySelector("#invoicePreviewModal .modal-body");
  if (modalBody) modalBody.scrollTop = 0;

  // 2. Clone content directly to clean print root at body level
  let printRoot = document.getElementById("cleanPrintRoot");
  if (!printRoot) {
    printRoot = document.createElement("div");
    printRoot.id = "cleanPrintRoot";
    document.body.appendChild(printRoot);
  }

  const source = document.getElementById("printableInvoice") || document.getElementById("invoiceContentToPrint");
  if (source) {
    printRoot.innerHTML = source.innerHTML;
    printRoot.className = source.className;
  }

  document.body.classList.add("printing-in-progress");
  window.print();

  // Reset after printing
  setTimeout(() => {
    document.body.classList.remove("printing-in-progress");
    if (printRoot) printRoot.innerHTML = "";
  }, 1000);
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

  const fileName = `Invoice-${inv.invoice_number}-${currentPrintFormat}.pdf`;
  const printableEl = document.getElementById("printableInvoice") || document.getElementById("invoiceContentToPrint");

  let pdfFormat = 'a4';
  if (currentPrintFormat === '80mm') {
    pdfFormat = [80, 240];
  } else if (currentPrintFormat === '58mm') {
    pdfFormat = [58, 200];
  }

  if (typeof html2pdf !== "undefined" && printableEl) {
    const opt = {
      margin: currentPrintFormat === 'a4' ? [8, 8, 8, 8] : [2, 2, 2, 2],
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' }
    };

    html2pdf().set(opt).from(printableEl).save().then(() => {
      if (typeof showToast === "function") showToast("Invoice PDF downloaded successfully! 📄", "success");
    }).catch(err => {
      console.warn("PDF generation error, opening invoice print view:", err);
      triggerBrowserPrint();
    });
  } else {
    triggerBrowserPrint();
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
  const downloadUrl = `${window.location.origin}/invoice.html?invoice=${inv.invoice_number}&format=${currentPrintFormat}`;

  const subject = encodeURIComponent(`Invoice #${inv.invoice_number} from ${shopName} [PAID]`);
  const body = encodeURIComponent(
`Dear ${inv.customer_name || 'Customer'},

Thank you for your fireworks order with ${shopName}!

Invoice Number: #${inv.invoice_number}
Order Date: ${new Date(inv.created_at || Date.now()).toLocaleDateString("en-IN")}
Total Amount: ₹${Number(inv.total_amount).toFixed(2)}
Payment Status: ${(inv.payment_status || 'PAID').toUpperCase()}

View and download your official invoice receipt:
${downloadUrl}

Warm Diwali Wishes,
${shopName} Sivakasi
Helpline: ${settings.phone || '+91 94431 88531'}`
  );

  window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
}
