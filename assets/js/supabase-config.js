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
  google_review_url: "https://share.google/AwTsdLuk9OtRHQhbR",
  guide_video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78"
};

const DEFAULT_CATEGORIES = [
  { id: "b1000000-0000-0000-0000-000000000001", name: "Gift Box", slug: "gift-box", display_order: 1 },
  { id: "b1000000-0000-0000-0000-000000000002", name: "Sparklers - ஸ்பார்க்லர்", slug: "sparklers", display_order: 2 },
  { id: "b1000000-0000-0000-0000-000000000003", name: "Chakkar - சக்கரம்", slug: "chakkar", display_order: 3 },
  { id: "b1000000-0000-0000-0000-000000000004", name: "Flower Pots - பூச்சட்டி", slug: "flower-pots", display_order: 4 },
  { id: "b1000000-0000-0000-0000-000000000005", name: "Pencil | Twinkling Star", slug: "pencil-twinkling-star", display_order: 5 },
  { id: "b1000000-0000-0000-0000-000000000006", name: "Match Sticks - தீப்பெட்டி", slug: "match-sticks", display_order: 6 },
  { id: "b1000000-0000-0000-0000-000000000007", name: "Bijili - பிஜிலி", slug: "bijili", display_order: 7 },
  { id: "b1000000-0000-0000-0000-000000000008", name: "Wala - வாலா", slug: "wala", display_order: 8 },
  { id: "b1000000-0000-0000-0000-000000000009", name: "Rocket - ராக்கெட்", slug: "rocket", display_order: 9 },
  { id: "b1000000-0000-0000-0000-000000000010", name: "Fancy Crackers - பேன்சி கிராக்கர்", slug: "fancy-crackers", display_order: 10 },
  { id: "b1000000-0000-0000-0000-000000000011", name: "Night Out - நைட் அவுட்", slug: "night-out", display_order: 11 },
  { id: "b1000000-0000-0000-0000-000000000012", name: "Multi Colour Fancy out - மல்டி கலர் பேன்சி அவுட்", slug: "multi-colour-fancy-out", display_order: 12 },
  { id: "b1000000-0000-0000-0000-000000000013", name: "Bombs - பாம்", slug: "bombs", display_order: 13 },
  { id: "b1000000-0000-0000-0000-000000000014", name: "Gun - கன்", slug: "gun", display_order: 14 },
  { id: "b1000000-0000-0000-0000-000000000015", name: "Others", slug: "others", display_order: 15 }
];

const DEFAULT_PRODUCTS = [
  // 1. Gift Box
  {
    id: "c1000000-0000-0000-0000-000000000001",
    name: "Dhanalakshmi Family Delight Gift Box (25 Items)",
    sku: "BOX-DLT25",
    category_id: "b1000000-0000-0000-0000-000000000001",
    category_name: "Gift Box",
    price: 799,
    original_price: 1600,
    stock_quantity: 70,
    min_stock_alert: 8,
    unit: "Gift Box",
    description: "Complete family festive gift box with sparklers, ground chakkars, flower pots, twinkling pencils, and kids novelties.",
    image_url: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: true,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000002",
    name: "Royal Sivakasi Maha Diwali Hamper (50 Items)",
    sku: "BOX-ROY50",
    category_id: "b1000000-0000-0000-0000-000000000001",
    category_name: "Gift Box",
    price: 1799,
    original_price: 3800,
    stock_quantity: 45,
    min_stock_alert: 5,
    unit: "Gift Box",
    description: "Grand deluxe festival assortment with multi-shot aerial cakes, whistling rockets, giant flower pots, and sound crackers.",
    image_url: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: true,
    is_active: true
  },

  // 2. Sparklers - ஸ்பார்க்லர் (Variable Product example)
  {
    id: "c1000000-0000-0000-0000-000000000003",
    name: "Classic Sivakasi Electric Sparklers - ஸ்பார்க்லர்",
    sku: "SPK-VAR",
    category_id: "b1000000-0000-0000-0000-000000000002",
    category_name: "Sparklers - ஸ்பார்க்லர்",
    price: 35,
    original_price: 60,
    stock_quantity: 650,
    min_stock_alert: 25,
    unit: "Box",
    description: "Dazzling smokeless sparklers available in 10cm, 15cm, 30cm and 50cm jumbo sizes. Safe and certified green fireworks.",
    image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: true,
    variants: [
      { id: "v-spk-10", name: "10cm Electric (10 Pcs)", sku: "SPK-10EL", price: 35, original_price: 60, stock_quantity: 250, unit: "Box (10 Pcs)" },
      { id: "v-spk-15", name: "15cm Multi-Color (10 Pcs)", sku: "SPK-15COL", price: 85, original_price: 150, stock_quantity: 180, unit: "Box (10 Pcs)" },
      { id: "v-spk-30", name: "30cm Giant Gold (5 Pcs)", sku: "SPK-30GLD", price: 130, original_price: 220, stock_quantity: 140, unit: "Box (5 Pcs)" },
      { id: "v-spk-50", name: "50cm Jumbo Mega (5 Pcs)", sku: "SPK-50JMB", price: 210, original_price: 380, stock_quantity: 80, unit: "Box (5 Pcs)" }
    ],
    is_featured: true,
    is_active: true
  },

  // 3. Chakkar - சக்கரம்
  {
    id: "c1000000-0000-0000-0000-000000000004",
    name: "Ground Chakkars Deluxe - சக்கரம் (10 Pcs)",
    sku: "CHK-DLX10",
    category_id: "b1000000-0000-0000-0000-000000000003",
    category_name: "Chakkar - சக்கரம்",
    price: 95,
    original_price: 180,
    stock_quantity: 160,
    min_stock_alert: 25,
    unit: "Box (10 Pcs)",
    description: "High-speed spinning wheels generating bright golden floral discs on the ground.",
    image_url: "https://images.unsplash.com/photo-1531844251246-9a1bfaae09fc?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: true,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000005",
    name: "Special 4x4 Whistling Chakkar (5 Pcs)",
    sku: "CHK-WHT5",
    category_id: "b1000000-0000-0000-0000-000000000003",
    category_name: "Chakkar - சக்கரம்",
    price: 140,
    original_price: 260,
    stock_quantity: 90,
    min_stock_alert: 15,
    unit: "Box (5 Pcs)",
    description: "Spins with multi-stage whistling sound followed by showers of multi-color starry rings.",
    image_url: "https://images.unsplash.com/photo-1531844251246-9a1bfaae09fc?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: false,
    is_active: true
  },

  // 4. Flower Pots - பூச்சட்டி
  {
    id: "c1000000-0000-0000-0000-000000000006",
    name: "Flower Pots Special - பூச்சட்டி (10 Pcs)",
    sku: "FLP-SPC10",
    category_id: "b1000000-0000-0000-0000-000000000004",
    category_name: "Flower Pots - பூச்சட்டி",
    price: 120,
    original_price: 240,
    stock_quantity: 200,
    min_stock_alert: 20,
    unit: "Box (10 Pcs)",
    description: "Classic Sivakasi flower pots throwing golden and silvery plumes up to 8 feet high.",
    image_url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: true,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000007",
    name: "Color Koti Giant Flower Pots (5 Pcs)",
    sku: "FLP-KOTI5",
    category_id: "b1000000-0000-0000-0000-000000000004",
    category_name: "Flower Pots - பூச்சட்டி",
    price: 210,
    original_price: 400,
    stock_quantity: 85,
    min_stock_alert: 10,
    unit: "Box (5 Pcs)",
    description: "Grand conical pots that erupt into tri-color fountain sparks reaching 15 feet high.",
    image_url: "https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: true,
    is_active: true
  },

  // 5. Pencil | Twinkling Star
  {
    id: "c1000000-0000-0000-0000-000000000008",
    name: "Magical Twinkling Stars (10 Pcs)",
    sku: "PCL-TWK10",
    category_id: "b1000000-0000-0000-0000-000000000005",
    category_name: "Pencil | Twinkling Star",
    price: 65,
    original_price: 120,
    stock_quantity: 180,
    min_stock_alert: 20,
    unit: "Box (10 Pcs)",
    description: "Gentle handheld glittering stars that twinkle in rhythmic golden and silver sequence.",
    image_url: "https://images.unsplash.com/photo-1543257580-7269da773bf5?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: true,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000009",
    name: "Tri-Color Pencil Torches (5 Pcs)",
    sku: "PCL-TRC5",
    category_id: "b1000000-0000-0000-0000-000000000005",
    category_name: "Pencil | Twinkling Star",
    price: 90,
    original_price: 170,
    stock_quantity: 140,
    min_stock_alert: 15,
    unit: "Box (5 Pcs)",
    description: "Extended burning handheld torch pencils shifting through vibrant green, red and gold colors.",
    image_url: "https://images.unsplash.com/photo-1508717272800-9fff97da7e8f?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: false,
    is_active: true
  },

  // 6. Match Sticks - தீப்பெட்டி
  {
    id: "c1000000-0000-0000-0000-000000000010",
    name: "Mega Deluxe Matchbox - தீப்பெட்டி (10 in 1 Box)",
    sku: "MTC-DLX10",
    category_id: "b1000000-0000-0000-0000-000000000006",
    category_name: "Match Sticks - தீப்பெட்டி",
    price: 50,
    original_price: 100,
    stock_quantity: 220,
    min_stock_alert: 30,
    unit: "Box (10 Pcs)",
    description: "Special fireworks safety strike matchsticks designed for instant, wind-resistant cracker lighting.",
    image_url: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: true,
    is_active: true
  },

  // 7. Bijili - பிஜிலி
  {
    id: "c1000000-0000-0000-0000-000000000011",
    name: "Stripped Bijili Crackers - பிஜிலி (100 Pcs Pouch)",
    sku: "BJL-100",
    category_id: "b1000000-0000-0000-0000-000000000007",
    category_name: "Bijili - பிஜிலி",
    price: 38,
    original_price: 75,
    stock_quantity: 320,
    min_stock_alert: 40,
    unit: "Pouch (100 Pcs)",
    description: "Authentic Sivakasi red-striped bijili sound crackers with crisp, sharp festive burst.",
    image_url: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: true,
    is_active: true
  },

  // 8. Wala - வாலா (Variable Product example)
  {
    id: "c1000000-0000-0000-0000-000000000012",
    name: "Festive Red Garland Wala - வாலா",
    sku: "WALA-VAR",
    category_id: "b1000000-0000-0000-0000-000000000008",
    category_name: "Wala - வாலா",
    price: 45,
    original_price: 90,
    stock_quantity: 420,
    min_stock_alert: 20,
    unit: "Garland",
    description: "Auspicious long festive garlands available from 100 Wala up to 10000 Wala royal celebrations.",
    image_url: "https://images.unsplash.com/photo-1508717272800-9fff97da7e8f?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: true,
    variants: [
      { id: "v-wala-100", name: "100 Wala Garland", sku: "WALA-100", price: 45, original_price: 90, stock_quantity: 250, unit: "Piece" },
      { id: "v-wala-1000", name: "1000 Wala Deluxe", sku: "WALA-1000", price: 320, original_price: 600, stock_quantity: 110, unit: "Piece" },
      { id: "v-wala-5000", name: "5000 Wala Grand", sku: "WALA-5000", price: 1450, original_price: 2800, stock_quantity: 45, unit: "Piece" },
      { id: "v-wala-10000", name: "10000 Wala Maha Raja", sku: "WALA-10000", price: 2800, original_price: 5200, stock_quantity: 15, unit: "Piece" }
    ],
    is_featured: true,
    is_active: true
  },

  // 9. Rocket - ராக்கெட்
  {
    id: "c1000000-0000-0000-0000-000000000013",
    name: "Baby Rocket Sound & Flash - ராக்கெட் (10 Pcs)",
    sku: "RCK-BBY10",
    category_id: "b1000000-0000-0000-0000-000000000009",
    category_name: "Rocket - ராக்கெட்",
    price: 75,
    original_price: 150,
    stock_quantity: 150,
    min_stock_alert: 20,
    unit: "Box (10 Pcs)",
    description: "High-altitude swift rockets finishing with a crisp bang and bright silver flash.",
    image_url: "https://images.unsplash.com/photo-1513297887119-d46091b24bfa?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: false,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000014",
    name: "Whistling Lunik Rockets - ராக்கெட் (10 Pcs)",
    sku: "RCK-LNK10",
    category_id: "b1000000-0000-0000-0000-000000000009",
    category_name: "Rocket - ராக்கெட்",
    price: 190,
    original_price: 360,
    stock_quantity: 110,
    min_stock_alert: 15,
    unit: "Box (10 Pcs)",
    description: "Dramatic siren whistle ascent terminating into vibrant multi-color aerial stars.",
    image_url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: true,
    is_active: true
  },

  // 10. Fancy Crackers - பேன்சி கிராக்கர்
  {
    id: "c1000000-0000-0000-0000-000000000015",
    name: "Peacock Dance Fancy Wheel - பேன்சி கிராக்கர்",
    sku: "FNC-PCK5",
    category_id: "b1000000-0000-0000-0000-000000000010",
    category_name: "Fancy Crackers - பேன்சி கிராக்கர்",
    price: 160,
    original_price: 300,
    stock_quantity: 120,
    min_stock_alert: 15,
    unit: "Box (5 Pcs)",
    description: "Vibrant ground novelty spinning into an open peacock tail pattern with multi-color spark feathers.",
    image_url: "https://images.unsplash.com/photo-1531844251246-9a1bfaae09fc?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: true,
    is_active: true
  },

  // 11. Night Out - நைட் அவுட்
  {
    id: "c1000000-0000-0000-0000-000000000016",
    name: "Night Out Golden Waterfall Fountain - நைட் அவுட்",
    sku: "NIT-WTF2",
    category_id: "b1000000-0000-0000-0000-000000000011",
    category_name: "Night Out - நைட் அவுட்",
    price: 240,
    original_price: 450,
    stock_quantity: 75,
    min_stock_alert: 10,
    unit: "Box (2 Pcs)",
    description: "Special night novelty fountain producing a majestic 20-foot high cascade of golden shimmer.",
    image_url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: true,
    is_active: true
  },

  // 12. Multi Colour Fancy out - மல்டி கலர் பேன்சி அவுட் (Variable Product example)
  {
    id: "c1000000-0000-0000-0000-000000000017",
    name: "Multi Colour Sky Shots Repeating Cake - மல்டி கலர்",
    sku: "SHT-VAR",
    category_id: "b1000000-0000-0000-0000-000000000012",
    category_name: "Multi Colour Fancy out - மல்டி கலர் பேன்சி அவுட்",
    price: 380,
    original_price: 750,
    stock_quantity: 200,
    min_stock_alert: 15,
    unit: "Cake",
    description: "Mesmerizing multi-color aerial repeating shells with crackling golden brocade burst. Choose from 12, 25, 50, or 120 Shots.",
    image_url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: true,
    variants: [
      { id: "v-sht-12", name: "12 Shots Spectacular", sku: "SHT-12SKY", price: 380, original_price: 750, stock_quantity: 95, unit: "Piece" },
      { id: "v-sht-25", name: "25 Shots Golden Palms", sku: "SHT-25SKY", price: 750, original_price: 1400, stock_quantity: 55, unit: "Piece" },
      { id: "v-sht-50", name: "50 Shots Grand Peony", sku: "SHT-50SKY", price: 1450, original_price: 2700, stock_quantity: 35, unit: "Piece" },
      { id: "v-sht-120", name: "120 Shots Royal Extravaganza", sku: "SHT-120SKY", price: 3200, original_price: 5900, stock_quantity: 15, unit: "Piece" }
    ],
    is_featured: true,
    is_active: true
  },

  // 13. Bombs - பாம்
  {
    id: "c1000000-0000-0000-0000-000000000018",
    name: "Classic Hydro Green Atom Bomb - பாம் (10 Pcs)",
    sku: "BMB-HYD10",
    category_id: "b1000000-0000-0000-0000-000000000013",
    category_name: "Bombs - பாம்",
    price: 85,
    original_price: 160,
    stock_quantity: 175,
    min_stock_alert: 20,
    unit: "Box (10 Pcs)",
    description: "High-decibel thunderous sounding green atom bomb packaged in certified safety moisture-proof casing.",
    image_url: "https://images.unsplash.com/photo-1508717272800-9fff97da7e8f?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: true,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000019",
    name: "Mega 2-Sound Thunder Bomb (5 Pcs)",
    sku: "BMB-2SND5",
    category_id: "b1000000-0000-0000-0000-000000000013",
    category_name: "Bombs - பாம்",
    price: 110,
    original_price: 210,
    stock_quantity: 130,
    min_stock_alert: 15,
    unit: "Box (5 Pcs)",
    description: "Twin-stage thunderous cracker creating two consecutive sharp sonic blasts.",
    image_url: "https://images.unsplash.com/photo-1508717272800-9fff97da7e8f?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: false,
    is_active: true
  },

  // 14. Gun - கன்
  {
    id: "c1000000-0000-0000-0000-000000000020",
    name: "Heavy Metal Die-Cast Cracker Gun - கன்",
    sku: "GUN-MTL1",
    category_id: "b1000000-0000-0000-0000-000000000014",
    category_name: "Gun - கன்",
    price: 120,
    original_price: 220,
    stock_quantity: 90,
    min_stock_alert: 15,
    unit: "Piece",
    description: "Durable metal toy cracker pistol for safe Diwali ring-cap pop firing. Loved by children.",
    image_url: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: true,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000021",
    name: "Ring Caps Ammo for Toy Gun (10 Packs)",
    sku: "GUN-CAP10",
    category_id: "b1000000-0000-0000-0000-000000000014",
    category_name: "Gun - கன்",
    price: 45,
    original_price: 85,
    stock_quantity: 350,
    min_stock_alert: 40,
    unit: "Bundle (10 Packs)",
    description: "8-shot round ring caps refills compatible with all standard toy cracker guns.",
    image_url: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: false,
    is_active: true
  },

  // 15. Others
  {
    id: "c1000000-0000-0000-0000-000000000022",
    name: "Black Magic Snake Tablets Novelty - Others",
    sku: "OTH-SNK1",
    category_id: "b1000000-0000-0000-0000-000000000015",
    category_name: "Others",
    price: 40,
    original_price: 80,
    stock_quantity: 260,
    min_stock_alert: 30,
    unit: "Box (10 Pcs)",
    description: "Classic fun smoke snake tablets that expand into long black coils on ignition. Safe for kids.",
    image_url: "https://images.unsplash.com/photo-1543257580-7269da773bf5?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
    is_featured: false,
    is_active: true
  },
  {
    id: "c1000000-0000-0000-0000-000000000023",
    name: "Musical Whistling Siren Crackers (5 Pcs)",
    sku: "OTH-SRN5",
    category_id: "b1000000-0000-0000-0000-000000000015",
    category_name: "Others",
    price: 85,
    original_price: 160,
    stock_quantity: 140,
    min_stock_alert: 20,
    unit: "Box (5 Pcs)",
    description: "Fun melodic siren sound followed by golden crackling spark bursts.",
    image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    video_url: "https://www.youtube.com/watch?v=kY7XlB8mS78",
    has_variants: false,
    variants: [],
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
 * Retrieve custom categories list from localStorage, seeding from DEFAULT_CATEGORIES if empty or outdated
 */
function getStoredCategories() {
  const raw = localStorage.getItem("dc_custom_categories");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= DEFAULT_CATEGORIES.length) {
        return parsed;
      }
    } catch (e) {}
  }
  localStorage.setItem("dc_custom_categories", JSON.stringify(DEFAULT_CATEGORIES));
  return [...DEFAULT_CATEGORIES];
}

/**
 * Retrieve custom products list from localStorage, seeding from DEFAULT_PRODUCTS if empty
 */
function getStoredCustomProducts() {
  const raw = localStorage.getItem("dc_custom_products");
  if (raw) {
    try {
      let parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Check if catalog has new categories or variable products
        const hasNewCategories = parsed.some(p => p.category_name && p.category_name.includes("ஸ்பார்க்லர்"));
        if (!hasNewCategories) {
          const customAdded = parsed.filter(p => !DEFAULT_PRODUCTS.some(dp => dp.id === p.id || dp.sku === p.sku));
          parsed = [...DEFAULT_PRODUCTS, ...customAdded];
          localStorage.setItem("dc_custom_products", JSON.stringify(parsed));
        }
        return parsed;
      }
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

