// GET /api/drops — return all drops from KV
export async function onRequestGet(context) {
  const { env } = context;

  try {
    const data = await env.DROPS_KV.get('drops', 'json');
    return Response.json(data || []);
  } catch (err) {
    console.error('Error reading drops:', err);
    return Response.json([]);
  }
}
