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
// DEFAULT / MOCK DATA STORE (Ensures instant preview before Supabase is connected)
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
  { id: "cat-1", name: "Sparklers & Flares", slug: "sparklers", display_order: 1 },
  { id: "cat-2", name: "Ground Chakkars", slug: "ground-chakkars", display_order: 2 },
  { id: "cat-3", name: "Flower Pots", slug: "flower-pots", display_order: 3 },
  { id: "cat-4", name: "Rockets & Missiles", slug: "rockets", display_order: 4 },
  { id: "cat-5", name: "Aerial Repeaters (Sky Shots)", slug: "sky-shots", display_order: 5 },
  { id: "cat-6", name: "Sound Crackers", slug: "sound-crackers", display_order: 6 },
  { id: "cat-7", name: "Festival Gift Boxes", slug: "gift-boxes", display_order: 7 }
];

const DEFAULT_PRODUCTS = [
  {
    id: "prod-1",
    name: "10cm Electric Sparklers (10 Pcs)",
    sku: "SPK-10EL",
    category_id: "cat-1",
    category_name: "Sparklers & Flares",
    price: 35,
    original_price: 60,
    stock_quantity: 250,
    unit: "Box (10 Pcs)",
    description: "Dazzling silver sparklers with smooth low-smoke burning, ideal for young children.",
    image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "prod-2",
    name: "15cm Color Sparklers (5 in 1 Box)",
    sku: "SPK-15COL",
    category_id: "cat-1",
    category_name: "Sparklers & Flares",
    price: 85,
    original_price: 150,
    stock_quantity: 180,
    unit: "Box (10 Pcs)",
    description: "Assorted red, green, yellow, silver and gold sparklers with extended burning duration.",
    image_url: "https://images.unsplash.com/photo-1543257580-7269da773bf5?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "prod-3",
    name: "Ground Chakkars Deluxe (10 Pcs)",
    sku: "CHK-DLX10",
    category_id: "cat-2",
    category_name: "Ground Chakkars",
    price: 95,
    original_price: 180,
    stock_quantity: 160,
    unit: "Box (10 Pcs)",
    description: "High-speed spinning wheels generating bright golden floral discs on the ground.",
    image_url: "https://images.unsplash.com/photo-1531844251246-9a1bfaae09fc?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "prod-4",
    name: "Flower Pots Special (10 Pcs)",
    sku: "FLP-SPC10",
    category_id: "cat-3",
    category_name: "Flower Pots",
    price: 120,
    original_price: 240,
    stock_quantity: 200,
    unit: "Box (10 Pcs)",
    description: "Classic Sivakasi flower pots throwing golden and silvery plumes up to 8 feet.",
    image_url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "prod-5",
    name: "Color Koti Giant Flower Pots (5 Pcs)",
    sku: "FLP-KOTI5",
    category_id: "cat-3",
    category_name: "Flower Pots",
    price: 210,
    original_price: 400,
    stock_quantity: 85,
    unit: "Box (5 Pcs)",
    description: "Grand conical pots that erupt into tri-color fountain sparks reaching 15 feet high.",
    image_url: "https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "prod-6",
    name: "Whistling Lunik Rockets (10 Pcs)",
    sku: "RCK-LNK10",
    category_id: "cat-4",
    category_name: "Rockets & Missiles",
    price: 190,
    original_price: 360,
    stock_quantity: 110,
    unit: "Box (10 Pcs)",
    description: "Dramatic siren whistle ascent terminating into vibrant multi-color aerial stars.",
    image_url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "prod-7",
    name: "12 Shots Aerial Spectacular Cake",
    sku: "SHT-12SKY",
    category_id: "cat-5",
    category_name: "Aerial Repeaters (Sky Shots)",
    price: 380,
    original_price: 750,
    stock_quantity: 95,
    unit: "Piece",
    description: "12 consecutive multi-color peony shells with crackling gold tail bursting in sky.",
    image_url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "prod-8",
    name: "Classic Hydro Green Atom Bomb (10 Pcs)",
    sku: "SND-HYD10",
    category_id: "cat-6",
    category_name: "Sound Crackers",
    price: 85,
    original_price: 160,
    stock_quantity: 175,
    unit: "Box (10 Pcs)",
    description: "High-decibel thunderous sounding green atom bomb in safe packaging.",
    image_url: "https://images.unsplash.com/photo-1508717272800-9fff97da7e8f?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  },
  {
    id: "prod-9",
    name: "Dhanalakshmi Family Delight (25 Items Box)",
    sku: "BOX-DLT25",
    category_id: "cat-7",
    category_name: "Festival Gift Boxes",
    price: 799,
    original_price: 1600,
    stock_quantity: 70,
    unit: "Gift Box",
    description: "Complete family hamper with sparklers, chakkars, pots, pencil torches and kids novelties.",
    image_url: "https://images.unsplash.com/photo-1513297887119-d46091b24bfa?w=600&auto=format&fit=crop&q=80",
    is_featured: true,
    is_active: true
  }
];

/**
 * Returns Business Settings from Supabase or cached settings
 */
async function fetchBusinessSettings() {
  const sb = getSupabase();
  if (isSupabaseConfigured() && sb) {
    try {
      const { data, error } = await sb.from("business_settings").select("*").limit(1).single();
      if (!error && data) {
        localStorage.setItem("dc_business_settings", JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn("Failed to fetch settings from Supabase, using local", e);
    }
  }

  const stored = localStorage.getItem("dc_business_settings");
  if (stored) {
    try { return JSON.parse(stored); } catch (e) {}
  }
  return DEFAULT_BUSINESS_SETTINGS;
}

/**
 * Format currency with Indian Rupee symbol
 */
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  // Update Shop Name
  document.querySelectorAll(".brand-text h1, [data-brand='shop_name']").forEach(el => {
    if (settings.shop_name) el.textContent = settings.shop_name;
  });

  // Update Tagline / Category
  document.querySelectorAll(".brand-text span, [data-brand='category']").forEach(el => {
    if (settings.business_category) el.textContent = settings.business_category.toUpperCase();
  });

  // Update Logo if custom logo URL is provided
  if (settings.logo_url) {
    document.querySelectorAll(".brand-symbol, .logo-badge").forEach(el => {
      el.innerHTML = `<img src="${settings.logo_url}" alt="${settings.shop_name}" style="width: 100%; height: 100%; object-fit: contain; border-radius: inherit;">`;
    });
  }

  // Update Phone Numbers
  document.querySelectorAll("[data-brand='phone']").forEach(el => {
    if (settings.phone) {
      el.textContent = settings.phone;
      if (el.tagName === "A") el.href = `tel:${settings.phone.replace(/[^0-9+]/g, '')}`;
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
  document.querySelectorAll("[data-brand='google_review_url']").forEach(el => {
    const url = settings.google_review_url || "https://share.google/AwTsdLuk9OtRHQhbR";
    if (el.tagName === "A") el.href = url;
  });
}

document.addEventListener("DOMContentLoaded", applyBusinessBranding);

