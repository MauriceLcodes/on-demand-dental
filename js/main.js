// On Demand Dental — shared scripts
document.addEventListener('DOMContentLoaded', function () {

  // Fire a GA4 event if analytics is loaded; no-op otherwise.
  function trackEvent(name, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params || {});
    }
  }
  // Mobile navigation toggle
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Close menu when a link is tapped
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
    // Close menu on a click/tap anywhere outside it (and outside the toggle
    // button itself, so the same tap that opens it doesn't instantly close it)
    document.addEventListener('click', function (e) {
      if (links.classList.contains('open') && !links.contains(e.target) && !toggle.contains(e.target)) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    // Close on Escape for keyboard users
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('open')) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // Submit Netlify forms via fetch and redirect manually.
  // (Netlify's own post-deploy handling of the form's "action" attribute
  // has proven unreliable for the redirect step, so we control it here instead.)
  var netlifyForms = document.querySelectorAll('form[data-netlify-ajax]');
  netlifyForms.forEach(function (form) {
    var errorMsg = form.querySelector('.form-error');

    // Per-field valid/invalid state, purely visual — native browser
    // validation still gates actual submission.
    form.querySelectorAll('.field').forEach(function (fieldWrap) {
      var control = fieldWrap.querySelector('input,select,textarea');
      if (!control) return;
      control.addEventListener('blur', function () {
        if (!control.value && !control.required) return;
        if (control.checkValidity() && control.value) {
          fieldWrap.classList.add('is-valid');
          fieldWrap.classList.remove('is-invalid');
        } else if (control.required) {
          fieldWrap.classList.remove('is-valid');
        }
      });
      control.addEventListener('invalid', function () {
        fieldWrap.classList.add('is-invalid');
        fieldWrap.classList.remove('is-valid');
        if (errorMsg) errorMsg.classList.add('show');
      });
      control.addEventListener('input', function () {
        if (fieldWrap.classList.contains('is-invalid') && control.checkValidity()) {
          fieldWrap.classList.remove('is-invalid');
        }
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (errorMsg) errorMsg.classList.remove('show');
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('is-loading');
      }

      var data = new URLSearchParams(new FormData(form)).toString();
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: data
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Form submission failed with status ' + response.status);
          }
          trackEvent('appointment_request_submitted', { form_name: form.getAttribute('name') || '' });
          window.location.href = form.getAttribute('data-redirect') || '/thanks.html';
        })
        .catch(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('is-loading');
          }
          alert('Sorry, something went wrong submitting the form. Please call us at 818-821-5065, or try again.');
        });
    });
  });

  // Phone number click tracking
  document.querySelectorAll('a[href^="tel:"]').forEach(function (link) {
    link.addEventListener('click', function () {
      trackEvent('phone_call_click', { page: window.location.pathname });
    });
  });

  // Language toggle click tracking (EN <-> ES links)
  document.querySelectorAll('a[lang="es"], a[lang="en"]').forEach(function (link) {
    link.addEventListener('click', function () {
      trackEvent('language_toggle', {
        to_language: link.getAttribute('lang'),
        page: window.location.pathname
      });
    });
  });

  // Header goes frosted/translucent once the page has scrolled a bit
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 12) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Mouse drag-to-scroll for horizontal photo/testimonial rows.
  // overflow-x:auto only gives you native swipe on touchscreens and
  // trackpad gestures — a plain mouse click-and-drag does nothing on any
  // browser by default. This adds that, so the "swipe" rows work
  // regardless of what the visitor is using to scroll.
  document.querySelectorAll('.photo-row, .quote-row').forEach(function (row) {
    var isDown = false;
    var startX = 0;
    var startScroll = 0;
    row.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return; // native touch scrolling already handles this
      isDown = true;
      row.classList.add('dragging');
      startX = e.clientX;
      startScroll = row.scrollLeft;
    });
    window.addEventListener('pointerup', function () {
      isDown = false;
      row.classList.remove('dragging');
    });
    row.addEventListener('pointerleave', function () {
      isDown = false;
      row.classList.remove('dragging');
    });
    row.addEventListener('pointermove', function (e) {
      if (!isDown) return;
      e.preventDefault();
      row.scrollLeft = startScroll - (e.clientX - startX);
    });
  });

  // Fade out the floating Call button when it would visually overlap the
  // booking form's submit button or a phone number link (e.g. on the Book
  // page, where the fixed bottom-right button can land on top of the
  // Submit Request button or the office phone number at some scroll
  // positions). Checked on scroll/resize rather than a fixed page-specific
  // rule, since the overlap depends on actual layout, not just which page.
  var fab = document.querySelector('.phone-fab');
  var fabWatchTargets = document.querySelectorAll('.btn-full, a[href^="tel:"]:not(.phone-fab), .field-caution, .form-note');
  if (fab && fabWatchTargets.length) {
    var checkFabOverlap = function () {
      var f = fab.getBoundingClientRect();
      var overlapping = Array.prototype.some.call(fabWatchTargets, function (t) {
        var r = t.getBoundingClientRect();
        return !(r.right < f.left || r.left > f.right || r.bottom < f.top || r.top > f.bottom);
      });
      fab.classList.toggle('phone-fab-hidden', overlapping);
    };
    checkFabOverlap();
    window.addEventListener('scroll', checkFabOverlap, { passive: true });
    window.addEventListener('resize', checkFabOverlap);
  }

  // Fade-and-rise entrance for sections as they scroll into view
  // (skips the first section on each page — the hero — since that's
  // already visible on load).
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Sections excluded via .no-reveal are long list-style pages (services
    // & pricing, blog index) where the whole page content sits in one tall
    // .container. The reveal effect needs 15% of that container visible to
    // trigger, which on a container several screens tall meant the page
    // stayed blank until scrolling most of the way down it. Short sections
    // don't have this problem, so the opt-out is scoped to just these pages.
    var revealTargets = document.querySelectorAll('main section:not(:first-of-type):not(.no-reveal) > .container');
    if (revealTargets.length) {
      revealTargets.forEach(function (el) { el.classList.add('reveal'); });
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      revealTargets.forEach(function (el) { io.observe(el); });
    }
  }
});
