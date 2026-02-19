// GET /share?img=filename — serves HTML with OG/Twitter Card meta tags for image preview
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const img = url.searchParams.get('img');

  const origin = url.origin;
  const imageUrl = img ? `${origin}/uploads/${img}` : '';
  const siteUrl = origin;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="BLR Pink Trumpet Blossom">
  <meta property="og:description" content="drop a photo, plant a pink trumpet blossom, watch bangalore turn pink 🌸">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${siteUrl}">
  ${imageUrl ? `<meta property="og:image" content="${imageUrl}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="BLR Pink Trumpet Blossom">
  <meta name="twitter:description" content="drop a photo, plant a pink trumpet blossom, watch bangalore turn pink 🌸">
  ${imageUrl ? `<meta name="twitter:image" content="${imageUrl}">` : ''}
  <meta http-equiv="refresh" content="0;url=${siteUrl}">
  <title>BLR Pink Trumpet Blossom</title>
</head>
<body>
  <p>Redirecting to <a href="${siteUrl}">BLR Pink Trumpet Blossom</a>...</p>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}
