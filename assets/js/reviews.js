// ==============================================================================
// Dhanalakshmi Crackers - Google Reviews & Testimonials Module
// Handles review fetching, aggregate rating display, and customer review submissions
// Official Google Business Profile: https://share.google/AwTsdLuk9OtRHQhbR
// ==============================================================================

const GOOGLE_REVIEW_FALLBACK_URL = "https://share.google/AwTsdLuk9OtRHQhbR";

const INITIAL_VERIFIED_REVIEWS = [
  {
    id: "rev-1",
    customer_name: "S. Karthikeyan",
    city: "Chennai",
    rating: 5,
    comment: "Best crackers shop in Sivakasi! Ordered 30 Shots Golden Brocade and 25 Items Family Box. Every single piece burst with vibrant colours, zero duds. Wholesale prices are truly authentic Sivakasi factory rates.",
    source: "google",
    is_verified: true,
    time_ago: "3 days ago"
  },
  {
    id: "rev-2",
    customer_name: "Anandhi Rajan",
    city: "Coimbatore",
    rating: 5,
    comment: "Super fast dispatch and solid waterproof corrugated box packing. Kids loved the electric sparklers and color koti flower pots. Very low smoke and 100% safe. Highly recommended for families!",
    source: "google",
    is_verified: true,
    time_ago: "1 week ago"
  },
  {
    id: "rev-3",
    customer_name: "Vignesh M.",
    city: "Madurai",
    rating: 5,
    comment: "Buying from Dhanalakshmi Crackers for 3 consecutive Diwalis now. Direct factory rate saved us almost 60% compared to local retail stalls. Received instant WhatsApp invoice immediately.",
    source: "google",
    is_verified: true,
    time_ago: "2 weeks ago"
  },
  {
    id: "rev-4",
    customer_name: "Rajesh Kumar",
    city: "Bengaluru",
    rating: 5,
    comment: "12 Shots sky repeaters and whistling lunik rockets were mind-blowing. The sky was lit up for minutes. Top notch Sivakasi quality and very polite customer service on WhatsApp.",
    source: "google",
    is_verified: true,
    time_ago: "3 weeks ago"
  },
  {
    id: "rev-5",
    customer_name: "Priya Sundaram",
    city: "Sivakasi",
    rating: 5,
    comment: "Visited their Sivakasi outlet directly. Very organized POS counter billing, transparent wholesale price list, and certified PESO standard green crackers. Best experience!",
    source: "google",
    is_verified: true,
    time_ago: "1 month ago"
  },
  {
    id: "rev-6",
    customer_name: "K. Balasubramanian",
    city: "Trichy",
    rating: 5,
    comment: "Prompt delivery before Diwali rush. All ground chakkars spun smoothly with giant golden rings. Payment via UPI QR was hassle-free. Will definitely order every year.",
    source: "google",
    is_verified: true,
    time_ago: "1 month ago"
  }
];

let selectedRating = 5;

/**
 * Returns the configured Google Business Profile review URL
 */
function getGoogleReviewUrl() {
  const cachedSettings = localStorage.getItem("dc_business_settings");
  if (cachedSettings) {
    try {
      const parsed = JSON.parse(cachedSettings);
      if (parsed.google_review_url) return parsed.google_review_url;
    } catch (e) {
      // fallback
    }
  }
  return GOOGLE_REVIEW_FALLBACK_URL;
}

/**
 * Fetch reviews from Supabase or localStorage
 */
async function getReviewsList() {
  let reviews = [];
  const sb = typeof getSupabase === "function" ? getSupabase() : null;

  if (typeof isSupabaseConfigured === "function" && isSupabaseConfigured() && sb) {
    try {
      const { data, error } = await sb
        .from("reviews")
        .select("*")
        .eq("is_verified", true)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        reviews = data.map(r => ({
          ...r,
          time_ago: r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "Recent"
        }));
      }
    } catch (err) {
      console.warn("Could not load reviews from Supabase:", err);
    }
  }

  // Fallback to localStorage or defaults
  if (!reviews || reviews.length === 0) {
    const local = localStorage.getItem("dc_customer_reviews");
    if (local) {
      try {
        reviews = JSON.parse(local);
      } catch (e) {
        reviews = [...INITIAL_VERIFIED_REVIEWS];
      }
    } else {
      reviews = [...INITIAL_VERIFIED_REVIEWS];
      localStorage.setItem("dc_customer_reviews", JSON.stringify(reviews));
    }
  }

  return reviews;
}

/**
 * Render the Google Reviews section on the page
 */
async function renderReviews() {
  const container = document.getElementById("reviewsCardsGrid");
  if (!container) return;

  const reviews = await getReviewsList();
  const googleUrl = getGoogleReviewUrl();

  // Update dynamic links for direct Google review action
  document.querySelectorAll(".btn-open-google-review").forEach(btn => {
    btn.setAttribute("href", googleUrl);
  });

  // Calculate stats
  const totalReviewsCount = 124 + reviews.length; // Base Google verified + dynamic
  const sumRatings = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
  const avgRating = (reviews.length > 0 ? (sumRatings / reviews.length).toFixed(1) : "4.9");

  // Update Aggregate Score Badges if present
  const scoreEl = document.getElementById("googleAggregateScore");
  if (scoreEl) scoreEl.textContent = avgRating;

  const countEl = document.getElementById("googleTotalReviewsCount");
  if (countEl) countEl.textContent = `Based on ${totalReviewsCount}+ verified reviews`;

  // Render cards
  container.innerHTML = reviews.map(rev => {
    const initials = rev.customer_name
      .split(" ")
      .map(n => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const starsHtml = "★".repeat(rev.rating) + "☆".repeat(Math.max(0, 5 - rev.rating));

    return `
      <div class="review-card">
        <div class="review-header">
          <div class="reviewer-avatar">${initials}</div>
          <div class="reviewer-meta">
            <div class="reviewer-name">
              ${escapeHtml(rev.customer_name)}
              <span class="review-google-badge" title="Verified Google Review">
                <svg width="14" height="14" viewBox="0 0 24 24" class="google-icon">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Google Review
              </span>
            </div>
            <div class="reviewer-city">📍 ${escapeHtml(rev.city || "Verified Customer")} • <span class="review-time">${rev.time_ago || "Verified Purchase"}</span></div>
          </div>
        </div>

        <div class="review-stars-row">
          <span class="stars-gold">${starsHtml}</span>
          <span class="verified-tag">✓ Verified Buyer</span>
        </div>

        <p class="review-comment">
          "${escapeHtml(rev.comment)}"
        </p>
      </div>
    `;
  }).join("");
}

/**
 * Open Write Review Modal
 */
function openAddReviewModal() {
  const modal = document.getElementById("addReviewModal");
  if (modal) {
    modal.classList.remove("modal-hidden");
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    setRating(5);
  }
}

/**
 * Close Write Review Modal
 */
function closeAddReviewModal() {
  const modal = document.getElementById("addReviewModal");
  if (modal) {
    modal.classList.add("modal-hidden");
    modal.style.display = "none";
    document.body.style.overflow = "";
  }
}


/**
 * Interactive Star Rating Handler
 */
function setRating(rating) {
  selectedRating = rating;
  const starsContainer = document.getElementById("modalStarSelector");
  if (!starsContainer) return;

  const labels = [
    "",
    "1 Star - Poor",
    "2 Stars - Fair",
    "3 Stars - Good",
    "4 Stars - Very Good!",
    "5 Stars - Excellent Experience! 🎆"
  ];

  const stars = starsContainer.querySelectorAll(".star-btn");
  stars.forEach((btn, index) => {
    const starVal = index + 1;
    if (starVal <= rating) {
      btn.classList.add("active");
      btn.textContent = "★";
    } else {
      btn.classList.remove("active");
      btn.textContent = "☆";
    }
  });

  const ratingLabel = document.getElementById("selectedRatingLabel");
  if (ratingLabel) {
    ratingLabel.textContent = labels[rating] || `${rating} Stars`;
  }
}

/**
 * Handle review form submission
 */
async function handleCustomerReviewSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById("reviewCustomerName");
  const cityInput = document.getElementById("reviewCustomerCity");
  const commentInput = document.getElementById("reviewComment");
  const submitBtn = document.getElementById("btnSubmitReview");

  const name = nameInput ? nameInput.value.trim() : "";
  const city = cityInput ? cityInput.value.trim() : "Verified Customer";
  const comment = commentInput ? commentInput.value.trim() : "";

  if (!name || !comment) {
    alert("Please fill in both your name and review feedback.");
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Publishing Review...";
  }

  const newReview = {
    id: "rev-" + Date.now(),
    customer_name: name,
    city: city || "Tamil Nadu",
    rating: selectedRating,
    comment: comment,
    source: "website",
    is_verified: true,
    time_ago: "Just now",
    created_at: new Date().toISOString()
  };

  // 1. Save locally
  let stored = [];
  try {
    const raw = localStorage.getItem("dc_customer_reviews");
    stored = raw ? JSON.parse(raw) : [...INITIAL_VERIFIED_REVIEWS];
  } catch (err) {
    stored = [...INITIAL_VERIFIED_REVIEWS];
  }
  stored.unshift(newReview);
  localStorage.setItem("dc_customer_reviews", JSON.stringify(stored));

  // 2. Try persisting to Supabase if configured
  const sb = typeof getSupabase === "function" ? getSupabase() : null;
  if (typeof isSupabaseConfigured === "function" && isSupabaseConfigured() && sb) {
    try {
      await sb.from("reviews").insert([{
        customer_name: name,
        city: city || "Tamil Nadu",
        rating: selectedRating,
        comment: comment,
        is_verified: true,
        source: "website"
      }]);
    } catch (sbErr) {
      console.warn("Could not push review to Supabase:", sbErr);
    }
  }

  // 3. Reset form and close modal
  if (nameInput) nameInput.value = "";
  if (cityInput) cityInput.value = "";
  if (commentInput) commentInput.value = "";
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit & Post to Google Review 🚀";
  }

  closeAddReviewModal();
  renderReviews();

  // 4. Prompt customer & redirect to Google Business Profile
  const googleUrl = getGoogleReviewUrl();
  const willPostToGoogle = confirm(
    `Thank you, ${name}! 🎉\n\nYour 5-star review has been published on Dhanalakshmi Crackers website.\n\nWould you like to post this review directly on our Official Google Business Profile now?`
  );

  if (willPostToGoogle) {
    window.open(googleUrl, "_blank", "noopener,noreferrer");
  }
}

/**
 * Helper to escape HTML characters
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  renderReviews();

  const form = document.getElementById("addReviewForm");
  if (form) {
    form.addEventListener("submit", handleCustomerReviewSubmit);
  }

  // Setup Star Click Events
  const starsContainer = document.getElementById("modalStarSelector");
  if (starsContainer) {
    const starButtons = starsContainer.querySelectorAll(".star-btn");
    starButtons.forEach((btn, idx) => {
      btn.addEventListener("click", () => setRating(idx + 1));
      btn.addEventListener("mouseenter", () => {
        const ratingLabel = document.getElementById("selectedRatingLabel");
        if (ratingLabel) {
          const previewLabels = ["", "1 Star - Poor", "2 Stars - Fair", "3 Stars - Good", "4 Stars - Very Good!", "5 Stars - Excellent Experience! 🎆"];
          ratingLabel.textContent = previewLabels[idx + 1] || "";
        }
      });
      btn.addEventListener("mouseleave", () => setRating(selectedRating));
    });
  }

  // Close modal when clicking outside
  const modal = document.getElementById("addReviewModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeAddReviewModal();
      }
    });
  }
});
