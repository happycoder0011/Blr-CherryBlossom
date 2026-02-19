// POST /api/locate — use Claude Vision to guess Bangalore location from image
// Timeout constants
const CLAUDE_TIMEOUT_MS = 25000;  // 25s (Workers have 30s limit)
const GEOCODE_TIMEOUT_MS = 8000;  // 8s

export async function onRequestPost(context) {
  const { request, env } = context;

  let formData;
  try {
    formData = await request.formData();
  } catch (parseErr) {
    console.error('Form parse error:', parseErr);
    return Response.json(
      { error: 'Invalid request format.' },
      { status: 400 }
    );
  }

  const file = formData.get('image');
  if (!file || file.size === 0) {
    return Response.json(
      { error: 'No image uploaded.' },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > 15 * 1024 * 1024) {
    return Response.json(
      { error: 'Image too large. Please use an image under 15MB.' },
      { status: 413 }
    );
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  let arrayBuffer;

  // Store in R2
  try {
    arrayBuffer = await file.arrayBuffer();
    await env.IMAGES_R2.put(filename, arrayBuffer, {
      httpMetadata: { contentType: file.type || 'image/jpeg' }
    });
  } catch (r2Err) {
    console.error('R2 upload failed:', r2Err);
    return Response.json(
      { error: 'Image storage temporarily unavailable. Please try again.' },
      { status: 503, headers: { 'Retry-After': '5' } }
    );
  }

  // Convert to base64 for Claude
  const base64Image = arrayBufferToBase64(arrayBuffer);
  const mediaType = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : `image/${ext}`;

  // Call Claude Vision API with timeout
  let area = 'Bangalore';
  let confidence = 'none';
  let claudeError = null;

  if (!env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not configured — skipping Claude Vision');
    claudeError = 'api_key_missing';
  } else {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64Image }
              },
              {
                type: 'text',
                text: `This photo was taken somewhere in Bangalore (Bengaluru), India. Based on any visual clues (landmarks, signs, architecture, vegetation, road style, shops), identify the most likely neighborhood or area of Bangalore.

Reply in this exact JSON format only, nothing else:
{"area": "area name", "confidence": "high/medium/low"}`
              }
            ]
          }]
        })
      });

      clearTimeout(timeoutId);

      if (!claudeRes.ok) {
        const errBody = await claudeRes.text().catch(() => '');
        console.error(`Claude API returned ${claudeRes.status}: ${errBody}`);
        claudeError = `status_${claudeRes.status}`;

        // Rate limited — still continue with fallback
        if (claudeRes.status === 429) {
          claudeError = 'rate_limited';
        }
      } else {
        const claudeData = await claudeRes.json();
        const responseText = claudeData.content?.[0]?.text?.trim() || '';

        try {
          const parsed = JSON.parse(responseText);
          area = parsed.area || 'Bangalore';
          confidence = parsed.confidence || 'low';
        } catch {
          // Claude responded but not in JSON — extract what we can
          const cleaned = responseText.replace(/["{}\n]/g, '').trim();
          area = cleaned || 'Bangalore';
          confidence = 'low';
        }
      }
    } catch (claudeErr) {
      if (claudeErr.name === 'AbortError') {
        console.error('Claude API timed out after', CLAUDE_TIMEOUT_MS, 'ms');
        claudeError = 'timeout';
      } else {
        console.error('Claude API network error:', claudeErr.message);
        claudeError = 'network';
      }
    }
  }

  // Geocode the area name with timeout
  let lat = 12.9716;
  let lng = 77.5946;

  if (area !== 'Bangalore') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

      const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(area + ', Bangalore, India')}&format=json&limit=1`;
      const geocodeRes = await fetch(geocodeUrl, {
        headers: { 'User-Agent': 'BLRCherryBlossom/1.0' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (geocodeRes.ok) {
        const geocodeData = await geocodeRes.json();
        if (geocodeData.length > 0) {
          lat = parseFloat(geocodeData[0].lat);
          lng = parseFloat(geocodeData[0].lon);
        } else {
          addRandomOffset();
        }
      } else {
        console.error('Geocode returned status:', geocodeRes.status);
        addRandomOffset();
      }
    } catch (geoErr) {
      const reason = geoErr.name === 'AbortError' ? 'timeout' : geoErr.message;
      console.error('Geocode failed:', reason);
      addRandomOffset();
    }
  } else {
    addRandomOffset();
  }

  function addRandomOffset() {
    lat += (Math.random() - 0.5) * 0.05;
    lng += (Math.random() - 0.5) * 0.05;
  }

  return Response.json({
    lat,
    lng,
    locationName: area,
    confidence,
    imagePath: `/uploads/${filename}`,
    // Let the frontend know if Claude had issues
    _claudeStatus: claudeError ? 'fallback' : 'ok',
    ...(claudeError && { _claudeError: claudeError })
  });
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
