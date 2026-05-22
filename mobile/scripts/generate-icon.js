const sharp = require('sharp');
const path = require('path');

const SIZE = 1024;
const BG = '#0D0D0D';
const ORANGE = '#E87722';
const WHITE = '#FFFFFF';

// SVG crosshair icon for a shooting sports app
const svg = `
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${SIZE}" height="${SIZE}" fill="${BG}" rx="0"/>

  <!-- Subtle radial gradient background -->
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#1A1A1A"/>
      <stop offset="100%" stop-color="${BG}"/>
    </radialGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>

  <!-- Outer circle -->
  <circle cx="512" cy="512" r="340" fill="none" stroke="${ORANGE}" stroke-width="18"/>

  <!-- Middle circle -->
  <circle cx="512" cy="512" r="220" fill="none" stroke="${ORANGE}" stroke-width="10" stroke-opacity="0.6"/>

  <!-- Inner circle (center dot ring) -->
  <circle cx="512" cy="512" r="60" fill="none" stroke="${ORANGE}" stroke-width="14"/>

  <!-- Center dot -->
  <circle cx="512" cy="512" r="18" fill="${ORANGE}"/>

  <!-- Crosshair lines - top -->
  <line x1="512" y1="100" x2="512" y2="430" stroke="${ORANGE}" stroke-width="16" stroke-linecap="round"/>
  <!-- Crosshair lines - bottom -->
  <line x1="512" y1="594" x2="512" y2="924" stroke="${ORANGE}" stroke-width="16" stroke-linecap="round"/>
  <!-- Crosshair lines - left -->
  <line x1="100" y1="512" x2="430" y2="512" stroke="${ORANGE}" stroke-width="16" stroke-linecap="round"/>
  <!-- Crosshair lines - right -->
  <line x1="594" y1="512" x2="924" y2="512" stroke="${ORANGE}" stroke-width="16" stroke-linecap="round"/>

  <!-- Tick marks on outer ring - top -->
  <line x1="512" y1="148" x2="512" y2="192" stroke="${ORANGE}" stroke-width="12" stroke-opacity="0.4" stroke-linecap="round"/>
  <!-- Tick marks - right -->
  <line x1="824" y1="512" x2="868" y2="512" stroke="${ORANGE}" stroke-width="12" stroke-opacity="0.4" stroke-linecap="round"/>
  <!-- Tick marks - bottom -->
  <line x1="512" y1="832" x2="512" y2="876" stroke="${ORANGE}" stroke-width="12" stroke-opacity="0.4" stroke-linecap="round"/>
  <!-- Tick marks - left -->
  <line x1="144" y1="512" x2="188" y2="512" stroke="${ORANGE}" stroke-width="12" stroke-opacity="0.4" stroke-linecap="round"/>

  <!-- SL monogram in bottom-right quadrant -->
  <text x="620" y="600" font-family="Arial, Helvetica, sans-serif" font-size="88" font-weight="800" fill="${ORANGE}" fill-opacity="0.35" letter-spacing="-4">SL</text>
</svg>
`;

async function generate() {
  const outDir = path.join(__dirname, '../assets/images');

  // Main icon 1024x1024
  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(outDir, 'icon.png'));
  console.log('✓ icon.png (1024x1024)');

  // Splash icon (centered on transparent, smaller)
  const splashSvg = `
<svg width="200" height="200" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="512" cy="512" r="340" fill="none" stroke="${ORANGE}" stroke-width="18"/>
  <circle cx="512" cy="512" r="220" fill="none" stroke="${ORANGE}" stroke-width="10" stroke-opacity="0.6"/>
  <circle cx="512" cy="512" r="60" fill="none" stroke="${ORANGE}" stroke-width="14"/>
  <circle cx="512" cy="512" r="18" fill="${ORANGE}"/>
  <line x1="512" y1="100" x2="512" y2="430" stroke="${ORANGE}" stroke-width="16" stroke-linecap="round"/>
  <line x1="512" y1="594" x2="512" y2="924" stroke="${ORANGE}" stroke-width="16" stroke-linecap="round"/>
  <line x1="100" y1="512" x2="430" y2="512" stroke="${ORANGE}" stroke-width="16" stroke-linecap="round"/>
  <line x1="594" y1="512" x2="924" y2="512" stroke="${ORANGE}" stroke-width="16" stroke-linecap="round"/>
</svg>`;

  await sharp(Buffer.from(splashSvg))
    .resize(200, 200)
    .png()
    .toFile(path.join(outDir, 'splash-icon.png'));
  console.log('✓ splash-icon.png (200x200)');

  // Favicon
  await sharp(Buffer.from(svg))
    .resize(48, 48)
    .png()
    .toFile(path.join(outDir, 'favicon.png'));
  console.log('✓ favicon.png (48x48)');
}

generate().catch(console.error);
