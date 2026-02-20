# BLR Pink Trumpet Blossom

**Drop a photo, plant a blossom, watch Bangalore turn pink.**

A community art project where every photo of Bangalore plants a pink trumpet blossom tree on a shared map. The more photos a neighborhood gets, the more it blooms.

> me: i should build something useful
> also me: what if every photo of bangalore planted a blossom on a map and the whole city slowly turned pink
>
> anyway it's live

---

## How It Works

```
1. Drag & drop a photo (or tap +)
2. We find the location from GPS data — or you pin it on the map
3. A pink trumpet blossom blooms at that spot
4. Share it. Watch the city fill up.
```

Every blossom is a real photo someone dropped. Clusters grow bigger as neighborhoods collect more. Zoom in, click a tree, see the photo.

## Architecture

```
public/
  index.html          — single-page app
  css/style.css       — dark theme, pink everything
  js/
    map.js            — Leaflet map + MarkerCluster + blossom tree SVG markers
    upload.js         — drag-drop, EXIF GPS extraction, pin-drop fallback
    gallery.js        — hover previews + lightbox on click
    petals.js         — canvas particle system (falling petals + burst effects)
    app.js            — orchestrator: drops, share modal, my blossoms panel

functions/
  api/upload.js       — POST /api/upload → validates, stores image in R2, saves drop to KV
  api/drops.js        — GET /api/drops → returns all drops from KV
  share.js            — GET /share?img=file → OG meta tags for social sharing
  og-image.js         — GET /og-image → generated SVG preview image
  uploads/[[path]].js — serves images from R2 with immutable caching
```

**Stack:** Vanilla JS, Leaflet, Cloudflare Pages + Workers, R2 (images), KV (drop records). No frameworks. No build step.

## Running Locally

```bash
npm install
npm run dev
```

This starts a local Wrangler dev server at `http://localhost:3000` with KV and R2 bindings.

## Deploying

```bash
npm run deploy
```

Deploys to Cloudflare Pages. You'll need:
- A Cloudflare account with Pages, KV, and R2 enabled
- KV namespace bound as `DROPS_KV`
- R2 bucket bound as `IMAGES_R2`

## The Little Details

- **No GPS? No problem.** If your photo doesn't have location data, the map switches to crosshair mode — tap where you took it
- **Falling petals.** A canvas particle system drops gentle petals across the screen. Plant a blossom and 40 burst out
- **Cluster blooming.** Neighborhoods with more photos get bigger, deeper pink clusters
- **Share card.** After planting, you get a share prompt with your photo and a pre-written tweet in the same unhinged energy as the project
- **My Blossoms.** Track every blossom you've planted, fly back to any of them on the map
- **Works offline-ish.** If KV write fails, the blossom still shows (saved to R2), and we tell you about the hiccup

---

*No reason. Just felt like the city deserved to bloom.*
