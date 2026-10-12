/**
 * Dhanalakshmi Crackers - Homepage Banner Slider
 * Smooth transitions, auto-play, touch swipe, keyboard support, responsive
 */

(function () {
  'use strict';

  function initBannerSlider() {
    const slider = document.getElementById('homeBannerSlider');
    const track = document.getElementById('sliderTrack');
    const prevBtn = document.getElementById('sliderPrevBtn');
    const nextBtn = document.getElementById('sliderNextBtn');
    const indicatorContainer = document.getElementById('sliderIndicators');

    if (!slider || !track) return;

    const slides = track.querySelectorAll('.slider-slide');
    if (slides.length <= 1) return;

    const dots = indicatorContainer ? indicatorContainer.querySelectorAll('.slider-dot') : [];
    let currentIndex = 0;
    const totalSlides = slides.length;
    let autoplayTimer = null;
    const AUTOPLAY_INTERVAL = 4500; // 4.5 seconds

    function goToSlide(index) {
      if (index < 0) {
        currentIndex = totalSlides - 1;
      } else if (index >= totalSlides) {
        currentIndex = 0;
      } else {
        currentIndex = index;
      }

      // Update track position
      track.style.transform = `translateX(-${currentIndex * 100}%)`;

      // Update indicator dots
      dots.forEach((dot, i) => {
        if (i === currentIndex) {
          dot.classList.add('active');
          dot.setAttribute('aria-current', 'true');
        } else {
          dot.classList.remove('active');
          dot.removeAttribute('aria-current');
        }
      });
    }

    function nextSlide() {
      goToSlide(currentIndex + 1);
    }

    function prevSlide() {
      goToSlide(currentIndex - 1);
    }

    function startAutoplay() {
      stopAutoplay();
      autoplayTimer = setInterval(nextSlide, AUTOPLAY_INTERVAL);
    }

    function stopAutoplay() {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    // Event Listeners for Arrow Buttons
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        nextSlide();
        startAutoplay();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        prevSlide();
        startAutoplay();
      });
    }

    // Event Listeners for Dots
    dots.forEach((dot) => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        const targetIndex = parseInt(dot.getAttribute('data-index'), 10);
        if (!isNaN(targetIndex)) {
          goToSlide(targetIndex);
          startAutoplay();
        }
      });
    });

    // Pause Autoplay on Hover & Focus
    slider.addEventListener('mouseenter', stopAutoplay);
    slider.addEventListener('mouseleave', startAutoplay);
    slider.addEventListener('focusin', stopAutoplay);
    slider.addEventListener('focusout', startAutoplay);

    // Keyboard Arrow Navigation
    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        prevSlide();
        startAutoplay();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
        startAutoplay();
      }
    });

    // Touch Swipe Gestures
    let touchStartX = 0;
    let touchEndX = 0;
    let isSwiping = false;

    slider.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        isSwiping = true;
        stopAutoplay();
      }
    }, { passive: true });

    slider.addEventListener('touchmove', (e) => {
      if (isSwiping && e.touches && e.touches.length === 1) {
        touchEndX = e.touches[0].clientX;
      }
    }, { passive: true });

    slider.addEventListener('touchend', () => {
      if (!isSwiping) return;
      isSwiping = false;
      const swipeDistance = touchEndX - touchStartX;
      const minSwipeDistance = 45; // pixels

      if (Math.abs(swipeDistance) > minSwipeDistance) {
        if (swipeDistance > 0) {
          prevSlide(); // Swipe Right -> Go to Prev
        } else {
          nextSlide(); // Swipe Left -> Go to Next
        }
      }
      startAutoplay();
      touchStartX = 0;
      touchEndX = 0;
    });

    // Initial setup
    goToSlide(0);
    startAutoplay();
  }

  // Initialize on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBannerSlider);
  } else {
    initBannerSlider();
  }
})();
