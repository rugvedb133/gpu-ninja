// Matrix Multiplication on Multiple GPUs — site script

// Elements with [data-asset="path/to/file.txt"] get their text content fetched at runtime, 
// keeping long raw-text blocks (ASCII art, terminal output) out of the shared HTML markup and as separate files.
async function loadTextAssets() {
  const targets = document.querySelectorAll('[data-asset]');
  for (const el of targets) {
    try {
      const res = await fetch(el.dataset.asset);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      el.textContent = (await res.text()).replace(/\n$/, '');
    } catch (err) {
      console.error('Failed to load text asset:', el.dataset.asset, err);
    }
  }
}

document.addEventListener('DOMContentLoaded', loadTextAssets);