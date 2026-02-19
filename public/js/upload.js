// ===== Upload & Drag-Drop Module =====
const Upload = (() => {
  let dropOverlay, loading, loadingText, fileInput;

  // Timeout durations
  const UPLOAD_TIMEOUT = 30000;   // 30s for image upload
  const LOCATE_TIMEOUT = 40000;   // 40s (Claude + geocode)
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
      // Try EXIF GPS first
      let location = await extractEXIF(file);
      let alreadyUploaded = false;

      if (!location) {
        showLoading(true, 'Asking AI for location...');
        location = await askClaudeForLocation(file);
        if (location) alreadyUploaded = true;
      }

      if (!location) {
        showToast('Could not determine location. Please try a different photo.');
        return;
      }

      showLoading(true, 'Planting blossom...');
      const drop = await saveDrop(file, location, alreadyUploaded);

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
      // EXIF parsing failed — not a problem, we'll try Claude
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

  async function askClaudeForLocation(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetchWithTimeout(
        '/api/locate',
        { method: 'POST', body: formData },
        LOCATE_TIMEOUT
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Locate API error:', res.status, errData);
        if (res.status === 413) {
          showToast('Image too large for AI analysis. Please use a smaller photo.');
        } else if (res.status === 503) {
          showToast('AI service temporarily busy. Trying with a random Bangalore location...');
        }
        // For 503/5xx, the server still returns a fallback location
        if (errData.lat) {
          return {
            lat: errData.lat,
            lng: errData.lng,
            locationName: errData.locationName || 'Bangalore',
            imagePath: errData.imagePath
          };
        }
        return null;
      }

      const data = await res.json();

      // Show appropriate toast if Claude had issues
      if (data._claudeError === 'timeout') {
        showToast('AI took too long — placed near Bangalore center.');
      } else if (data._claudeError === 'rate_limited') {
        showToast('AI is busy — placed at an approximate location.');
      }

      if (data.lat && data.lng) {
        return {
          lat: data.lat,
          lng: data.lng,
          locationName: data.locationName || 'Bangalore',
          imagePath: data.imagePath
        };
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        showToast('Location detection timed out. Please try again.');
      } else {
        console.error('Locate API network error:', err);
        showToast('Network error — please check your connection.');
      }
    }
    return null;
  }

  async function saveDrop(file, location, alreadyUploaded) {
    const formData = new FormData();
    formData.append('lat', location.lat);
    formData.append('lng', location.lng);
    formData.append('locationName', location.locationName);
    formData.append('twitterHandle', '');
    formData.append('visitorId', App.getVisitorId());

    if (alreadyUploaded && location.imagePath) {
      formData.append('existingImagePath', location.imagePath);
    }
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
