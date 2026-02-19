// POST /api/locate — use Claude Vision to guess Bangalore location from image
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      return Response.json({ error: 'No image uploaded' }, { status: 400 });
    }

    // Store in R2 regardless (we'll need it for the drop)
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    await env.IMAGES_R2.put(filename, arrayBuffer, {
      httpMetadata: { contentType: file.type || 'image/jpeg' }
    });

    // Convert to base64 for Claude
    const base64Image = arrayBufferToBase64(arrayBuffer);
    const mediaType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;

    // Call Claude Vision API
    let area = 'Bangalore';
    let confidence = 'none';

    try {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
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

      const claudeData = await claudeRes.json();
      const responseText = claudeData.content?.[0]?.text?.trim() || '';

      try {
        const parsed = JSON.parse(responseText);
        area = parsed.area;
        confidence = parsed.confidence;
      } catch {
        area = responseText.replace(/["{}\n]/g, '').trim() || 'Bangalore';
        confidence = 'low';
      }
    } catch (claudeErr) {
      console.error('Claude API error:', claudeErr);
    }

    // Geocode the area name using Nominatim
    let lat = 12.9716;
    let lng = 77.5946;

    try {
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(area + ', Bangalore, India')}&format=json&limit=1`;
      const geocodeRes = await fetch(geocodeUrl, {
        headers: { 'User-Agent': 'BLRCherryBlossom/1.0' }
      });
      const geocodeData = await geocodeRes.json();

      if (geocodeData.length > 0) {
        lat = parseFloat(geocodeData[0].lat);
        lng = parseFloat(geocodeData[0].lon);
      } else {
        // Random offset near city center
        lat += (Math.random() - 0.5) * 0.05;
        lng += (Math.random() - 0.5) * 0.05;
      }
    } catch (geoErr) {
      console.error('Geocode error:', geoErr);
      lat += (Math.random() - 0.5) * 0.05;
      lng += (Math.random() - 0.5) * 0.05;
    }

    return Response.json({
      lat,
      lng,
      locationName: area,
      confidence,
      imagePath: `/uploads/${filename}`
    });
  } catch (err) {
    console.error('Locate error:', err);
    return Response.json({
      lat: 12.9716 + (Math.random() - 0.5) * 0.08,
      lng: 77.5946 + (Math.random() - 0.5) * 0.08,
      locationName: 'Bangalore',
      confidence: 'none',
      imagePath: ''
    });
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
