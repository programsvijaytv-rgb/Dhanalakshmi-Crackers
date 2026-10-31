// ==============================================================================
// Dhanalakshmi Crackers - Authentication & Access Control
// ==============================================================================

/**
 * Handle Admin / Staff Login
 */
async function handleAdminLogin(email, password) {
  const sb = getSupabase();

  if (isSupabaseConfigured() && sb) {
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        // Fallback for store manager before new users are added to Supabase Auth
        if (email === "admin@dhanalakshmicrackers.com" && password === "admin123") {
          sessionStorage.setItem("dc_auth_user", JSON.stringify({
            email: "admin@dhanalakshmicrackers.com",
            role: "admin",
            full_name: "Store Manager (Local Demo)"
          }));
          return { success: true, isDemo: true };
        }
        throw new Error(error.message);
      }

      // Check user role in profiles table
      const { data: profile, error: profileErr } = await sb
        .from("profiles")
        .select("role, full_name")
        .eq("id", data.user.id)
        .single();

      if (profileErr || !profile || !["admin", "staff"].includes(profile.role)) {
        await sb.auth.signOut();
        throw new Error("Access denied. You do not have administrator permissions.");
      }

      sessionStorage.setItem("dc_auth_user", JSON.stringify({
        email: data.user.email,
        role: profile.role,
        full_name: profile.full_name || "Admin Staff"
      }));

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  } else {
    // Demo Mode Authentication (when Supabase credentials not yet configured)
    if (email === "admin@dhanalakshmicrackers.com" && password === "admin123") {
      sessionStorage.setItem("dc_auth_user", JSON.stringify({
        email: "admin@dhanalakshmicrackers.com",
        role: "admin",
        full_name: "Store Manager (Demo)"
      }));
      return { success: true, isDemo: true };
    } else {
      return {
        success: false,
        error: "Invalid credentials. (For Demo Mode: admin@dhanalakshmicrackers.com / admin123)"
      };
    }
  }
}

/**
 * Check if the user is authenticated; if not, redirect to login
 */
async function protectAdminRoute() {
  const sessionUser = sessionStorage.getItem("dc_auth_user");
  const sb = (typeof getSupabase === "function") ? getSupabase() : null;

  if (typeof isSupabaseConfigured === "function" && isSupabaseConfigured() && sb) {
    try {
      const sessionPromise = sb.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Auth timeout")), 2500));
      const res = await Promise.race([sessionPromise, timeoutPromise]);
      const session = res?.data?.session;
      if (!session && !sessionUser) {
        window.location.href = "/login.html";
        return false;
      }
    } catch (err) {
      console.warn("Auth session check notice (continuing with local session):", err.message);
      if (!sessionUser) {
        window.location.href = "/login.html";
        return false;
      }
    }
  } else {
    if (!sessionUser) {
      window.location.href = "/login.html";
      return false;
    }
  }

  // Update current user display in admin header safely
  let user = { full_name: "Admin Staff", role: "admin" };
  try {
    if (sessionUser) {
      user = JSON.parse(sessionUser);
    }
  } catch (e) {
    console.warn("Error parsing sessionUser:", e);
  }

  const nameEl = document.getElementById("adminUserName");
  const roleEl = document.getElementById("adminUserRole");
  if (nameEl) nameEl.textContent = user.full_name || "Admin Staff";
  if (roleEl) roleEl.textContent = (user.role || "ADMIN").toUpperCase();

  return true;
}

/**
 * Sign out administrator
 */
async function handleLogout() {
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.auth.signOut();
    } catch (e) {
      console.warn("Sign out error", e);
    }
  }
  sessionStorage.removeItem("dc_auth_user");
  window.location.href = "/login.html";
}
