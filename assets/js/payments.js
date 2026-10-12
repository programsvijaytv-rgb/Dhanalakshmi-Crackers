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
 */
function showUPIQRModal(amount, note, onVerifiedCallback) {
  let modal = document.getElementById("upiPaymentModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "upiPaymentModal";
    modal.className = "modal-overlay";
    document.body.appendChild(modal);
  }

  const settings = JSON.parse(localStorage.getItem("dc_business_settings") || "{}");
  const upiId = settings.upi_id || "dhanalakshmi@upi";
  const upiName = settings.upi_name || "Dhanalakshmi Crackers";
  
  const { upiUri, qrImageUrl } = generateUPIPaymentUrl(upiId, upiName, amount, note);

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

  modal.style.display = "flex";

  const confirmBtn = document.getElementById("btnConfirmUPIReceived");
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      closeUPIModal();
      if (typeof onVerifiedCallback === "function") {
        onVerifiedCallback({
          method: "UPI",
          upiId,
          amount,
          verified: true
        });
      }
    };
  }
}

function closeUPIModal() {
  const modal = document.getElementById("upiPaymentModal");
  if (modal) modal.style.display = "none";
}

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
