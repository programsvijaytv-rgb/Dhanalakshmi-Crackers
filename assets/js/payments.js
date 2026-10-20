// ==============================================================================
// Dhanalakshmi Crackers - Payments Module
// Handles Cash, Dynamic Merchant UPI QR Codes, & Payment Gateway
// ==============================================================================

/**
 * Generates a Merchant UPI QR Code URL
 * @param {string} upiId - Merchant UPI VPA (e.g., dhanalakshmi@upi)
 * @param {string} payeeName - Merchant Name
 * @param {number} amount - Bill Amount
 * @param {string} note - Invoice or Order Reference
 */
function generateUPIPaymentUrl(upiId, payeeName, amount, note = "Dhanalakshmi Crackers") {
  const cleanUpiId = upiId || "dhanalakshmi@upi";
  const cleanName = payeeName || "Dhanalakshmi Crackers";
  const numAmount = Number(amount).toFixed(2);
  
  // Standard NPCI UPI URI Specification
  const upiUri = `upi://pay?pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent(cleanName)}&am=${numAmount}&cu=INR&tn=${encodeURIComponent(note)}`;
  
  // Generate QR Code image link using standard QR generator
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(upiUri)}`;
  
  return {
    upiUri,
    qrImageUrl: qrApiUrl
  };
}

/**
 * Display UPI Payment Modal for POS or Checkout
 * @param {number} amount
 * @param {string} note
 * @param {function} onVerifiedCallback
 * @param {object} options - { mode: "checkout" | "pos" }
 */
function showUPIQRModal(amount, note, onVerifiedCallback, options = {}) {
  let modal = document.getElementById("upiPaymentModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "upiPaymentModal";
    modal.className = "modal-overlay";
    document.body.appendChild(modal);
  }

  const settings = JSON.parse(localStorage.getItem("dc_business_settings") || "{}");
  const upiId = settings.upi_id || "dhanalakshmicrackers@tmb";
  const upiName = settings.upi_name || "Dhanalakshmi Crackers Sivakasi";
  
  const { upiUri, qrImageUrl } = generateUPIPaymentUrl(upiId, upiName, amount, note);
  const isCheckoutMode = options.mode === "checkout" || (!options.mode && typeof window !== "undefined" && window.location.pathname.includes("checkout"));

  if (isCheckoutMode) {
    // =========================================================================
    // CUSTOMER CHECKOUT VIEW
    // =========================================================================
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 440px; text-align: center; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 45px rgba(0,0,0,0.3);">
        <div class="modal-header" style="background: linear-gradient(135deg, #1e293b, #0f172a); color: #fff; padding: 1.1rem 1.25rem; display: flex; align-items: center; justify-content: space-between;">
          <h3 class="modal-title" style="margin: 0; font-size: 1.15rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px;">
            <span>⚡</span> Scan & Pay with UPI
          </h3>
          <button class="modal-close" onclick="closeUPIModal()" style="color: #fff; font-size: 1.5rem; background: none; border: none; cursor: pointer; opacity: 0.85; line-height: 1;">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1.25rem;">
          <!-- QR Card Container -->
          <div style="background: #ffffff; padding: 0.85rem; border-radius: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1.5px solid #e2e8f0; margin-bottom: 0.75rem;">
            <img src="${qrImageUrl}" alt="Scan UPI QR" style="width: 200px; height: 200px; display: block; margin: 0 auto; border-radius: 8px;">
          </div>

          <div style="font-size: 1.6rem; font-weight: 800; color: #dc2626; margin-bottom: 0.35rem; font-family: 'Outfit', sans-serif;">
            ${formatCurrency(amount)}
          </div>

          <!-- Merchant UPI Details Strip with Copy -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.55rem 0.85rem; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem;">
            <div style="text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <span style="color: #64748b;">UPI ID:</span> <strong style="color: #0f172a;">${upiId}</strong>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="copyModalUPIId('${upiId}')" style="padding: 3px 8px; font-size: 0.72rem; white-space: nowrap; margin-left: 6px;">
              📋 Copy
            </button>
          </div>

          <!-- Mobile Direct App Link -->
          <a href="${upiUri}" class="btn btn-block" style="background: #4f46e5; color: #fff; text-decoration: none; font-size: 0.85rem; font-weight: 700; padding: 0.6rem 1rem; border-radius: 8px; margin-bottom: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>📲</span> Open GPay / PhonePe / Paytm App
          </a>

          <!-- Customer UTR / Ref Number Input -->
          <div style="text-align: left; background: #fff; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.75rem 0.85rem; margin-bottom: 0.85rem;">
            <label for="upiUtrNumber" style="display: block; font-size: 0.78rem; font-weight: 700; color: #1e293b; margin-bottom: 4px;">
              Enter 12-Digit UPI UTR / Ref No. <span style="color: #94a3b8; font-weight: 400;">(Optional)</span>
            </label>
            <input type="text" id="upiUtrNumber" maxlength="16" placeholder="e.g. 428901234567" style="width: 100%; padding: 0.5rem 0.65rem; border: 1px solid #94a3b8; border-radius: 6px; font-size: 0.95rem; font-family: monospace; letter-spacing: 1px; box-sizing: border-box;" oninput="this.value = this.value.replace(/[^0-9]/g, '')">
            <div style="font-size: 0.7rem; color: #64748b; margin-top: 3px;">
              Found in your UPI app payment receipt after paying.
            </div>
          </div>

          <!-- Customer Workflow Explanation Notice -->
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 0.75rem 0.85rem; font-size: 0.78rem; color: #1e40af; text-align: left; margin-bottom: 1rem; line-height: 1.45;">
            ℹ️ <strong>How Verification Works:</strong> After paying, click <strong>Submit Order</strong>. Our store staff will verify receipt in our merchant UPI soundbox / bank statement before processing your fireworks order for dispatch.
          </div>

          <div style="display: flex; gap: 0.75rem;">
            <button type="button" class="btn btn-secondary btn-block" onclick="closeUPIModal()">Cancel</button>
            <button type="button" class="btn btn-primary btn-block" id="btnConfirmUPIReceived" style="background: #059669; border-color: #059669; font-weight: 700;">
              I Have Paid — Submit Order ➔
            </button>
          </div>
        </div>
      </div>
    `;
  } else {
    // =========================================================================
    // POS CASHIER COUNTER VIEW
    // =========================================================================
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 440px; text-align: center;">
        <div class="modal-header">
          <h3 class="modal-title">Scan & Pay with any UPI App</h3>
          <button class="modal-close" onclick="closeUPIModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div style="background: #fff; padding: 1rem; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-bottom: 1rem;">
            <img src="${qrImageUrl}" alt="Scan UPI QR" style="width: 220px; height: 220px; display: block; margin: 0 auto;">
          </div>
          <div style="font-size: 1.5rem; font-weight: 800; color: #dc2626; margin-bottom: 0.5rem;">
            ${formatCurrency(amount)}
          </div>
          <p style="font-size: 0.85rem; color: #4b5563; margin-bottom: 0.25rem;">
            UPI ID: <strong>${upiId}</strong> (${upiName})
          </p>
          <p style="font-size: 0.75rem; color: #9ca3af; margin-bottom: 1.25rem;">
            Compatible with Google Pay, PhonePe, Paytm, BHIM and all banking UPI apps.
          </p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 0.75rem; font-size: 0.8rem; color: #991b1b; margin-bottom: 1rem;">
            ⚠️ <strong>Cashier Note:</strong> Verify receipt of payment in your merchant UPI soundbox / bank SMS before completing.
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button class="btn btn-secondary btn-block" onclick="closeUPIModal()">Cancel</button>
            <button class="btn btn-primary btn-block" id="btnConfirmUPIReceived">Payment Verified</button>
          </div>
        </div>
      </div>
    `;
  }

  modal.style.display = "flex";

  const confirmBtn = document.getElementById("btnConfirmUPIReceived");
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      const utrEl = document.getElementById("upiUtrNumber");
      const utrNumber = utrEl ? utrEl.value.trim() : "";
      closeUPIModal();
      if (typeof onVerifiedCallback === "function") {
        onVerifiedCallback({
          method: "UPI",
          upiId,
          amount,
          utrNumber: utrNumber,
          verified: !isCheckoutMode,
          pendingVerification: isCheckoutMode
        });
      }
    };
  }
}

function closeUPIModal() {
  const modal = document.getElementById("upiPaymentModal");
  if (modal) modal.style.display = "none";
}

function copyModalUPIId(upiId) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(upiId).then(() => {
      if (typeof showToast === "function") showToast("UPI ID copied to clipboard!", "success");
    }).catch(() => {
      prompt("Copy UPI ID:", upiId);
    });
  } else {
    prompt("Copy UPI ID:", upiId);
  }
}
window.copyModalUPIId = copyModalUPIId;

/**
 * Handle Cash Change Calculator
 */
function calculateCashChange(totalAmount, tenderedAmount) {
  const total = Number(totalAmount) || 0;
  const tendered = Number(tenderedAmount) || 0;
  const change = tendered - total;
  return {
    tendered,
    total,
    change: change >= 0 ? change : 0,
    isSufficient: change >= 0
  };
}
