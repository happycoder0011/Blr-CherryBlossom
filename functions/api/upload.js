// POST /api/upload — upload image to R2 + save drop to KV
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get('image');
    const lat = parseFloat(formData.get('lat'));
    const lng = parseFloat(formData.get('lng'));
    const locationName = formData.get('locationName') || 'Unknown';
    const twitterHandle = (formData.get('twitterHandle') || '').replace(/^@/, '').trim();
    const existingImagePath = formData.get('existingImagePath');

    let imagePath;

    if (existingImagePath) {
      // Image already uploaded to R2 by /api/locate — reuse the path
      imagePath = existingImagePath;
    } else if (file) {
      // Upload new image to R2
      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();

      await env.IMAGES_R2.put(filename, arrayBuffer, {
        httpMetadata: { contentType: file.type || 'image/jpeg' }
      });

      imagePath = `/uploads/${filename}`;
    } else {
      return Response.json({ error: 'No image provided' }, { status: 400 });
    }

    // Build drop record
    const drop = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      lat,
      lng,
      locationName,
      twitterHandle,
      imagePath,
      timestamp: new Date().toISOString()
    };

    // Read existing drops, append, write back
    const existing = (await env.DROPS_KV.get('drops', 'json')) || [];
    existing.push(drop);
    await env.DROPS_KV.put('drops', JSON.stringify(existing));

    return Response.json(drop);
  } catch (err) {
    console.error('Upload error:', err);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}
