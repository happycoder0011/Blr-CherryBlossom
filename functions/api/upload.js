// POST /api/upload — upload image to R2 + save drop to KV
export async function onRequestPost(context) {
  const { request, env } = context;

  let formData;
  try {
    formData = await request.formData();
  } catch (parseErr) {
    console.error('Form parse error:', parseErr);
    return Response.json(
      { error: 'Invalid request. Please try uploading again.' },
      { status: 400 }
    );
  }

  const file = formData.get('image');
  const lat = parseFloat(formData.get('lat'));
  const lng = parseFloat(formData.get('lng'));
  const locationName = formData.get('locationName') || 'Unknown';
  const twitterHandle = (formData.get('twitterHandle') || '').replace(/^@/, '').trim();
  const visitorId = formData.get('visitorId') || '';

  // Validate coordinates
  if (isNaN(lat) || isNaN(lng)) {
    return Response.json(
      { error: 'Invalid location data. Please try again.' },
      { status: 400 }
    );
  }

  let imagePath;

  if (file && file.size > 0) {
    // Validate file size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      return Response.json(
        { error: 'Image too large. Please use an image under 15MB.' },
        { status: 413 }
      );
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Upload to R2 with error handling
    try {
      const arrayBuffer = await file.arrayBuffer();
      await env.IMAGES_R2.put(filename, arrayBuffer, {
        httpMetadata: { contentType: file.type || 'image/jpeg' }
      });
      imagePath = `/uploads/${filename}`;
    } catch (r2Err) {
      console.error('R2 upload failed:', r2Err);
      return Response.json(
        { error: 'Image storage is temporarily unavailable. Please try again in a moment.' },
        { status: 503, headers: { 'Retry-After': '5' } }
      );
    }
  } else {
    return Response.json(
      { error: 'No image provided. Please select a photo to upload.' },
      { status: 400 }
    );
  }

  const drop = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    lat,
    lng,
    locationName,
    twitterHandle,
    visitorId,
    imagePath,
    timestamp: new Date().toISOString()
  };

  // Save to KV with retry
  try {
    await kvPutWithRetry(env, drop);
  } catch (kvErr) {
    console.error('KV write failed after retries:', kvErr);
    // Drop was not saved but image was uploaded — still return the drop
    // so the user sees it in their session (it just won't persist)
    drop._unsaved = true;
    return Response.json(drop, { status: 207 }); // 207 Multi-Status: partial success
  }

  return Response.json(drop);
}

async function kvPutWithRetry(env, drop, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const existing = (await env.DROPS_KV.get('drops', 'json')) || [];
      existing.push(drop);
      await env.DROPS_KV.put('drops', JSON.stringify(existing));
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      // Brief pause before retry
      await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
    }
  }
}
