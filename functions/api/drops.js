// GET /api/drops — return all drops from KV
// Optional ?visitor= query param filters to that visitor's drops only
export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const visitorFilter = url.searchParams.get('visitor');

    let data;
    try {
      data = await env.DROPS_KV.get('drops', 'json');
    } catch (kvErr) {
      console.error('KV read failed:', kvErr);
      return Response.json(
        { error: 'Service temporarily unavailable. Please try again.' },
        { status: 503, headers: { 'Retry-After': '5' } }
      );
    }

    const drops = data || [];

    if (visitorFilter) {
      const filtered = drops.filter(d => d.visitorId === visitorFilter);
      return Response.json(filtered);
    }

    return Response.json(drops);
  } catch (err) {
    console.error('Drops endpoint error:', err);
    return Response.json(
      { error: 'Something went wrong. Please refresh the page.' },
      { status: 500 }
    );
  }
}
