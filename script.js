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
    typeSpeed: 4,
    contentType: 'null', // plain text — nothing here needs HTML parsing
    showCursor: true,
    cursorChar: '|',
  });
}

// Lightbox: one shared <dialog>, filled in from whichever trigger was clicked. 
// showModal() handles focus trapping, Escape-to-close, and returning focus to the trigger on close,
// no manual work needed for any of that.
// A trigger either wraps an <img> (the diagrams), or points at another
// element on the page via [data-lightbox-target] (the results table); 
// in that case the real element gets cloned in as-is, semantics and all,
// rather than being redrawn as an image.
function setUpLightbox() {
  const dialog = document.getElementById('lightbox');
  if (!dialog) return;

  const content = document.getElementById('lightbox-content');
  const captionEl = document.getElementById('lightbox-caption');
  const closeBtn = dialog.querySelector('.lightbox-close');

  document.querySelectorAll('.lightbox-trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      content.innerHTML = '';
      let caption = '';

      const targetId = trigger.dataset.lightboxTarget;
      if (targetId) {
        const source = document.getElementById(targetId);
        if (!source) return;
        content.appendChild(source.cloneNode(true));
        caption = source.querySelector('caption')?.textContent || '';
      } else {
        const img = trigger.querySelector('img');
        if (!img) return;
        const clone = document.createElement('img');
        clone.src = img.src;
        clone.alt = img.alt;
        content.appendChild(clone);
        caption = trigger.closest('figure')?.querySelector('figcaption')?.textContent || '';
      }

      captionEl.textContent = caption;
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

document.addEventListener('DOMContentLoaded', () => {
  setUpTextAssets();
  setUpLightbox();
});