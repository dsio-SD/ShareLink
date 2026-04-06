// ShareLink — app.js
// Global JS: nav scroll effect, shared utilities

// --- Nav: add 'scrolled' class on scroll ---
const nav = document.querySelector('.nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// --- Animate elements into view on scroll ---
const observerOptions = {
  threshold: 0.12,
  rootMargin: '0px 0px -40px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.step, .cat-card, .impact').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

document.addEventListener('DOMContentLoaded', () => {
  // stagger cat cards
  document.querySelectorAll('.cat-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 60}ms`;
  });
});

// "visible" class triggers the animation
document.head.insertAdjacentHTML('beforeend', `
  <style>
    .step.visible, .cat-card.visible, .impact.visible {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
  </style>
`);

// --- PWA: Register Service Worker ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('ShareLink: Service worker registered.'))
      .catch((err) => console.log('ShareLink: SW registration failed:', err));
  });
}

// --- PWA: Install prompt (shows "Add to Home Screen" banner) ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Show install banner if it exists on the page
  const installBanner = document.getElementById('install-banner');
  if (installBanner) {
    installBanner.style.display = 'flex';
    document.getElementById('install-btn')?.addEventListener('click', () => {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        deferredPrompt = null;
        installBanner.style.display = 'none';
      });
    });
    document.getElementById('install-dismiss')?.addEventListener('click', () => {
      installBanner.style.display = 'none';
    });
  }
});