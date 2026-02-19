// ===== Image Preview Module =====
const Gallery = (() => {
  let activePopup = null;

  function init() {}

  function getNearbyDrops(lat, lng) {
    const threshold = 0.002;
    return App.getDrops().filter(d =>
      Math.abs(d.lat - lat) < threshold && Math.abs(d.lng - lng) < threshold
    );
  }

  function buildPopupContent(drops) {
    if (drops.length === 1) {
      return `<div class="hover-preview">
        <img src="${drops[0].imagePath}" alt="">
      </div>`;
    }

    const shown = drops.slice(0, 6);
    const extra = drops.length - shown.length;
    let html = `<div class="hover-preview hover-preview-multi">`;
    shown.forEach(d => {
      html += `<img src="${d.imagePath}" alt="">`;
    });
    if (extra > 0) {
      html += `<div class="hover-preview-more">+${extra}</div>`;
    }
    html += `</div>`;
    return html;
  }

  function openFullImage(drops) {
    // Remove existing lightbox if any
    const existing = document.getElementById('lightbox-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';

    if (drops.length === 1) {
      overlay.innerHTML = `
        <div class="lightbox-backdrop"></div>
        <div class="lightbox-body">
          <button class="lightbox-close">&times;</button>
          <img src="${drops[0].imagePath}" alt="">
        </div>
      `;
    } else {
      let imgs = drops.map(d => `<img src="${d.imagePath}" alt="">`).join('');
      overlay.innerHTML = `
        <div class="lightbox-backdrop"></div>
        <div class="lightbox-body lightbox-grid">
          <button class="lightbox-close">&times;</button>
          ${imgs}
        </div>
      `;
    }

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('.lightbox-backdrop').addEventListener('click', close);
    overlay.querySelector('.lightbox-close').addEventListener('click', close);

    const onKey = (e) => {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    };
    document.addEventListener('keydown', onKey);
  }

  function bindMarker(marker, drop) {
    // Hover: show square thumbnail popup
    marker.on('mouseover', () => {
      const nearby = getNearbyDrops(drop.lat, drop.lng);
      if (nearby.length === 0) return;

      activePopup = L.popup({
        closeButton: false,
        className: 'hover-popup',
        offset: [0, -40],
        autoPan: false,
        maxWidth: 300
      })
        .setLatLng([drop.lat, drop.lng])
        .setContent(buildPopupContent(nearby))
        .openOn(BlossomMap.getMap());
    });

    marker.on('mouseout', () => {
      if (activePopup) {
        BlossomMap.getMap().closePopup(activePopup);
        activePopup = null;
      }
    });

    // Click: open full image
    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (activePopup) {
        BlossomMap.getMap().closePopup(activePopup);
        activePopup = null;
      }
      const nearby = getNearbyDrops(drop.lat, drop.lng);
      if (nearby.length > 0) openFullImage(nearby);
    });
  }

  return { init, bindMarker };
})();
