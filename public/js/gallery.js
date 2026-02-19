// ===== Image Preview Module =====
const Gallery = (() => {
  let activePopup = null;

  function init() {}

  function buildPopupContent(drop) {
    return `<div class="hover-preview">
      <img src="${drop.imagePath}" alt="">
    </div>`;
  }

  function openFullImage(drop) {
    const existing = document.getElementById('lightbox-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    overlay.innerHTML = `
      <div class="lightbox-backdrop"></div>
      <div class="lightbox-body">
        <button class="lightbox-close">&times;</button>
        <img src="${drop.imagePath}" alt="">
      </div>
    `;

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
      activePopup = L.popup({
        closeButton: false,
        className: 'hover-popup',
        offset: [0, -40],
        autoPan: false,
        maxWidth: 300
      })
        .setLatLng([drop.lat, drop.lng])
        .setContent(buildPopupContent(drop))
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
      openFullImage(drop);
    });
  }

  return { init, bindMarker };
})();
