// Matrix Multiplication on Multiple GPUs — site script

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Elements with [data-asset="path/to/file.txt"] get their text content fetched at runtime, 
// keeping long raw-text blocks (ASCII art, terminal output) out of the shared HTML markup and as separate files.
// If motion's fine and Typed.js loaded, the text types into view the first time its block scrolls into the viewport. 
// If reduced motion is set, or Typed.js didn't load for any reason,
// the text just appears, without any animation or waiting on scroll position.
async function setUpTextAssets() {
  const targets = document.querySelectorAll('[data-asset]');
  const canAnimate = !prefersReducedMotion && typeof Typed !== 'undefined';

  const observer = canAnimate
    ? new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          obs.unobserve(entry.target);
          typeInto(entry.target, entry.target.dataset.fullText || '');
        });
      }, { threshold: 0.2 })
    : null;

  for (const el of targets) {
    try {
      const res = await fetch(el.dataset.asset);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const text = (await res.text()).replace(/\n$/, '');

      if (canAnimate) {
        el.dataset.fullText = text;
        el.textContent = ''; // wait for it to scroll into view before typing
        observer.observe(el);
      } else {
        el.textContent = text;
      }
    } catch (err) {
      console.error('Failed to load text asset:', el.dataset.asset, err);
      el.textContent = '[failed to load]';
    }
  }
}

function typeInto(el, text) {
  // Typed.js runs .trim() on the whole string internally, which eats leading/trailing whitespace,
  // including the leading spaces the Bender banner relies on for alignment on its first line. 
  // A zero-width space isn't whitespace as far as `.trim()` is concerned, 
  // so it blocks the trim at each edge without being visible.
  const guarded = '\u200B' + text + '\u200B';
  new Typed(el, {
    strings: [guarded],
    typeSpeed: 1,
    contentType: 'html', // plain text — nothing here needs HTML parsing
    showCursor: true,
    cursorChar: '|',
  });
}

// Lightbox: one shared <dialog>, filled in by cloning whatever element its trigger points at
// (via [data-lightbox-target]): an image, a table, or a terminal block.
// Same code path regardless of content type.
// showModal() handles focus trapping, Escape-to-close, and returning focus on close,
// without any additional commands.
function setUpLightbox() {
  const dialog = document.getElementById('lightbox');
  if (!dialog) return;

  const content = document.getElementById('lightbox-content');
  const captionEl = document.getElementById('lightbox-caption');
  const closeBtn = dialog.querySelector('.lightbox-close');

  document.querySelectorAll('[data-lightbox-target]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const source = document.getElementById(trigger.dataset.lightboxTarget);
      if (!source) return;

      const clone = source.cloneNode(true);

      // Terminal blocks type their content in over time (and only once scrolled into view);
      // Clone should show the full text regardless of how much has actually been typed on the live page so far.
      if (source.dataset.fullText) {
        clone.textContent = source.dataset.fullText;
      }

      // Decorative content (the Bender banner) stays decorative when enlarged too;
      // carrying that down from the source's own ancestry.
      if (source.closest('[aria-hidden="true"]')) {
        clone.setAttribute('aria-hidden', 'true');
      }

      content.innerHTML = '';
      content.appendChild(clone);

      // Caption lives inside the source itself (a table's <caption>) 
      // or beside it (a figure's <figcaption>) depending on content type;
      // the only spot left with a type-specific check.
      const tableCaption = clone.querySelector?.('caption');
      const figcaption = trigger.closest('figure')?.querySelector('figcaption');
      captionEl.textContent = (tableCaption || figcaption)?.textContent || '';

      dialog.showModal();
    });
  });

  closeBtn.addEventListener('click', () => dialog.close());

  // A click that lands on the dialog element itself (not a descendant) means it landed on the backdrop area;
  // close on that, same as clicking outside a lightbox normally would.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}

// Prefer native MathML (<math> renders directly, no library needed);
// only reach for a CDN fallback if the browser can't actually lay it out.
// The standard feature-detection trick: an <mspace> with an explicit height
// only renders at that height if MathML is genuinely supported;
// browsers that don't understand it fall back to unstyled inline HTML, 
// and the element measures very differently.
function supportsMathML() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;';
  probe.innerHTML = '<math><mspace height="23px" width="77px"></mspace></math>';
  document.body.appendChild(probe);
  const box = probe.firstChild.firstChild.getBoundingClientRect();
  probe.remove();
  return Math.abs(box.height - 23) <= 1;
}

function setUpMath() {
  if (!document.querySelector('math')) return;
  if (supportsMathML()) return; // browser supports MathML, no extra requirements

  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/mml-chtml.js';
  document.head.appendChild(script);
}

// Thin progress bar reflecting how far down the page the visitor's scrolled. 
// Not gated behind reduced-motion since it's a functional position indicator, not decorative animation, 
// and the width change is a plain CSS transition already neutralized by the reduced-motion rule in styles.css.
function setUpScrollProgress() {
  const bar = document.getElementById('scroll-progress-bar');
  if (!bar) return;

  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    bar.style.width = `${pct}%`;
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}

// Highlights whichever section is currently under the sticky nav with aria-current="location"
// ("location" being the token ARIA defines specifically for "where you are" within a set of navigation links,
// rather than "page" (a different page) or a plain "true").
function setUpSectionNav() {
  const navLinks = document.querySelectorAll('.site-nav-inner a[href^="#"]');
  const sections = document.querySelectorAll('main > section[id]');
  if (!navLinks.length || !sections.length) return;

  const linkByTarget = new Map();
  navLinks.forEach((a) => {
    const id = a.getAttribute('href').slice(1);
    if (id) linkByTarget.set(id, a);
  });

  const navHeight = document.getElementById('site-nav')?.offsetHeight || 0;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const link = linkByTarget.get(entry.target.id);
        if (!link) return;
        navLinks.forEach((a) => a.removeAttribute('aria-current'));
        link.setAttribute('aria-current', 'location');
      });
    },
    { rootMargin: `-${navHeight + 8}px 0px -70% 0px`, threshold: 0 }
  );

  sections.forEach((section) => observer.observe(section));
}

document.addEventListener('DOMContentLoaded', () => {
  setUpTextAssets();
  setUpLightbox();
  setUpMath();
  setUpScrollProgress();
  setUpSectionNav();
});