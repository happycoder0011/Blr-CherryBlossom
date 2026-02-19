// ===== Main App Orchestrator =====
const App = (() => {
  let drops = [];
  let lastDrop = null;

  async function init() {
    // Initialize modules
    BlossomMap.init();
    Petals.init();
    Gallery.init();
    Upload.init();

    // Welcome modal
    setupWelcome();

    // Share modal
    setupShare();

    // Load existing drops
    await loadDrops();

    // Start ambient petals after a moment
    setTimeout(() => Petals.ambient(8), 2000);
  }

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

  function setupShare() {
    const modal = document.getElementById('share-modal');
    const closeBtn = modal.querySelector('.share-close');
    const skipBtn = document.getElementById('share-skip');
    const twitterBtn = document.getElementById('share-twitter');
    const handleInput = document.getElementById('twitter-handle');

    // Restore saved handle
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

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
      }
    });
  }

  function showShareModal(drop) {
    lastDrop = drop;
    const modal = document.getElementById('share-modal');

    // Update card preview
    document.getElementById('share-location').textContent = `${drop.locationName}, Bangalore`;
    document.getElementById('share-card-loc').textContent = drop.locationName;
    document.getElementById('share-card-img').style.backgroundImage = `url(${drop.imagePath})`;

    // Restore handle
    const saved = localStorage.getItem('blr-cherry-handle');
    if (saved) document.getElementById('twitter-handle').value = saved;

    modal.classList.remove('hidden');
  }

  async function loadDrops() {
    try {
      const res = await fetch('/api/drops');
      drops = await res.json();
      drops.forEach(drop => BlossomMap.addBlossom(drop, false));
      updateCounter();
    } catch (err) {
      console.error('Failed to load drops:', err);
    }
  }

  function addDrop(drop) {
    drops.push(drop);
    BlossomMap.addBlossom(drop, true);
    Petals.burst(40);
    updateCounter();

    // Show share modal after a short delay (let the animation play)
    setTimeout(() => showShareModal(drop), 1200);
  }

  function updateCounter() {
    const counter = document.getElementById('drop-count');
    counter.textContent = drops.length;
    counter.classList.add('bump');
    setTimeout(() => counter.classList.remove('bump'), 300);
  }

  function getDrops() {
    return drops;
  }

  function getShareUrl(drop, handle) {
    let text = `I just planted a cherry blossom at ${drop.locationName}, Bangalore! 🌸🌳\n\n`;
    if (handle) {
      text += `Planted by @${handle}\n\n`;
    }
    text += `Drop your photo and bloom the city →`;

    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(window.location.origin);
    return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  }

  document.addEventListener('DOMContentLoaded', init);

  return { getDrops, addDrop, getShareUrl };
})();
