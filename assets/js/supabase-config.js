// ==============================================================================
// Dhanalakshmi Crackers - Supabase Configuration & Client
// ==============================================================================

// Replace with your project credentials or configure via Admin Settings
const DEFAULT_SUPABASE_URL = "https://pbjcqamswwwoklcgdfjd.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_-nw-Lngui7gSYjJLsSaCAg_3OnHKd7H";

// Retrieve saved configuration from localStorage if customized, or use live project defaults
const _storedUrl = localStorage.getItem("dc_supabase_url");
const _storedKey = localStorage.getItem("dc_supabase_anon_key");
const SUPABASE_URL = (_storedUrl && !_storedUrl.includes("your-project")) ? _storedUrl : DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY = (_storedKey && !_storedKey.includes("your-public-anon-key")) ? _storedKey : DEFAULT_SUPABASE_ANON_KEY;

let supabaseClient = null;

/**
 * Initializes and returns the Supabase client instance
 */
function getSupabase() {
  if (supabaseClient) return supabaseClient;

  if (typeof supabase !== "undefined" && typeof supabase.createClient === "function") {
    try {
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return supabaseClient;
    } catch (err) {
      console.warn("Supabase initialization error:", err);
    }
  }
  return null;
}

let adminSupabaseClient = null;

/**
 * Returns an admin privileged Supabase client if service role key is configured,
 * otherwise falls back to the standard client.
 */
function getAdminSupabase() {
  const serviceKey = localStorage.getItem("dc_supabase_service_key");
  if (serviceKey && typeof supabase !== "undefined" && typeof supabase.createClient === "function") {
    if (!adminSupabaseClient || adminSupabaseClient._serviceKey !== serviceKey) {
      try {
        adminSupabaseClient = supabase.createClient(SUPABASE_URL, serviceKey, {
          auth: { persistSession: false }
        });
        adminSupabaseClient._serviceKey = serviceKey;
      } catch (err) {
        console.warn("Failed to initialize admin Supabase client with service key:", err);
      }
    }
    if (adminSupabaseClient) return adminSupabaseClient;
  }
  return getSupabase();
}

/**
 * Checks if Supabase has been properly configured with live project keys
 */
function isSupabaseConfigured() {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_URL.includes("your-project") &&
    !SUPABASE_ANON_KEY.includes("your-public-anon-key")
  );
}

// ==============================================================================
// DEFAULT / MOCK DATA STORE (Matches Supabase live PostgreSQL UUID schema)
// ==============================================================================
const DEFAULT_BUSINESS_SETTINGS = {
  shop_name: "Dhanalakshmi Crackers",
  business_category: "Fireworks Supplier / Store",
  tagline: "Direct from Sivakasi - Safe, Superior & Certified Fireworks",
  phone: "+91 98765 43210",
  whatsapp_phone: "+91 98765 43210",
  email: "sales@dhanalakshmicrackers.com",
  address: "142, By-pass Road, Sivakasi, Tamil Nadu - 626123",
  operating_hours: "Mon - Sun: 09:00 AM - 10:00 PM",
  business_description: "Wholesale and retail distributor of authentic Sivakasi fireworks, certified safety standards, factory direct pricing.",
  gst_number: "33AAAAA0000A1Z5",
  upi_id: "dhanalakshmi@upi",
  upi_name: "Dhanalakshmi Crackers Sivakasi",
  currency_symbol: "₹",
  currency_code: "INR",
  time_zone: "Asia/Kolkata",
  tax_applicable: true,
  default_tax_rate: 18,
  invoice_prefix: "DC-",
  invoice_footer: "Thank you for celebrating with Dhanalakshmi Crackers! Have a sparkling and safe Diwali.",
  google_review_url: "https://share.google/AwTsdLuk9OtRHQhbR"
};

const DEFAULT_CATEGORIES = [
  { id: "b1000000-0000-0000-0000-000000000001", name: "Sparklers & Flares", slug: "sparklers", display_order: 1 },
  { id: "b1000000-0000-0000-0000-000000000002", name: "Ground Chakkars", slug: "ground-chakkars", display_order: 2 },
  { id: "b1000000-0000-0000-0000-000000000003", name: "Flower Pots", slug: "flower-pots", display_order: 3 },
  { id: "b1000000-0000-0000-0000-000000000004", name: "Rockets & Missiles", slug: "rockets", display_order: 4 },
  { id: "b1000000-0000-0000-0000-000000000005", name: "Aerial Repeaters (Sky Shots)", slug: "sky-shots", display_order: 5 },
  { id: "b1000000-0000-0000-0000-000000000006", name: "Sound Crackers & Garlands", slug: "sound-crackers", display_order: 6 },
  { id: "b1000000-0000-0000-0000-000000000007", name: "Festival Gift Boxes", slug: "gift-boxes", display_order: 7 }
];

const DEFAULT_PRODUCTS = [
  {
    id: "c1000000-0000-0000-0000-000000000001",
    name: "10cm Electric Sparklers (10 Pcs)",
    sku: "SPK-10EL",
    category_id: "b1000000-0000-0000-0000-000000000001",
    category_name: "Sparklers & Flares",
    price: 35,
    original_price: 60,
    stock_quantity: 250,
    min_stock_alert: 20,
    unit: "Box (10 Pcs)",
    description: "Dazzling silver sparklers with smooth low-smoke burning, ideal for young children.",
    image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000002",
    name: "15cm Color Sparklers (5 in 1 Box)",
    sku: "SPK-15COL",
    category_id: "b1000000-0000-0000-0000-000000000001",
    category_name: "Sparklers & Flares",
    price: 85,
    original_price: 150,
    stock_quantity: 180,
    min_stock_alert: 20,
    unit: "Box (10 Pcs)",
    description: "Assorted red, green, yellow, silver and gold sparklers with extended burning duration.",
    image_url: "https://images.unsplash.com/photo-1543257580-7269da773bf5?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000003",
    name: "30cm Giant Gold Sparklers (5 Pcs)",
    sku: "SPK-30GLD",
    category_id: "b1000000-0000-0000-0000-000000000001",
    category_name: "Sparklers & Flares",
    price: 130,
    original_price: 220,
    stock_quantity: 140,
    min_stock_alert: 15,
    unit: "Box (5 Pcs)",
    description: "Extra long jumbo gold glitter sparklers with majestic 3-minute sparkling performance.",
    image_url: "https://images.unsplash.com/photo-1508717272800-9fff97da7e8f?w=600&auto=format&fit=crop&q=80",
    is_featured: false,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000004",
    name: "Ground Chakkars Deluxe (10 Pcs)",
    sku: "CHK-DLX10",
    category_id: "b1000000-0000-0000-0000-000000000002",
    category_name: "Ground Chakkars",
    price: 95,
    original_price: 180,
    stock_quantity: 160,
    min_stock_alert: 25,
    unit: "Box (10 Pcs)",
    description: "High-speed spinning wheels generating bright golden floral discs on the ground.",
    image_url: "https://images.unsplash.com/photo-1531844251246-9a1bfaae09fc?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000005",
    name: "Special 4x4 Whistling Chakkar (5 Pcs)",
    sku: "CHK-WHT5",
    category_id: "b1000000-0000-0000-0000-000000000002",
    category_name: "Ground Chakkars",
    price: 140,
    original_price: 260,
    stock_quantity: 90,
    min_stock_alert: 15,
    unit: "Box (5 Pcs)",
    description: "Spins with multi-stage whistling sound followed by showers of multi-color starry rings.",
    image_url: "https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000006",
    name: "Flower Pots Special (10 Pcs)",
    sku: "FLP-SPC10",
    category_id: "b1000000-0000-0000-0000-000000000003",
    category_name: "Flower Pots",
    price: 120,
    original_price: 240,
    stock_quantity: 200,
    min_stock_alert: 20,
    unit: "Box (10 Pcs)",
    description: "Classic Sivakasi flower pots throwing golden and silvery plumes up to 8 feet.",
    image_url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000007",
    name: "Color Koti Giant Flower Pots (5 Pcs)",
    sku: "FLP-KOTI5",
    category_id: "b1000000-0000-0000-0000-000000000003",
    category_name: "Flower Pots",
    price: 210,
    original_price: 400,
    stock_quantity: 85,
    min_stock_alert: 10,
    unit: "Box (5 Pcs)",
    description: "Grand conical pots that erupt into tri-color fountain sparks reaching 15 feet high.",
    image_url: "https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000008",
    name: "Baby Rocket Sound & Flash (10 Pcs)",
    sku: "RCK-BBY10",
    category_id: "b1000000-0000-0000-0000-000000000004",
    category_name: "Rockets & Missiles",
    price: 75,
    original_price: 150,
    stock_quantity: 150,
    min_stock_alert: 20,
    unit: "Box (10 Pcs)",
    description: "High-altitude swift rockets finishing with a crisp bang and silver shower.",
    image_url: "https://images.unsplash.com/photo-1513297887119-d46091b24bfa?w=600&auto=format&fit=crop&q=80",
    is_featured: false,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000009",
    name: "Whistling Lunik Rockets (10 Pcs)",
    sku: "RCK-LNK10",
    category_id: "b1000000-0000-0000-0000-000000000004",
    category_name: "Rockets & Missiles",
    price: 190,
    original_price: 360,
    stock_quantity: 110,
    min_stock_alert: 15,
    unit: "Box (10 Pcs)",
    description: "Dramatic siren whistle ascent terminating into vibrant multi-color aerial stars.",
    image_url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000010",
    name: "12 Shots Aerial Spectacular Cake",
    sku: "SHT-12SKY",
    category_id: "b1000000-0000-0000-0000-000000000005",
    category_name: "Aerial Repeaters (Sky Shots)",
    price: 380,
    original_price: 750,
    stock_quantity: 95,
    min_stock_alert: 10,
    unit: "Piece",
    description: "12 consecutive multi-color peony shells with crackling gold tail bursting in sky.",
    image_url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000011",
    name: "30 Shots Golden Brocade Night King",
    sku: "SHT-30BRC",
    category_id: "b1000000-0000-0000-0000-000000000005",
    category_name: "Aerial Repeaters (Sky Shots)",
    price: 890,
    original_price: 1750,
    stock_quantity: 60,
    min_stock_alert: 5,
    unit: "Piece",
    description: "Spectacular continuous display of 30 golden palms with ruby red and sapphire blue stars.",
    image_url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000012",
    name: "Digital 28 Chorsa Crackers (Packet)",
    sku: "SND-28CHR",
    category_id: "b1000000-0000-0000-0000-000000000006",
    category_name: "Sound Crackers & Garlands",
    price: 28,
    original_price: 55,
    stock_quantity: 300,
    min_stock_alert: 30,
    unit: "Packet",
    description: "Traditional Sivakasi red crackers with crisp rhythmic bursting sounds.",
    image_url: "https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=600&auto=format&fit=crop&q=80",
    is_featured: false,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000013",
    name: "Classic Hydro Green Atom Bomb (10 Pcs)",
    sku: "SND-HYD10",
    category_id: "b1000000-0000-0000-0000-000000000006",
    category_name: "Sound Crackers & Garlands",
    price: 85,
    original_price: 160,
    stock_quantity: 175,
    min_stock_alert: 20,
    unit: "Box (10 Pcs)",
    description: "High-decibel thunderous sounding green atom bomb in safe packaging.",
    image_url: "https://images.unsplash.com/photo-1508717272800-9fff97da7e8f?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000014",
    name: "Dhanalakshmi Family Delight (25 Items Box)",
    sku: "BOX-DLT25",
    category_id: "b1000000-0000-0000-0000-000000000007",
    category_name: "Festival Gift Boxes",
    price: 799,
    original_price: 1600,
    stock_quantity: 70,
    min_stock_alert: 8,
    unit: "Gift Box",
    description: "Complete family hamper with sparklers, chakkars, pots, pencil torches and kids novelties.",
    image_url: "https://images.unsplash.com/photo-1513297887119-d46091b24bfa?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000015",
    name: "Royal Sivakasi Maha Diwali Box (50 Items)",
    sku: "BOX-ROY50",
    category_id: "b1000000-0000-0000-0000-000000000007",
    category_name: "Festival Gift Boxes",
    price: 1799,
    original_price: 3800,
    stock_quantity: 45,
    min_stock_alert: 5,
    unit: "Gift Box",
    description: "Grand festive box with aerial repeaters, whistling rockets, deluxe flower pots, and sound bombs.",
    image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  }
];

/**
 * Returns Business Settings from localStorage or Supabase
 * Prioritizes local customizations made via Admin Panel so they are never erased by stale remote defaults
 */
async function fetchBusinessSettings() {
  const isCustomized = localStorage.getItem("dc_settings_customized") === "true";
  const stored = localStorage.getItem("dc_business_settings");

  // If already customized locally via Admin panel, respect local version as authoritative
  if (isCustomized && stored) {
    try {
      const parsed = JSON.parse(stored);
      // Background sync to Supabase if configured
      syncSettingsToSupabaseBackground(parsed);
      return parsed;
    } catch (e) {
      console.warn("Error parsing local business settings", e);
    }
  }

  // Otherwise, fetch from Supabase if connected
  const sb = getSupabase();
  if (isSupabaseConfigured() && sb) {
    try {
      const { data, error } = await sb.from("business_settings").select("*").limit(1).single();
      if (!error && data) {
        localStorage.setItem("dc_business_settings", JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn("Failed to fetch settings from Supabase, using local fallback", e);
    }
  }

  if (stored) {
    try { return JSON.parse(stored); } catch (e) {}
  }
  return DEFAULT_BUSINESS_SETTINGS;
}

/**
 * Attempts background sync of business settings to Supabase
 */
async function syncSettingsToSupabaseBackground(settings) {
  const sb = getSupabase();
  if (!isSupabaseConfigured() || !sb) return;
  try {
    await sb.from("business_settings").upsert({
      id: "a0000000-0000-0000-0000-000000000001",
      ...settings,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    // Silent fail in background
  }
}

/**
 * Authoritative save of business settings from Admin Panel
 * Saves to local cache, attempts Supabase sync, and broadcasts to all open storefront tabs
 */
async function saveBusinessSettings(settings) {
  localStorage.setItem("dc_business_settings", JSON.stringify(settings));
  localStorage.setItem("dc_settings_customized", "true");
  localStorage.setItem("dc_settings_updated_at", Date.now().toString());

  // Attempt Supabase live cloud update
  const sb = getSupabase();
  if (isSupabaseConfigured() && sb) {
    try {
      await sb.from("business_settings").upsert({
        id: "a0000000-0000-0000-0000-000000000001",
        ...settings,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Supabase business settings update error:", err);
    }
  }

  // Instantly re-apply to current page
  await applyBusinessBranding();

  // Broadcast to other open tabs/windows
  broadcastSync("settings_updated", settings);
}

// ==============================================================================
// REAL-TIME BROADCAST SYNC BUS (Connects Admin Panel <-> Storefront Website)
// ==============================================================================
const SYNC_CHANNEL_NAME = "dc_sync_bus";
let _syncChannel = null;
try {
  if (typeof BroadcastChannel !== "undefined") {
    _syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch (e) {
  console.warn("BroadcastChannel not supported", e);
}

/**
 * Broadcast an event across all open tabs, windows, and same-page listeners
 */
function broadcastSync(type, payload = {}) {
  const message = { type, payload, timestamp: Date.now() };

  // 1. BroadcastChannel (modern multi-tab)
  if (_syncChannel) {
    try { _syncChannel.postMessage(message); } catch (e) {}
  }

  // 2. Storage event pulse (cross-tab / cross-window fallback)
  try {
    localStorage.setItem("dc_sync_pulse", JSON.stringify(message));
  } catch (e) {}

  // 3. Same-window custom event dispatch
  try {
    window.dispatchEvent(new CustomEvent("dc_sync", { detail: message }));
  } catch (e) {}
}

/**
 * Register a listener for real-time synchronization events
 */
function listenSync(callback) {
  if (typeof callback !== "function") return;

  if (_syncChannel) {
    _syncChannel.addEventListener("message", (ev) => {
      if (ev && ev.data) callback(ev.data);
    });
  }

  window.addEventListener("storage", (ev) => {
    if (ev.key === "dc_sync_pulse" && ev.newValue) {
      try {
        const data = JSON.parse(ev.newValue);
        callback(data);
      } catch (e) {}
    }
  });

  window.addEventListener("dc_sync", (ev) => {
    if (ev && ev.detail) callback(ev.detail);
  });
}

// ==============================================================================
// UNIFIED PRODUCT STORE HELPERS
// ==============================================================================

/**
 * Retrieve custom products list from localStorage, seeding from DEFAULT_PRODUCTS if empty
 */
function getStoredCustomProducts() {
  const raw = localStorage.getItem("dc_custom_products");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  // Initialize with DEFAULT_PRODUCTS
  localStorage.setItem("dc_custom_products", JSON.stringify(DEFAULT_PRODUCTS));
  return [...DEFAULT_PRODUCTS];
}

/**
 * Retrieve list of deleted product IDs to prevent zombie items
 */
function getDeletedProductIds() {
  const raw = localStorage.getItem("dc_deleted_product_ids");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
}

/**
 * Save products to local storage and trigger real-time sync broadcast
 */
function saveStoredCustomProducts(products, source = "admin") {
  localStorage.setItem("dc_custom_products", JSON.stringify(products));
  localStorage.setItem("dc_products_updated_at", Date.now().toString());
  broadcastSync("products_updated", { source, timestamp: Date.now() });
}

/**
 * Format currency with Indian Rupee symbol
 */
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Clean phone number for tel: or wa.me/ links
 */
function cleanPhoneNumber(phone) {
  if (!phone) return "";
  let digits = String(phone).replace(/[^0-9]/g, "");
  if (digits.length === 10) digits = "91" + digits;
  return digits;
}

/**
 * Generate a unique invoice number
 */
function generateInvoiceNumber(prefix = "DC-") {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${year}${month}${day}-${random}`;
}

/**
 * Show a floating toast notification
 */
function showToast(message, type = "success") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Automatically applies business profile branding across website components
 */
async function applyBusinessBranding() {
  const settings = await fetchBusinessSettings();
  if (!settings) return;

  const shopName = settings.shop_name || "Dhanalakshmi Crackers";
  const categoryTag = settings.business_category || "Fireworks Supplier / Store";
  const phone = settings.phone || "+91 98765 43210";
  const whatsappPhone = settings.whatsapp_phone || phone;
  const rawPhone = cleanPhoneNumber(phone);
  const rawWhatsapp = cleanPhoneNumber(whatsappPhone);

  // Update Shop Name
  document.querySelectorAll(".brand-text h1, [data-brand='shop_name'], .drawer-brand-title").forEach(el => {
    el.textContent = shopName;
  });

  // Update Tagline / Category
  document.querySelectorAll(".brand-text span, [data-brand='category'], .drawer-brand-subtitle").forEach(el => {
    el.textContent = categoryTag.toUpperCase();
  });

  // Update Logo if custom logo URL is provided
  if (settings.logo_url) {
    document.querySelectorAll(".brand-symbol, .logo-badge").forEach(el => {
      el.innerHTML = `<img src="${settings.logo_url}" alt="${shopName}" style="width: 100%; height: 100%; object-fit: contain; border-radius: inherit;">`;
    });
  }

  // Update Phone Numbers
  document.querySelectorAll("[data-brand='phone']").forEach(el => {
    el.textContent = phone;
    if (el.tagName === "A") el.href = `tel:+${rawPhone}`;
  });

  // Update top announcement bar phone link if present
  document.querySelectorAll(".top-announcement a[href^='tel:']").forEach(el => {
    el.textContent = phone;
    el.href = `tel:+${rawPhone}`;
  });

  // Update WhatsApp links
  document.querySelectorAll("a[href*='wa.me'], [data-brand='whatsapp']").forEach(el => {
    if (el.tagName === "A" && rawWhatsapp) {
      const currentHref = el.href;
      const textMatch = currentHref.match(/text=([^&]*)/);
      const textQuery = textMatch ? `?text=${textMatch[1]}` : "";
      el.href = `https://wa.me/${rawWhatsapp}${textQuery}`;
    }
  });

  // Update Address
  document.querySelectorAll("[data-brand='address']").forEach(el => {
    if (settings.address) el.textContent = settings.address;
  });

  // Update Operating Hours
  document.querySelectorAll("[data-brand='hours']").forEach(el => {
    if (settings.operating_hours) el.textContent = settings.operating_hours;
  });

  // Update Google Review link
  const reviewUrl = settings.google_review_url || "https://share.google/AwTsdLuk9OtRHQhbR";
  document.querySelectorAll("[data-brand='google_review_url'], #writeGoogleReviewBtn, #modalGoogleReviewBtn").forEach(el => {
    if (el.tagName === "A") el.href = reviewUrl;
  });
}

// Auto-run on DOM ready and listen for cross-tab updates
document.addEventListener("DOMContentLoaded", () => {
  applyBusinessBranding();
  listenSync((event) => {
    if (event.type === "settings_updated") {
      applyBusinessBranding();
    }
  });
});

