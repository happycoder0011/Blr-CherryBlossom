// ===== Map Module =====
const BlossomMap = (() => {
  let map;
  let clusterGroup;

  // Pre-build a single shared icon for all static markers
  const treeSVG = `
    <svg width="44" height="44" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
      <path d="M47 75 L47 110 Q50 115 53 110 L53 75" fill="#8B6B5A" stroke="#6B4F3F" stroke-width="1"/>
      <path d="M47 85 Q35 80 30 70" fill="none" stroke="#8B6B5A" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M53 82 Q65 78 68 68" fill="none" stroke="#8B6B5A" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="50" cy="30" r="22" fill="#F9A8D4" opacity="0.9"/>
      <circle cx="35" cy="42" r="16" fill="#F472B6" opacity="0.85"/>
      <circle cx="65" cy="42" r="16" fill="#F472B6" opacity="0.85"/>
      <circle cx="28" cy="55" r="13" fill="#FBCFE8" opacity="0.8"/>
      <circle cx="72" cy="55" r="13" fill="#FBCFE8" opacity="0.8"/>
      <circle cx="50" cy="18" r="14" fill="#EC4899" opacity="0.7"/>
      <circle cx="42" cy="50" r="10" fill="#FDF2F8" opacity="0.6"/>
      <circle cx="58" cy="50" r="10" fill="#FDF2F8" opacity="0.6"/>
      <circle cx="38" cy="25" r="5" fill="#FDF2F8" opacity="0.8"/>
      <circle cx="62" cy="25" r="5" fill="#FDF2F8" opacity="0.8"/>
      <circle cx="50" cy="45" r="4" fill="white" opacity="0.5"/>
      <circle cx="30" cy="65" r="6" fill="#F9A8D4" opacity="0.7"/>
      <circle cx="68" cy="63" r="6" fill="#F9A8D4" opacity="0.7"/>
    </svg>`;

  // Cache the static icon — reused for all non-animated markers
  const staticIcon = L.divIcon({
    html: `<div class="cherry-marker">${treeSVG}</div>`,
    className: '',
    iconSize: [44, 52],
    iconAnchor: [22, 52]
  });

  function init() {
    map = L.map('map', {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 80,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      disableClusteringAtZoom: 18,
      chunkedLoading: true,
      chunkInterval: 100,
      chunkDelay: 10,
      animate: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let sizeClass, size;
        if (count < 5) {
          sizeClass = 'blossom-cluster-small';
          size = 40;
        } else if (count < 50) {
          sizeClass = 'blossom-cluster-medium';
          size = 50;
        } else {
          sizeClass = 'blossom-cluster-large';
          size = 65;
        }
        return L.divIcon({
          html: `<div class="blossom-cluster ${sizeClass}">${count >= 1000 ? Math.round(count / 1000) + 'k' : count}</div>`,
          className: '',
          iconSize: L.point(size, size)
        });
      }
    });

    map.addLayer(clusterGroup);
    return map;
  }

  // Batch-add markers without animation (for initial load)
  function addBlossoms(dropsArray) {
    const markers = dropsArray.map(drop => {
      const marker = L.marker([drop.lat, drop.lng], { icon: staticIcon });
      marker.dropData = drop;
      Gallery.bindMarker(marker, drop);
      return marker;
    });
    clusterGroup.addLayers(markers);
  }

  // Add single marker with optional animation (for new uploads)
  function addBlossom(drop, animate = false) {
    let icon = staticIcon;
    if (animate) {
      icon = L.divIcon({
        html: `<div class="cherry-marker cherry-marker-new">${treeSVG}</div>`,
        className: '',
        iconSize: [44, 52],
        iconAnchor: [22, 52]
      });
    }

    const marker = L.marker([drop.lat, drop.lng], { icon });
    marker.dropData = drop;
    Gallery.bindMarker(marker, drop);
    clusterGroup.addLayer(marker);

    if (animate) {
      setTimeout(() => {
        const el = marker.getElement();
        if (el) {
          const inner = el.querySelector('.cherry-marker');
          if (inner) {
            inner.classList.remove('cherry-marker-new');
            inner.classList.add('cherry-marker-glow');
          }
        }
      }, 850);

      map.flyTo([drop.lat, drop.lng], Math.max(map.getZoom(), 14), {
        duration: 1.2
      });
    }

    return marker;
  }

  // ===== Pin Drop Mode =====
  let pinDropClickHandler = null;

  function enterPinDropMode(onSelect, onCancel) {
    document.getElementById('map').classList.add('pin-drop-mode');

    pinDropClickHandler = (e) => {
      exitPinDropMode();
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    };

    map.once('click', pinDropClickHandler);
  }

  function exitPinDropMode() {
    document.getElementById('map').classList.remove('pin-drop-mode');
    if (pinDropClickHandler) {
      map.off('click', pinDropClickHandler);
      pinDropClickHandler = null;
    }
  }

  function getMap() { return map; }
  function getClusterGroup() { return clusterGroup; }

  return { init, addBlossom, addBlossoms, getMap, getClusterGroup, enterPinDropMode, exitPinDropMode };
})();
