/**
 * Dhanalakshmi Crackers - Mobile Navigation & UX Handler
 * Controls mobile hamburger drawer, backdrop, bottom navigation, and mobile touch UX
 */

(function () {
  'use strict';

  function initMobileNav() {
    const toggleBtn = document.getElementById('mobileNavToggle');
    const drawer = document.getElementById('mobileNavDrawer');
    const backdrop = document.getElementById('mobileNavBackdrop');
    const closeBtn = document.getElementById('drawerCloseBtn');

    if (!toggleBtn || !drawer || !backdrop) return;

    function openDrawer() {
      drawer.classList.add('open');
      backdrop.classList.add('open');
      document.body.classList.add('mobile-nav-locked');
      toggleBtn.classList.add('is-active');
      toggleBtn.setAttribute('aria-expanded', 'true');
    }

    function closeDrawer() {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      document.body.classList.remove('mobile-nav-locked');
      toggleBtn.classList.remove('is-active');
      toggleBtn.setAttribute('aria-expanded', 'false');
    }

    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (drawer.classList.contains('open')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeDrawer();
      });
    }

    backdrop.addEventListener('click', closeDrawer);

    // Close when clicking any nav link
    const drawerLinks = drawer.querySelectorAll('.drawer-link');
    drawerLinks.forEach((link) => {
      link.addEventListener('click', () => {
        closeDrawer();
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        closeDrawer();
      }
    });

    // Active bottom navigation indicator
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const cleanCurrent = currentPath.replace('.html', '');
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach((item) => {
      const href = item.getAttribute('href');
      if (href) {
        const itemPath = href.split('?')[0].split('#')[0];
        const cleanItem = itemPath.replace('.html', '');
        if (
          itemPath === currentPath ||
          cleanItem === cleanCurrent ||
          (cleanCurrent === '' && cleanItem === 'index') ||
          (cleanCurrent === 'index' && cleanItem === 'index')
        ) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNav);
  } else {
    initMobileNav();
  }
})();
