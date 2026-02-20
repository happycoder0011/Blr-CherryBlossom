// GET /og-image — serves a generated SVG as the default Open Graph preview image
export async function onRequestGet() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow1" cx="50%" cy="80%" r="60%">
      <stop offset="0%" stop-color="#3b0a2a" />
      <stop offset="100%" stop-color="#1a0a12" />
    </radialGradient>
    <radialGradient id="petalglow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fbcfe8" />
      <stop offset="100%" stop-color="#f472b6" />
    </radialGradient>
    <filter id="blur1" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="40" />
    </filter>
    <filter id="blur2" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#glow1)" />

  <!-- Ambient pink glow spots -->
  <circle cx="200" cy="350" r="200" fill="#ec4899" opacity="0.06" filter="url(#blur1)" />
  <circle cx="1000" cy="300" r="250" fill="#f472b6" opacity="0.05" filter="url(#blur1)" />
  <circle cx="600" cy="500" r="180" fill="#db2777" opacity="0.04" filter="url(#blur1)" />

  <!-- Ground line -->
  <line x1="0" y1="520" x2="1200" y2="520" stroke="#2d1320" stroke-width="1" opacity="0.5" />

  <!-- Tree 1 (left) -->
  <g transform="translate(180, 0)">
    <path d="M0 520 L0 340 Q2 335 4 340 L4 520" fill="#6B4F3F" />
    <path d="M0 420 Q-25 400 -35 370" fill="none" stroke="#6B4F3F" stroke-width="3" stroke-linecap="round" />
    <path d="M4 400 Q30 385 38 355" fill="none" stroke="#6B4F3F" stroke-width="3" stroke-linecap="round" />
    <circle cx="2" cy="310" r="50" fill="#F472B6" opacity="0.85" />
    <circle cx="-30" cy="340" r="35" fill="#F9A8D4" opacity="0.8" />
    <circle cx="35" cy="340" r="35" fill="#F9A8D4" opacity="0.8" />
    <circle cx="2" cy="280" r="30" fill="#EC4899" opacity="0.7" />
    <circle cx="-40" cy="360" r="25" fill="#FBCFE8" opacity="0.7" />
    <circle cx="45" cy="360" r="25" fill="#FBCFE8" opacity="0.7" />
    <circle cx="-15" cy="300" r="12" fill="#FDF2F8" opacity="0.6" />
    <circle cx="20" cy="305" r="10" fill="#FDF2F8" opacity="0.5" />
    <circle cx="-35" cy="370" r="8" fill="white" opacity="0.3" />
  </g>

  <!-- Tree 2 (center-left, tall) -->
  <g transform="translate(440, 0)">
    <path d="M0 520 L0 280 Q2 275 4 280 L4 520" fill="#8B6B5A" />
    <path d="M0 380 Q-30 360 -45 330" fill="none" stroke="#8B6B5A" stroke-width="3.5" stroke-linecap="round" />
    <path d="M4 360 Q35 345 50 310" fill="none" stroke="#8B6B5A" stroke-width="3.5" stroke-linecap="round" />
    <circle cx="2" cy="245" r="60" fill="#F472B6" opacity="0.9" />
    <circle cx="-40" cy="285" r="42" fill="#F9A8D4" opacity="0.85" />
    <circle cx="45" cy="285" r="42" fill="#F9A8D4" opacity="0.85" />
    <circle cx="2" cy="210" r="38" fill="#EC4899" opacity="0.7" />
    <circle cx="-55" cy="310" r="30" fill="#FBCFE8" opacity="0.75" />
    <circle cx="60" cy="310" r="30" fill="#FBCFE8" opacity="0.75" />
    <circle cx="-20" cy="240" r="15" fill="#FDF2F8" opacity="0.6" />
    <circle cx="25" cy="250" r="12" fill="#FDF2F8" opacity="0.5" />
    <circle cx="0" cy="270" r="8" fill="white" opacity="0.4" />
    <circle cx="-45" cy="325" r="10" fill="white" opacity="0.25" />
  </g>

  <!-- Tree 3 (center-right) -->
  <g transform="translate(720, 0)">
    <path d="M0 520 L0 310 Q2 305 4 310 L4 520" fill="#7A5C4F" />
    <path d="M0 400 Q-28 380 -38 350" fill="none" stroke="#7A5C4F" stroke-width="3" stroke-linecap="round" />
    <path d="M4 385 Q32 370 42 340" fill="none" stroke="#7A5C4F" stroke-width="3" stroke-linecap="round" />
    <circle cx="2" cy="275" r="55" fill="#F472B6" opacity="0.85" />
    <circle cx="-35" cy="310" r="38" fill="#F9A8D4" opacity="0.8" />
    <circle cx="40" cy="310" r="38" fill="#F9A8D4" opacity="0.8" />
    <circle cx="2" cy="245" r="34" fill="#EC4899" opacity="0.7" />
    <circle cx="-48" cy="338" r="28" fill="#FBCFE8" opacity="0.7" />
    <circle cx="52" cy="338" r="28" fill="#FBCFE8" opacity="0.7" />
    <circle cx="-18" cy="268" r="13" fill="#FDF2F8" opacity="0.5" />
    <circle cx="22" cy="275" r="10" fill="#FDF2F8" opacity="0.5" />
    <circle cx="0" cy="300" r="7" fill="white" opacity="0.35" />
  </g>

  <!-- Tree 4 (right, smaller) -->
  <g transform="translate(980, 0)">
    <path d="M0 520 L0 360 Q2 355 4 360 L4 520" fill="#6B4F3F" />
    <path d="M0 440 Q-22 425 -30 400" fill="none" stroke="#6B4F3F" stroke-width="2.5" stroke-linecap="round" />
    <path d="M4 425 Q26 412 34 388" fill="none" stroke="#6B4F3F" stroke-width="2.5" stroke-linecap="round" />
    <circle cx="2" cy="330" r="45" fill="#F472B6" opacity="0.85" />
    <circle cx="-28" cy="355" r="32" fill="#F9A8D4" opacity="0.8" />
    <circle cx="32" cy="355" r="32" fill="#F9A8D4" opacity="0.8" />
    <circle cx="2" cy="300" r="28" fill="#EC4899" opacity="0.7" />
    <circle cx="-38" cy="375" r="22" fill="#FBCFE8" opacity="0.7" />
    <circle cx="42" cy="375" r="22" fill="#FBCFE8" opacity="0.7" />
    <circle cx="-12" cy="325" r="10" fill="#FDF2F8" opacity="0.5" />
    <circle cx="16" cy="330" r="8" fill="white" opacity="0.3" />
  </g>

  <!-- Falling petals -->
  <circle cx="100" cy="180" r="4" fill="#F9A8D4" opacity="0.7" />
  <circle cx="320" cy="120" r="3" fill="#FBCFE8" opacity="0.6" />
  <circle cx="550" cy="160" r="5" fill="#F472B6" opacity="0.5" />
  <circle cx="680" cy="90" r="3" fill="#FDF2F8" opacity="0.7" />
  <circle cx="850" cy="140" r="4" fill="#F9A8D4" opacity="0.6" />
  <circle cx="1050" cy="110" r="3" fill="#FBCFE8" opacity="0.5" />
  <circle cx="250" cy="480" r="3" fill="#F472B6" opacity="0.4" />
  <circle cx="530" cy="450" r="4" fill="#F9A8D4" opacity="0.35" />
  <circle cx="820" cy="470" r="3" fill="#FBCFE8" opacity="0.4" />
  <circle cx="1100" cy="490" r="4" fill="#F472B6" opacity="0.3" />
  <circle cx="150" cy="300" r="3" fill="#FDF2F8" opacity="0.5" />
  <circle cx="900" cy="220" r="4" fill="#F9A8D4" opacity="0.45" />
  <circle cx="1150" cy="280" r="3" fill="#FBCFE8" opacity="0.4" />
  <circle cx="60" cy="420" r="3" fill="#F472B6" opacity="0.35" />
  <circle cx="370" cy="500" r="4" fill="#F9A8D4" opacity="0.3" />

  <!-- Title text -->
  <text x="600" y="565" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="48" font-weight="700" fill="#FBCFE8" letter-spacing="2">
    BLR Pink Trumpet Blossom
  </text>
  <text x="600" y="600" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#F9A8D4" opacity="0.7" letter-spacing="1">
    drop a photo, plant a blossom, watch bangalore turn pink
  </text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    }
  });
}
