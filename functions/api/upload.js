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

  if (isNaN(lat) || isNaN(lng)) {
    return Response.json(
      { error: 'Invalid location data. Please try again.' },
      { status: 400 }
    );
  }

  let imagePath;

  if (file && file.size > 0) {
    if (file.size > 15 * 1024 * 1024) {
      return Response.json(
        { error: 'Image too large. Please use an image under 15MB.' },
        { status: 413 }
      );
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

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

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const drop = {
    id,
    lat,
    lng,
    locationName,
    twitterHandle,
    visitorId,
    imagePath,
    timestamp: new Date().toISOString()
  };

  // Store as individual key — no read-modify-write, scales to 10k+
  try {
    await kvPutWithRetry(env, id, drop);
  } catch (kvErr) {
    console.error('KV write failed after retries:', kvErr);
    drop._unsaved = true;
    return Response.json(drop, { status: 207 });
  }

  return Response.json(drop);
}

async function kvPutWithRetry(env, id, drop, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await env.DROPS_KV.put(`drop:${id}`, JSON.stringify(drop));
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
    }
  }
}
