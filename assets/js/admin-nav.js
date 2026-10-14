// ==============================================================================
// Dhanalakshmi Crackers - Admin Panel Mobile Navigation & UX Engine
// Provides mobile drawer toggle, backdrop overlay, touch gestures, and bottom bar
// ==============================================================================

(function () {
  'use strict';

  function initAdminMobileNavigation() {
    const sidebar = document.querySelector('.admin-sidebar');
    const topbar = document.querySelector('.admin-topbar');
    if (!sidebar) return;

    // 1. Create or get backdrop
    let backdrop = document.getElementById('adminSidebarBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'adminSidebarBackdrop';
      backdrop.className = 'admin-sidebar-backdrop';
      document.body.appendChild(backdrop);
    }

    // 2. Ensure hamburger toggle in topbar
    if (topbar) {
      let toggleBtn = document.getElementById('adminMobileToggle');
      if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.id = 'adminMobileToggle';
        toggleBtn.className = 'admin-mobile-toggle';
        toggleBtn.setAttribute('aria-label', 'Toggle admin navigation menu');
        toggleBtn.innerHTML = '<span></span><span></span><span></span>';
        topbar.prepend(toggleBtn);
      }

      toggleBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
      };
    }

    // 3. Ensure close button in sidebar header
    const sidebarHeader = sidebar.querySelector('.admin-sidebar-header');
    if (sidebarHeader) {
      let closeBtn = document.getElementById('adminSidebarClose');
      if (!closeBtn) {
        closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.id = 'adminSidebarClose';
        closeBtn.className = 'admin-sidebar-close';
        closeBtn.setAttribute('aria-label', 'Close sidebar navigation');
        closeBtn.innerHTML = '&times;';
        sidebarHeader.appendChild(closeBtn);
      }

      closeBtn.onclick = function (e) {
        e.preventDefault();
        closeSidebar();
      };
    }

    // 4. Backdrop click closes sidebar
    backdrop.onclick = function () {
      closeSidebar();
    };

    // 5. Close sidebar on ESC key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSidebar();
    });

    // 6. Close sidebar when clicking any navigation link
    sidebar.querySelectorAll('.admin-nav-item').forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.innerWidth <= 991) {
          closeSidebar();
        }
      });
    });

    // 7. Inject Mobile Bottom Navigation Bar if not already present
    injectAdminMobileBottomNav();

    function openSidebar() {
      sidebar.classList.add('open');
      backdrop.classList.add('open');
      document.body.classList.add('admin-drawer-locked');
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
      document.body.classList.remove('admin-drawer-locked');
    }

    function toggleSidebar() {
      if (sidebar.classList.contains('open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    }

    // Expose toggle functions globally
    window.toggleAdminSidebar = toggleSidebar;
    window.openAdminSidebar = openSidebar;
    window.closeAdminSidebar = closeSidebar;
  }

  function injectAdminMobileBottomNav() {
    if (document.getElementById('adminMobileBottomNav')) return;

    const currentPath = window.location.pathname.toLowerCase();
    const isIndex = currentPath.endsWith('index.html') || currentPath.endsWith('/admin') || currentPath.endsWith('/admin/');
    const isBilling = currentPath.includes('billing');
    const isProducts = currentPath.includes('products');
    const isOrders = currentPath.includes('orders');

    const nav = document.createElement('nav');
    nav.id = 'adminMobileBottomNav';
    nav.className = 'admin-mobile-bottom-nav';
    nav.setAttribute('aria-label', 'Admin mobile quick navigation');

    nav.innerHTML = `
      <a href="/admin/index.html" class="admin-bottom-nav-item ${isIndex ? 'active' : ''}">
        <span class="nav-icon">📊</span>
        <span class="nav-label">Dashboard</span>
      </a>
      <a href="/admin/billing.html" class="admin-bottom-nav-item ${isBilling ? 'active' : ''}">
        <span class="nav-icon">⚡</span>
        <span class="nav-label">POS Counter</span>
      </a>
      <a href="/admin/products.html" class="admin-bottom-nav-item ${isProducts ? 'active' : ''}">
        <span class="nav-icon">🎆</span>
        <span class="nav-label">Catalog</span>
      </a>
      <a href="/admin/orders.html" class="admin-bottom-nav-item ${isOrders ? 'active' : ''}">
        <span class="nav-icon">📦</span>
        <span class="nav-label">Orders</span>
      </a>
      <button type="button" class="admin-bottom-nav-item" id="adminBottomMoreBtn" onclick="window.toggleAdminSidebar ? window.toggleAdminSidebar() : null">
        <span class="nav-icon">☰</span>
        <span class="nav-label">More</span>
      </button>
    `;

    document.body.appendChild(nav);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminMobileNavigation);
  } else {
    initAdminMobileNavigation();
  }
})();
