// GET /api/drops — return all drops from KV (individual keys with prefix "drop:")
// Optional ?visitor= query param filters to that visitor's drops only
export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const visitorFilter = url.searchParams.get('visitor');

    let drops;
    try {
      drops = await getAllDrops(env);
    } catch (kvErr) {
      console.error('KV read failed:', kvErr);
      return Response.json(
        { error: 'Service temporarily unavailable. Please try again.' },
        { status: 503, headers: { 'Retry-After': '5' } }
      );
    }

    if (visitorFilter) {
      drops = drops.filter(d => d.visitorId === visitorFilter);
    }

    return Response.json(drops, {
      headers: {
        'Cache-Control': 'public, max-age=10',
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('Drops endpoint error:', err);
    return Response.json(
      { error: 'Something went wrong. Please refresh the page.' },
      { status: 500 }
    );
  }
}

async function getAllDrops(env) {
  const drops = [];
  let cursor = null;

  // Paginate through all keys with prefix "drop:"
  // KV list returns up to 1000 keys per call
  do {
    const listOpts = { prefix: 'drop:', limit: 1000 };
    if (cursor) listOpts.cursor = cursor;

    const result = await env.DROPS_KV.list(listOpts);

    // Fetch values in parallel batches of 50
    const keys = result.keys;
    for (let i = 0; i < keys.length; i += 50) {
      const batch = keys.slice(i, i + 50);
      const values = await Promise.all(
        batch.map(k => env.DROPS_KV.get(k.name, 'json'))
      );
      for (const val of values) {
        if (val) drops.push(val);
      }
    }

    cursor = result.list_complete ? null : result.cursor;
  } while (cursor);

  // Also check legacy single-key format for migration
  try {
    const legacy = await env.DROPS_KV.get('drops', 'json');
    if (legacy && Array.isArray(legacy) && legacy.length > 0) {
      drops.push(...legacy);
    }
  } catch (e) {
    // ignore legacy read errors
  }

  return drops;
}
