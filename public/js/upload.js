// ===== Upload & Drag-Drop Module =====
const Upload = (() => {
  let dropOverlay, loading, loadingText, fileInput;

  // Timeout durations
  const UPLOAD_TIMEOUT = 30000;   // 30s for image upload
  const GEOCODE_TIMEOUT = 10000;  // 10s for reverse geocode

  function init() {
    dropOverlay = document.getElementById('drop-overlay');
    loading = document.getElementById('loading');
    loadingText = loading.querySelector('p');
    fileInput = document.getElementById('file-input');

    setupDragDrop();
    setupButton();
  }

  function setupDragDrop() {
    let dragCounter = 0;

    document.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      dropOverlay.classList.remove('hidden');
    });

    document.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        dropOverlay.classList.add('hidden');
      }
    });

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      dropOverlay.classList.add('hidden');

      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length === 0) {
        showToast('Please drop an image file (JPG, PNG, etc.)');
        return;
      }
      processFiles(files);
    });
  }

  function setupButton() {
    const btn = document.getElementById('upload-btn');
    btn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files);
      if (files.length > 0) {
        processFiles(files);
        fileInput.value = '';
      }
    });
  }

  async function processFiles(files) {
    for (const file of files) {
      await processFile(file);
    }
  }

  async function processFile(file) {
    // Validate file size client-side
    if (file.size > 15 * 1024 * 1024) {
      showToast('Image too large — please use a photo under 15MB.');
      return;
    }

    showLoading(true, 'Reading image...');

    try {
      // Extract GPS from EXIF data
      let location = await extractEXIF(file);

      if (!location) {
        // No GPS — enter pin-drop mode so user can pick a spot on the map
        showLoading(false);
        enterPinDropMode(file);
        return;
      }

      await uploadWithLocation(file, location);
    } catch (err) {
      console.error('Error processing file:', err);
      if (err.name === 'AbortError') {
        showToast('Request timed out. Please check your connection and try again.');
      } else {
        showToast('Something went wrong. Please try again.');
      }
    } finally {
      showLoading(false);
    }
  }

  async function uploadWithLocation(file, location) {
    showLoading(true, 'Planting blossom...');
    const drop = await saveDrop(file, location);

    if (drop && !drop.error) {
      App.addDrop(drop);
      if (drop._unsaved) {
        showToast(`Blossom planted at ${drop.locationName}! (may not persist — storage hiccup)`);
      } else {
        showToast(`Blossom planted at ${drop.locationName}!`);
      }
    } else {
      const msg = drop?.error || 'Upload failed. Please try again.';
      showToast(msg);
    }
    showLoading(false);
  }

  // ===== Pin Drop Mode =====
  let pendingFile = null;
  let pinDropEscHandler = null;

  function enterPinDropMode(file) {
    pendingFile = file;

    // Show thumbnail preview in banner
    const banner = document.getElementById('pin-drop-banner');
    const thumb = document.getElementById('pin-drop-thumb');
    thumb.src = URL.createObjectURL(file);
    banner.classList.remove('hidden');

    // Cancel button
    document.getElementById('pin-drop-cancel').onclick = cancelPinDrop;

    // Escape key to cancel
    pinDropEscHandler = (e) => {
      if (e.key === 'Escape') cancelPinDrop();
    };
    document.addEventListener('keydown', pinDropEscHandler);

    // Tell the map to listen for a click
    BlossomMap.enterPinDropMode(onPinSelected, cancelPinDrop);
  }

  async function onPinSelected(latlng) {
    cleanupPinDrop();
    const file = pendingFile;
    pendingFile = null;

    if (!file) return;

    try {
      showLoading(true, 'Looking up area...');
      const locationName = await reverseGeocode(latlng.lat, latlng.lng);
      await uploadWithLocation(file, {
        lat: latlng.lat,
        lng: latlng.lng,
        locationName
      });
    } catch (err) {
      console.error('Pin drop upload error:', err);
      showToast('Something went wrong. Please try again.');
      showLoading(false);
    }
  }

  function cancelPinDrop() {
    cleanupPinDrop();
    pendingFile = null;
    BlossomMap.exitPinDropMode();
    showToast('Upload cancelled.');
  }

  function cleanupPinDrop() {
    document.getElementById('pin-drop-banner').classList.add('hidden');
    if (pinDropEscHandler) {
      document.removeEventListener('keydown', pinDropEscHandler);
      pinDropEscHandler = null;
    }
    const thumb = document.getElementById('pin-drop-thumb');
    if (thumb.src.startsWith('blob:')) URL.revokeObjectURL(thumb.src);
  }

  async function extractEXIF(file) {
    try {
      const gps = await exifr.gps(file);
      if (gps && gps.latitude && gps.longitude) {
        showLoading(true, 'Found GPS, looking up area...');
        const name = await reverseGeocode(gps.latitude, gps.longitude);
        return {
          lat: gps.latitude,
          lng: gps.longitude,
          locationName: name
        };
      }
    } catch (err) {
      console.log('EXIF extraction skipped:', err.message || 'no GPS data');
    }
    return null;
  }

  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetchWithTimeout(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`,
        { headers: { 'User-Agent': 'BLRCherryBlossom/1.0' } },
        GEOCODE_TIMEOUT
      );
      if (!res.ok) return 'Bangalore';
      const data = await res.json();
      const addr = data.address;
      return addr.suburb || addr.neighbourhood || addr.city_district || addr.city || 'Bangalore';
    } catch (err) {
      console.warn('Reverse geocode failed:', err.message);
      return 'Bangalore';
    }
  }

  async function saveDrop(file, location) {
    const formData = new FormData();
    formData.append('lat', location.lat);
    formData.append('lng', location.lng);
    formData.append('locationName', location.locationName);
    formData.append('twitterHandle', '');
    formData.append('visitorId', App.getVisitorId());
    formData.append('image', file);

    try {
      const res = await fetchWithTimeout(
        '/api/upload',
        { method: 'POST', body: formData },
        UPLOAD_TIMEOUT
      );

      const data = await res.json();

      // 207 = partial success (image saved, KV write failed)
      if (res.status === 207) {
        data._unsaved = true;
      }

      if (!res.ok && res.status !== 207) {
        return { error: data.error || 'Upload failed. Please try again.' };
      }

      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        return { error: 'Upload timed out. Please try again on a better connection.' };
      }
      console.error('Upload error:', err);
      return { error: 'Network error — could not save your blossom.' };
    }
  }

  // Fetch with AbortController timeout
  function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timeoutId));
  }

  function showLoading(show, text) {
    loading.classList.toggle('hidden', !show);
    if (text && loadingText) {
      loadingText.textContent = text;
    }
  }

  function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  return { init, showToast };
})();
