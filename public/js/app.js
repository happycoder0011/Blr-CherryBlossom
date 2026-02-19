// ===== Main App Orchestrator =====
const App = (() => {
  let drops = [];
  let lastDrop = null;
  let visitorId = '';

  async function init() {
    // Initialize visitor identity
    visitorId = initVisitorId();

    // Initialize modules
    BlossomMap.init();
    Petals.init();
    Gallery.init();
    Upload.init();

    // Welcome modal
    setupWelcome();

    // Share modal
    setupShare();

    // My Blossoms panel
    setupMyBlossoms();

    // Load existing drops
    await loadDrops();

    // Start ambient petals after a moment
    setTimeout(() => Petals.ambient(8), 2000);
  }

  // ===== Visitor Identity =====
  function initVisitorId() {
    let id = localStorage.getItem('blr-cherry-visitor');
    if (!id) {
      // Generate a UUID-like ID
      id = 'v-' + crypto.randomUUID();
      localStorage.setItem('blr-cherry-visitor', id);
    }
    return id;
  }

  function getVisitorId() {
    return visitorId;
  }

  function getMyDrops() {
    return drops.filter(d => d.visitorId === visitorId);
  }

  // ===== Welcome =====
  function setupWelcome() {
    const modal = document.getElementById('welcome-modal');
    const btn = document.getElementById('welcome-start');

    if (localStorage.getItem('blr-cherry-welcomed')) {
      modal.classList.add('hidden');
      return;
    }

    btn.addEventListener('click', () => {
      modal.classList.add('hidden');
      localStorage.setItem('blr-cherry-welcomed', 'true');
    });
  }

  // ===== Share =====
  function setupShare() {
    const modal = document.getElementById('share-modal');
    const closeBtn = modal.querySelector('.share-close');
    const skipBtn = document.getElementById('share-skip');
    const twitterBtn = document.getElementById('share-twitter');
    const handleInput = document.getElementById('twitter-handle');

    const saved = localStorage.getItem('blr-cherry-handle');
    if (saved) handleInput.value = saved;

    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.querySelector('.share-backdrop').addEventListener('click', () => modal.classList.add('hidden'));
    skipBtn.addEventListener('click', () => modal.classList.add('hidden'));

    twitterBtn.addEventListener('click', () => {
      const handle = handleInput.value.trim().replace(/^@/, '');
      if (handle) {
        localStorage.setItem('blr-cherry-handle', handle);
      }

      const url = getShareUrl(lastDrop, handle);
      window.open(url, '_blank', 'width=600,height=400');
      modal.classList.add('hidden');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
      }
    });
  }

  function showShareModal(drop) {
    lastDrop = drop;
    const modal = document.getElementById('share-modal');

    document.getElementById('share-location').textContent = `${drop.locationName}, Bangalore`;
    document.getElementById('share-card-loc').textContent = drop.locationName;
    document.getElementById('share-card-img').style.backgroundImage = `url(${drop.imagePath})`;

    const saved = localStorage.getItem('blr-cherry-handle');
    if (saved) document.getElementById('twitter-handle').value = saved;

    modal.classList.remove('hidden');
  }

  // ===== My Blossoms =====
  function setupMyBlossoms() {
    const btn = document.getElementById('my-blossoms-btn');
    const panel = document.getElementById('my-blossoms-panel');
    const closeBtn = panel.querySelector('.my-blossoms-close');
    const backdrop = panel.querySelector('.my-blossoms-backdrop');

    btn.addEventListener('click', () => {
      renderMyBlossoms();
      panel.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => panel.classList.add('hidden'));
    backdrop.addEventListener('click', () => panel.classList.add('hidden'));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.classList.contains('hidden')) {
        panel.classList.add('hidden');
      }
    });
  }

  function renderMyBlossoms() {
    const list = document.getElementById('my-blossoms-list');
    const emptyState = document.getElementById('my-blossoms-empty');
    const countEl = document.getElementById('my-blossoms-count');
    const myDrops = getMyDrops();

    countEl.textContent = myDrops.length;

    if (myDrops.length === 0) {
      list.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    list.innerHTML = '';

    // Show newest first
    const sorted = [...myDrops].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    sorted.forEach(drop => {
      const item = document.createElement('div');
      item.className = 'my-blossom-item';

      const date = new Date(drop.timestamp);
      const dateStr = date.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
      const timeStr = date.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit'
      });

      item.innerHTML = `
        <div class="my-blossom-thumb">
          <img src="${drop.imagePath}" alt="" loading="lazy">
        </div>
        <div class="my-blossom-info">
          <div class="my-blossom-loc">${drop.locationName}</div>
          <div class="my-blossom-date">${dateStr} at ${timeStr}</div>
        </div>
        <button class="my-blossom-locate" title="Show on map">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 12 8 12s8-6.6 8-12a8 8 0 0 0-8-8z"/></svg>
        </button>
      `;

      // Click thumbnail → open image
      item.querySelector('.my-blossom-thumb').addEventListener('click', () => {
        window.open(drop.imagePath, '_blank');
      });

      // Click locate → fly to on map
      item.querySelector('.my-blossom-locate').addEventListener('click', () => {
        document.getElementById('my-blossoms-panel').classList.add('hidden');
        const map = BlossomMap.getMap();
        map.flyTo([drop.lat, drop.lng], 16, { duration: 1.5 });
      });

      list.appendChild(item);
    });
  }

  // ===== Drops =====
  async function loadDrops() {
    try {
      const res = await fetch('/api/drops');

      if (!res.ok) {
        console.error('Failed to load drops:', res.status);
        Upload.showToast('Could not load existing blossoms. They will appear when you refresh.');
        return;
      }

      drops = await res.json();

      if (!Array.isArray(drops)) {
        console.error('Invalid drops data:', drops);
        drops = [];
        return;
      }

      drops.forEach(drop => BlossomMap.addBlossom(drop, false));
      updateCounter();
      updateMyBlossomsBadge();
    } catch (err) {
      console.error('Failed to load drops:', err);
      drops = [];
      Upload.showToast('Offline? Blossoms will load when you reconnect.');
    }
  }

  function addDrop(drop) {
    drops.push(drop);
    BlossomMap.addBlossom(drop, true);
    Petals.burst(40);
    updateCounter();
    updateMyBlossomsBadge();

    // Show share modal after animation plays
    setTimeout(() => showShareModal(drop), 1200);
  }

  function updateCounter() {
    const counter = document.getElementById('drop-count');
    counter.textContent = drops.length;
    counter.classList.add('bump');
    setTimeout(() => counter.classList.remove('bump'), 300);
  }

  function updateMyBlossomsBadge() {
    const badge = document.getElementById('my-blossoms-badge');
    const count = getMyDrops().length;
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function getDrops() {
    return drops;
  }

  function getShareUrl(drop, handle) {
    let text = `me: i should do something useful today\nalso me: *plants a pink trumpet blossom at ${drop.locationName}*\n\n`;
    if (handle) {
      text += `— @${handle}\n\n`;
    }
    text += `drop a photo, watch bangalore turn pink 🌸`;

    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(window.location.origin);
    return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  }

  document.addEventListener('DOMContentLoaded', init);

  return { getDrops, addDrop, getShareUrl, getVisitorId, getMyDrops };
})();
