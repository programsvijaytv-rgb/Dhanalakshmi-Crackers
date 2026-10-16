// ==============================================================================
// Dhanalakshmi Crackers - Cart Management
// ==============================================================================

const CART_STORAGE_KEY = "dc_shopping_cart";

/**
 * Get items in cart
 */
function getCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Save items to cart
 */
function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  updateCartBadge();
}

/**
 * Add a product to the cart (supports variants)
 */
function addToCart(product, quantity = 1, variant = null) {
  const cart = getCart();
  const vId = variant?.id || product.selectedVariant?.id || null;
  const cartItemId = vId ? `${product.id}_${vId}` : product.id;
  const displayName = variant ? `${product.name} - ${variant.name}` : product.name;
  const price = Number(variant ? variant.price : product.price);
  const origPrice = Number(variant ? (variant.original_price || variant.price) : (product.original_price || product.price));
  const sku = variant ? (variant.sku || product.sku) : (product.sku || "");
  const unit = variant ? (variant.unit || product.unit) : (product.unit || "Box");

  const existing = cart.find(item => (item.cartItemId && item.cartItemId === cartItemId) || (!item.cartItemId && item.id === cartItemId));

  if (existing) {
    existing.quantity += Number(quantity);
  } else {
    cart.push({
      id: product.id,
      cartItemId: cartItemId,
      variant_id: vId,
      variant_name: variant ? variant.name : null,
      name: displayName,
      base_name: product.name,
      sku: sku,
      price: price,
      original_price: origPrice,
      image_url: product.image_url || "",
      unit: unit,
      quantity: Number(quantity)
    });
  }

  saveCart(cart);
  showToast(`Added ${displayName} to cart!`);
}

/**
 * Update the quantity of a cart item
 */
function updateCartQuantity(cartItemId, newQty) {
  const cart = getCart();
  const item = cart.find(i => (i.cartItemId && i.cartItemId === cartItemId) || i.id === cartItemId);

  if (item) {
    const qty = parseInt(newQty, 10);
    if (qty <= 0) {
      removeFromCart(cartItemId);
    } else {
      item.quantity = qty;
      saveCart(cart);
      renderCartPage();
    }
  }
}

/**
 * Remove an item from the cart
 */
function removeFromCart(cartItemId) {
  let cart = getCart();
  cart = cart.filter(i => (i.cartItemId && i.cartItemId !== cartItemId) || (!i.cartItemId && i.id !== cartItemId));
  saveCart(cart);
  renderCartPage();
  showToast("Item removed from cart");
}

/**
 * Clear the cart
 */
function clearCart() {
  localStorage.removeItem(CART_STORAGE_KEY);
  updateCartBadge();
}

/**
 * Calculate totals for the cart including savings
 */
function getCartTotals(taxRate = 0) {
  const cart = getCart();
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const originalTotal = cart.reduce((acc, item) => acc + ((item.original_price || item.price) * item.quantity), 0);
  const savings = originalTotal > subtotal ? (originalTotal - subtotal) : 0;
  const taxAmount = (subtotal * taxRate) / 100;
  const grandTotal = subtotal + taxAmount;
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return { subtotal, originalTotal, savings, taxAmount, grandTotal, totalItems };
}

/**
 * Update header badge count across all storefront pages with tactile bounce
 */
function updateCartBadge() {
  const cart = getCart();
  const count = cart.reduce((acc, item) => acc + item.quantity, 0);
  const badges = document.querySelectorAll(".cart-counter");
  badges.forEach(b => {
    b.textContent = count;
    b.classList.remove("badge-bump");
    // Trigger CSS reflow for replaying animation
    void b.offsetWidth;
    b.classList.add("badge-bump");
  });
}

/**
 * Render the Cart Page view (if element #cartItemsContainer exists)
 */
function renderCartPage() {
  const container = document.getElementById("cartItemsContainer");
  if (!container) return;

  const cart = getCart();
  const emptyState = document.getElementById("cartEmptyState");
  const layout = document.getElementById("cartLayout");

  if (cart.length === 0) {
    if (emptyState) emptyState.style.display = "block";
    if (layout) layout.style.display = "none";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  if (layout) layout.style.display = "grid";

  container.innerHTML = "";
  cart.forEach(item => {
    const tr = document.createElement("tr");
    const itemKey = item.cartItemId || item.id;

    tr.innerHTML = `
      <td>
        <div class="cart-product-cell">
          <img src="${item.image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100'}" alt="${item.name}" class="cart-thumb">
          <div>
            <div style="font-weight: 700; font-size: 0.98rem; color: var(--text-main); line-height: 1.3;">${item.name}</div>
            <div style="font-size: 0.78rem; color: #6b7280; margin-top: 2px;">
              <span class="product-sku-tag">SKU: ${item.sku || 'N/A'}</span> • Unit: ${item.unit}
            </div>
          </div>
        </div>
      </td>
      <td style="font-weight: 600; color: #374151;">
        ${formatCurrency(item.price)}
        ${item.original_price && item.original_price > item.price ? `<div style="font-size: 0.75rem; color: #9ca3af; text-decoration: line-through;">${formatCurrency(item.original_price)}</div>` : ''}
      </td>
      <td>
        <div class="qty-control">
          <button class="qty-btn" title="Decrease" onclick="updateCartQuantity('${itemKey}', ${item.quantity - 1})">-</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" title="Increase" onclick="updateCartQuantity('${itemKey}', ${item.quantity + 1})">+</button>
        </div>
      </td>
      <td style="font-weight: 800; font-size: 1.05rem; color: var(--primary);">
        ${formatCurrency(item.price * item.quantity)}
      </td>
      <td>
        <button class="btn-remove-item" title="Remove Item" onclick="removeFromCart('${itemKey}')">
          &times;
        </button>
      </td>
    `;
    container.appendChild(tr);
  });

  const totals = getCartTotals(0);
  const subtotalEl = document.getElementById("cartSubtotal");
  const grandTotalEl = document.getElementById("cartGrandTotal");
  const savingsRowEl = document.getElementById("cartSavingsRow");
  const savingsValEl = document.getElementById("cartTotalSavings");
  const freeShippingBar = document.getElementById("freeShippingProgressBar");
  const freeShippingText = document.getElementById("freeShippingProgressText");

  if (subtotalEl) subtotalEl.textContent = formatCurrency(totals.subtotal);
  if (grandTotalEl) grandTotalEl.textContent = formatCurrency(totals.grandTotal);

  if (savingsValEl) {
    savingsValEl.textContent = formatCurrency(totals.savings);
  }
  if (savingsRowEl) {
    savingsRowEl.style.display = totals.savings > 0 ? "flex" : "none";
  }

  // Free shipping progress logic (Threshold: ₹1,500)
  const threshold = 1500;
  if (freeShippingBar && freeShippingText) {
    const pct = Math.min(100, Math.round((totals.subtotal / threshold) * 100));
    freeShippingBar.style.width = `${pct}%`;
    if (totals.subtotal >= threshold) {
      freeShippingText.innerHTML = `🎉 <strong>Congratulations!</strong> You unlocked <strong>Free Sivakasi Packing & Express Dispatch!</strong>`;
      freeShippingBar.style.background = "linear-gradient(90deg, #10b981, #059669)";
    } else {
      const remaining = threshold - totals.subtotal;
      freeShippingText.innerHTML = `Add <strong>${formatCurrency(remaining)}</strong> more to unlock <strong>Free Express Dispatch & Moisture-Proof Packing!</strong>`;
      freeShippingBar.style.background = "linear-gradient(90deg, #f59e0b, #d97706)";
    }
  }
}

// Auto update badge on DOMContentLoaded and synchronize across tabs
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  renderCartPage();

  window.addEventListener("storage", (e) => {
    if (e.key === CART_STORAGE_KEY) {
      updateCartBadge();
      renderCartPage();
    }
  });
});
