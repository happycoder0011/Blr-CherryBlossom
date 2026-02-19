// ===== Upload & Drag-Drop Module =====
const Upload = (() => {
  let dropOverlay, loading, fileInput;

  function init() {
    dropOverlay = document.getElementById('drop-overlay');
    loading = document.getElementById('loading');
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
      if (files.length > 0) {
        processFiles(files);
      }
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
    showLoading(true);

    try {
      // Try EXIF GPS first
      let location = await extractEXIF(file);
      let alreadyUploaded = false;

      if (!location) {
        // Fallback: ask Claude Vision (this also uploads the image to R2)
        location = await askClaudeForLocation(file);
        if (location) alreadyUploaded = true;
      }

      if (location) {
        // Upload image + save drop (or just save if already uploaded via /api/locate)
        const drop = await saveDrop(file, location, alreadyUploaded);
        if (drop) {
          App.addDrop(drop);
          showToast(`Blossom planted at ${drop.locationName}!`);
        }
      }
    } catch (err) {
      console.error('Error processing file:', err);
      showToast('Oops! Could not process this image.');
    } finally {
      showLoading(false);
    }
  }

  async function extractEXIF(file) {
    try {
      const gps = await exifr.gps(file);
      if (gps && gps.latitude && gps.longitude) {
        const name = await reverseGeocode(gps.latitude, gps.longitude);
        return {
          lat: gps.latitude,
          lng: gps.longitude,
          locationName: name
        };
      }
    } catch (err) {
      console.log('No EXIF GPS data found');
    }
    return null;
  }

  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`,
        { headers: { 'User-Agent': 'BLRCherryBlossom/1.0' } }
      );
      const data = await res.json();
      const addr = data.address;
      return addr.suburb || addr.neighbourhood || addr.city_district || addr.city || 'Bangalore';
    } catch {
      return 'Bangalore';
    }
  }

  async function askClaudeForLocation(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/locate', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.lat && data.lng) {
        return {
          lat: data.lat,
          lng: data.lng,
          locationName: data.locationName || 'Bangalore',
          imagePath: data.imagePath // Image already in R2
        };
      }
    } catch (err) {
      console.error('Claude location API error:', err);
    }
    return null;
  }

  async function saveDrop(file, location, alreadyUploaded) {
    const formData = new FormData();
    formData.append('lat', location.lat);
    formData.append('lng', location.lng);
    formData.append('locationName', location.locationName);
    formData.append('twitterHandle', '');

    if (alreadyUploaded && location.imagePath) {
      // Image already in R2 from /api/locate — just pass the path
      formData.append('existingImagePath', location.imagePath);
    }

    // Always send the image file — /api/upload needs it for EXIF-path drops
    // For AI-path, it's already in R2 but we send it again for simplicity
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      return await res.json();
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    }
  }

  function showLoading(show) {
    loading.classList.toggle('hidden', !show);
  }

  function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  return { init, showToast };
})();
