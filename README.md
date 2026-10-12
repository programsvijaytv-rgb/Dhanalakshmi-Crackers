# 🪔 Dhanalakshmi Crackers - E-Commerce Website + Admin Panel + POS Billing System

A complete, clean, responsive, and beginner-friendly business web application for **Dhanalakshmi Crackers (Sivakasi)**.

Built with **HTML5, Vanilla CSS3, and Vanilla JavaScript (ES6)** with **Supabase PostgreSQL & Auth** backend, supporting retail storefront, counter POS billing, multi-format invoice printing, merchant UPI QR codes, and WhatsApp invoice sharing.

---

## 🌟 Key Features

1. **Festive Public Storefront**
   - High-performance, mobile-responsive catalog with direct Sivakasi wholesale pricing.
   - Category filtering (Sparklers, Chakkars, Flower Pots, Rockets, Sky Shots, Sound Crackers, Gift Boxes).
   - Real-time product search by name and SKU.
   - Persistent shopping cart with instant quantity controls and Indian Rupee (`₹`) formatting.
   - Safe checkout capturing customer name, mobile number, full address, and preferred payment mode.

2. **Counter POS Billing Terminal (`admin/billing.html`)**
   - Built specifically for high-speed counter sales during festive rush.
   - Live barcode / SKU scan and instant search item addition.
   - Quantity adjustments, line item removal, and bill clearing.
   - Dynamic item discount (%), GST calculation (18% standard), and instant grand totals.
   - Cash drawer tender & change calculator.
   - Single-click atomic invoice saving and inventory stock deduction via PostgreSQL function.

3. **Multi-Format Invoice Printing (`assets/css/print.css`)**
   - **A4 Full-Page Invoice**: Formal tax invoice with company GSTIN, itemized rates, taxes, and festive greetings.
   - **80mm Thermal Receipt**: Compact receipt for counter thermal roll printers.
   - **58mm Thermal Receipt**: Narrow format for mobile Bluetooth POS printers.
   - Native `window.print()` integration with clean `@page` CSS styling hiding browser chrome and page headers.

4. **Merchant Payment Integration**
   - **Cash Payment**: Live change calculator.
   - **Dynamic Merchant UPI QR Code**: Generates standard NPCI UPI URI (`upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...`) for instant scanning on Google Pay, PhonePe, Paytm, or BHIM.
   - **Online Payment Gateway**: Supabase Edge Function architecture with server-side Razorpay order validation.

5. **WhatsApp Integration**
   - Clean international phone number sanitation.
   - Click-to-chat formatted receipt message containing shop name, invoice number, line items, totals, payment status, and customer greetings.
   - Direct button to share invoice with customer via WhatsApp immediately after billing.

6. **Robust Supabase PostgreSQL Database & RLS**
   - Fully relational schema (`profiles`, `categories`, `products`, `customers`, `orders`, `order_items`, `invoices`, `invoice_items`, `payments`, `inventory_movements`, `business_settings`).
   - Atomic Stored Procedure `create_pos_invoice(...)` with row-level locks preventing race conditions, double deductions, and duplicate invoices.
   - Strict Row Level Security (RLS) policies protecting sensitive financial records from public reads.

---

## 📁 Project Structure

```
├── index.html                   # Home page (Festive hero, highlights, trending crackers)
├── products.html                # Product listing with category filters and search
├── product-details.html         # Individual product view with specifications & safety tips
├── cart.html                    # Shopping cart
├── checkout.html                # Delivery & payment checkout page
├── login.html                   # Admin & cashier login
│
├── admin/
│   ├── index.html               # Admin KPI dashboard (sales volume, orders, inventory alerts)
│   ├── billing.html             # High-speed POS billing terminal
│   ├── products.html            # Product inventory management (Add/Edit/Delete/Stock)
│   ├── orders.html              # Online customer order status manager
│   ├── customers.html           # Customer purchase directory
│   ├── invoices.html            # Invoices history archive & reprint
│   ├── reports.html             # Sales analytics & CSV export
│   └── settings.html            # Business identity, UPI & Supabase settings
│
├── assets/
│   ├── css/
│   │   ├── style.css            # Main storefront design
│   │   ├── admin.css            # Admin & POS terminal layout
│   │   └── print.css            # A4, 80mm & 58mm invoice print styles
│   └── js/
│       ├── supabase-config.js   # Supabase client & local cache fallback
│       ├── auth.js              # Supabase Auth & route guards
│       ├── products.js          # Product catalog rendering & filtering
│       ├── cart.js              # Cart state & LocalStorage sync
│       ├── checkout.js          # Checkout flow & order submission
│       ├── billing.js           # POS billing engine & atomic save
│       ├── invoices.js          # Multi-format invoice renderer & print trigger
│       ├── payments.js          # Cash calculator & UPI QR code generator
│       └── whatsapp.js          # WhatsApp click-to-chat invoice formatting
│
├── supabase/
│   ├── schema.sql               # Complete PostgreSQL schema, RLS & Stored Procedures
│   ├── seed.sql                 # Sample Sivakasi categories, products & settings
│   └── functions/
│       └── create-razorpay-order/index.ts  # Edge function for payment gateway
├── vercel.json                  # Vercel deployment configuration
├── .env.example                 # Environment variables guide
└── README.md                    # Setup & deployment documentation
```

---

## 🚀 Setup & Deployment Guide

### Step 1: Open the Project in Antigravity IDE
Open the folder `h:/Dhanalakshmi Crackers` in Antigravity IDE. All files are ready out-of-the-box with immediate demo mode fallback.

### Step 2: Create a Supabase Project
1. Visit [supabase.com](https://supabase.com) and create a free project named **Dhanalakshmi Crackers**.
2. Note down your **Project URL** and **anon public key** from `Settings` -> `API`.

### Step 3: Run Database Schema & Seed Data
1. Open the **SQL Editor** tab in your Supabase Dashboard.
2. Copy and paste the contents of `supabase/schema.sql` and click **Run**.
3. Next, copy and paste the contents of `supabase/seed.sql` and click **Run** to populate initial Sivakasi cracker products, categories, and business settings.

### Step 4: Create the First Administrator User
1. In the Supabase Dashboard, navigate to **Authentication** -> **Users**.
2. Click **Add User** -> **Create User**.
   - Email: `admin@dhanalakshmicrackers.com`
   - Password: `YourSecurePassword123`
   - Auto Confirm User: **Checked**
3. Open the **SQL Editor** and run this query to assign administrator privileges:
   ```sql
   INSERT INTO public.profiles (id, email, full_name, role)
   VALUES (
     (SELECT id FROM auth.users WHERE email = 'admin@dhanalakshmicrackers.com'),
     'admin@dhanalakshmicrackers.com',
     'Store Manager',
     'admin'
   ) ON CONFLICT (id) DO UPDATE SET role = 'admin';
   ```

### Step 5: Configure Storage Bucket for Product Images
1. In the Supabase Dashboard, go to **Storage** -> **New Bucket**.
2. Name the bucket `product-images`.
3. Set the bucket to **Public** so product images can be viewed by customers.
4. Add a policy allowing authenticated staff to upload images.

### Step 6: Connect Frontend to Supabase
You can configure your keys in one of two easy ways:
- **Option A (Via UI):** Sign in to `login.html`, navigate to **Store Settings** (`admin/settings.html`), paste your Supabase URL and Anon Key under *Section 3*, and click **Save Settings**.
- **Option B (Directly in Code):** Open `assets/js/supabase-config.js` and set:
  ```javascript
  const DEFAULT_SUPABASE_URL = "https://your-project.supabase.co";
  const DEFAULT_SUPABASE_ANON_KEY = "your-public-anon-key";
  ```

### Step 7: Deploy to Vercel
1. Install Vercel CLI (`npm i -g vercel`) or push to GitHub and import into [vercel.com](https://vercel.com).
2. The project contains `vercel.json` with clean URL routing and static caching.
3. Deploy with:
   ```bash
   vercel --prod
   ```

---

## 🖨️ How to Test POS Billing & Printing

1. Navigate to `login.html` (Demo login: `admin@dhanalakshmicrackers.com` / `admin123`).
2. Click **POS Billing Terminal** (`admin/billing.html`).
3. Click or search for firecrackers (e.g., *Ground Chakkars Deluxe* or *12 Shots Aerial Cake*).
4. Enter the customer's phone number and cash received.
5. Click **⚡ Pay & Print Bill**.
6. The interactive invoice preview will open:
   - Click **📄 A4** for full A4 tax invoice format.
   - Click **🧾 80mm** for standard 80mm thermal receipt format.
   - Click **🧾 58mm** for narrow mobile Bluetooth printer format.
   - Click **📲 Send via WhatsApp** to test instant formatted WhatsApp sharing.
   - Click **🖨️ Print Invoice** to invoke browser printing.

---

## 🔒 Security Best Practices
- **Public vs. Secret Keys:** The Supabase public anon key is safe for frontend client execution. The `service_role` key must **never** be added to browser JavaScript.
- **Row Level Security (RLS):** Anonymous users can only read active products/categories and submit orders. Invoices, financial records, inventory audit trails, and settings require an authenticated `admin` or `staff` profile.
- **Atomic Concurrency:** POS stock deduction uses row locks (`FOR UPDATE`) within PostgreSQL transaction blocks to guarantee zero overselling.
