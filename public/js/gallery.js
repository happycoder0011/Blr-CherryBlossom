// ===== Photo Gallery Module =====
const Gallery = (() => {
  let overlay, grid, title;

  function init() {
    overlay = document.getElementById('gallery-overlay');
    grid = document.getElementById('gallery-grid');
    title = document.getElementById('gallery-title');

    // Close on backdrop click
    overlay.querySelector('.gallery-backdrop').addEventListener('click', hide);
    overlay.querySelector('.gallery-close').addEventListener('click', hide);

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hide();
    });
  }

  function show(lat, lng) {
    // Find all drops near this location
    const threshold = 0.002; // ~200m radius
    const nearby = App.getDrops().filter(d =>
      Math.abs(d.lat - lat) < threshold && Math.abs(d.lng - lng) < threshold
    );

    if (nearby.length === 0) return;

    const locationName = nearby[0].locationName || 'this spot';
    title.textContent = `${nearby.length} photo${nearby.length > 1 ? 's' : ''} from ${locationName}`;

    grid.innerHTML = '';
    nearby.forEach(drop => {
      const item = document.createElement('div');
      item.className = 'gallery-item';

      const date = new Date(drop.timestamp);
      const dateStr = date.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      });

      const handleHtml = drop.twitterHandle
        ? `<div class="gallery-item-handle">@${drop.twitterHandle}</div>`
        : '';

      item.innerHTML = `
        <img src="${drop.imagePath}" alt="Photo from ${drop.locationName}" loading="lazy">
        <div class="gallery-item-overlay">
          ${handleHtml}
          <div class="gallery-item-date">${dateStr}</div>
        </div>
      `;

      item.addEventListener('click', () => {
        window.open(drop.imagePath, '_blank');
      });

      grid.appendChild(item);
    });

    overlay.classList.remove('hidden');
  }

  function hide() {
    overlay.classList.add('hidden');
  }

  return { init, show, hide };
})();
