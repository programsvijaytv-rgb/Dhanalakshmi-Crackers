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
  renderFloatingCart();
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
  renderFloatingCart();
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

/**
 * Render Bottom Floating Cart Bar (matches mobile/desktop pill design)
 */
function renderFloatingCart() {
  // Do not show on cart, checkout or admin pages
  const path = (typeof window !== "undefined" && window.location && window.location.pathname ? window.location.pathname : "").toLowerCase();
  if (path.includes("cart.html") || path.includes("checkout.html") || path.includes("/admin/") || path.includes("invoice.html")) {
    const existing = document.getElementById("floatingCartBar");
    if (existing) existing.remove();
    document.body.classList.remove("has-floating-cart");
    return;
  }

  const cart = getCart();
  const totalItems = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  let bar = document.getElementById("floatingCartBar");

  if (totalItems <= 0) {
    if (bar) {
      bar.classList.remove("is-visible");
      setTimeout(() => {
        if (bar && !bar.classList.contains("is-visible")) bar.remove();
      }, 350);
    }
    document.body.classList.remove("has-floating-cart");
    return;
  }

  const totals = getCartTotals(0);

  if (!bar) {
    bar = document.createElement("div");
    bar.id = "floatingCartBar";
    bar.className = "floating-cart-bar";
    document.body.appendChild(bar);
  }

  // Deduplicate unique items for product thumbnail preview
  const uniqueItems = [];
  const seen = new Set();
  cart.forEach(item => {
    const key = item.id || item.cartItemId || item.name;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueItems.push(item);
    }
  });

  const previewThumbs = uniqueItems.slice(0, 3);
  const remainingCount = uniqueItems.length - previewThumbs.length;

  const thumbsHtml = previewThumbs.map(item => {
    const imgUrl = item.image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100';
    return `<img src="${imgUrl}" class="fc-thumb" alt="${escapeCartHtml(item.name)}" title="${escapeCartHtml(item.name)}">`;
  }).join("") + (remainingCount > 0 ? `<span class="fc-more-count">+${remainingCount}</span>` : "");

  const formatPrice = typeof formatCurrency === "function" 
    ? formatCurrency 
    : (amt) => "₹" + Number(amt || 0).toLocaleString("en-IN");

  bar.innerHTML = `
    <div class="fc-content" onclick="window.location.href='cart.html'">
      <div class="fc-left">
        <div class="fc-icon-wrap">
          <svg class="fc-cart-icon" width="22" height="22" viewBox="0 0 24 24" fill="#1e293b">
            <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
          <span class="fc-badge">${totalItems}</span>
        </div>
        <div class="fc-info">
          <div class="fc-title">${totalItems} Item${totalItems === 1 ? '' : 's'} Selected</div>
          <div class="fc-total">Total: <strong class="fc-total-val">${formatPrice(totals.subtotal)}</strong></div>
        </div>
      </div>

      <div class="fc-thumbs-stack">
        ${thumbsHtml}
      </div>
    </div>

    <a href="cart.html" class="fc-btn" aria-label="View shopping cart with ${totalItems} items">
      View All ➔
    </a>
  `;

  // Trigger smooth slide up
  requestAnimationFrame(() => {
    bar.classList.add("is-visible");
    document.body.classList.add("has-floating-cart");
  });
}
window.renderFloatingCart = renderFloatingCart;

function escapeCartHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validate active shopping cart against the live product catalog and automatically
 * remove any products that were deleted or deactivated
 */
function syncCartWithCatalog(activeProducts) {
  if (!Array.isArray(activeProducts) || activeProducts.length === 0) return;
  const currentCart = getCart();
  if (currentCart.length === 0) return;

  const validProductIds = new Set(activeProducts.map(p => String(p.id)));
  const validProductSkus = new Set(activeProducts.filter(p => p.sku).map(p => String(p.sku).trim().toUpperCase()));
  const deletedIds = typeof getDeletedProductIds === "function" ? getDeletedProductIds() : [];

  let removedNames = [];
  const cleanedCart = currentCart.filter(item => {
    const itemId = String(item.id || "").trim();
    const itemSku = String(item.sku || "").trim().toUpperCase();

    // Check if explicitly marked deleted
    if (typeof isProductDeleted === "function") {
      if (isProductDeleted(itemId, itemSku)) {
        removedNames.push(item.name);
        return false;
      }
    } else if (deletedIds.some(d => String(d).toLowerCase() === itemId.toLowerCase() || (itemSku && String(d).toLowerCase() === itemSku.toLowerCase()))) {
      removedNames.push(item.name);
      return false;
    }

    // Check if still exists in active products
    const isValid = validProductIds.has(itemId) || (itemSku && validProductSkus.has(itemSku));
    if (!isValid) {
      removedNames.push(item.name);
      return false;
    }
    return true;
  });

  if (removedNames.length > 0) {
    saveCart(cleanedCart);
    showToast(`Removed unavailable item(s) from your cart: ${removedNames.join(", ")}`, "info", 5000);
    renderCartPage();
  }
}
window.syncCartWithCatalog = syncCartWithCatalog;

// Auto update badge and floating cart on DOMContentLoaded and synchronize across tabs
document.addEventListener("DOMContentLoaded", async () => {
  updateCartBadge();
  renderCartPage();
  renderFloatingCart();

  // If on cart page, validate items against latest catalog
  const isCartPage = document.getElementById("cartItemsContainer");
  if (isCartPage && typeof fetchProducts === "function") {
    try {
      const activeProducts = await fetchProducts();
      syncCartWithCatalog(activeProducts);
    } catch (_) {}
  }

  window.addEventListener("storage", (e) => {
    if (e.key === CART_STORAGE_KEY) {
      updateCartBadge();
      renderCartPage();
      renderFloatingCart();
    }
  });
});

// Subscribe to real-time sync deletion events for cart cleanup
if (typeof listenSync === "function") {
  listenSync((event) => {
    if (event.type === "products_updated") {
      if (event.payload?.action === "delete" || event.payload?.action === "bulk_delete") {
        const delId = event.payload.id;
        const delSku = event.payload.sku;
        const delIds = new Set((event.payload.deletedIds || []).map(String));
        const delSkus = new Set((event.payload.deletedSkus || []).map(s => String(s).toUpperCase()));
        if (delId) delIds.add(String(delId));
        if (delSku) delSkus.add(String(delSku).toUpperCase());

        const currentCart = getCart();
        const cleaned = currentCart.filter(item => {
          const iId = String(item.id || "");
          const iSku = String(item.sku || "").toUpperCase();
          if (delIds.has(iId)) return false;
          if (iSku && delSkus.has(iSku)) return false;
          return true;
        });

        if (cleaned.length !== currentCart.length) {
          saveCart(cleaned);
          renderCartPage();
        }
      }
    }
  });
}
