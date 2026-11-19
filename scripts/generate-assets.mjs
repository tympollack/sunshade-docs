#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const appDir = path.join(rootDir, 'src', 'app');

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

function buildSunshadeVectorSvg({ width = '100%', height = '100%' } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 512 512" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Sunburst & Canopy Gold-Amber Gradients -->
    <linearGradient id="sunGold" x1="256" y1="20" x2="256" y2="490" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FDE68A" />
      <stop offset="25%" stop-color="#F59E0B" />
      <stop offset="70%" stop-color="#D97706" />
      <stop offset="100%" stop-color="#CC5500" />
    </linearGradient>

    <linearGradient id="canopyArc" x1="60" y1="180" x2="452" y2="340" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#CC5500" />
      <stop offset="30%" stop-color="#F59E0B" />
      <stop offset="50%" stop-color="#FDE68A" />
      <stop offset="70%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#CC5500" />
    </linearGradient>

    <linearGradient id="meshNet" x1="120" y1="160" x2="392" y2="470" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="40%" stop-color="#D97706" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>

    <filter id="subtleGlow" x="-25%" y="-25%" width="150%" height="150%" filterUnits="objectBoundingBox">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Sun Rays (Top Burst) -->
  <g id="sun-rays" fill="url(#sunGold)">
    <path d="M 251 12 L 261 12 L 257 88 L 255 88 Z" />
    <path d="M 183 29 L 192 25 L 208 97 L 205 98 Z" />
    <path d="M 329 25 L 338 29 L 316 98 L 313 97 Z" />
    <path d="M 124 74 L 131 68 L 168 126 L 164 129 Z" />
    <path d="M 388 68 L 395 74 L 357 129 L 353 126 Z" />
    <path d="M 77 138 L 82 131 L 140 168 L 137 172 Z" />
    <path d="M 435 131 L 440 138 L 382 172 L 379 168 Z" />
  </g>

  <!-- Upper Sun Arc -->
  <path d="M 172 126 C 196 98 225 84 256 84 C 287 84 316 98 340 126 C 322 108 298 98 256 98 C 214 98 190 108 172 126 Z" fill="url(#sunGold)" />

  <!-- Geodesic Mesh / Node Network & Shield Body -->
  <g id="node-mesh" stroke="url(#meshNet)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 148 240 C 148 350 215 425 256 470 C 297 425 364 350 364 240" fill="none" stroke-width="15" stroke="url(#sunGold)" />
    <line x1="148" y1="240" x2="256" y2="190" />
    <line x1="364" y1="240" x2="256" y2="190" />
    <line x1="200" y1="230" x2="312" y2="230" />
    <line x1="156" y1="290" x2="256" y2="280" />
    <line x1="356" y1="290" x2="256" y2="280" />
    <line x1="180" y1="360" x2="256" y2="380" />
    <line x1="332" y1="360" x2="256" y2="380" />
    <line x1="256" y1="280" x2="200" y2="360" />
    <line x1="256" y1="280" x2="312" y2="360" />
    <line x1="256" y1="380" x2="256" y2="465" />
    <path d="M 195 220 Q 256 320 280 435" stroke="url(#sunGold)" stroke-width="14" fill="none" />
    <path d="M 317 220 Q 256 320 232 435" stroke="url(#sunGold)" stroke-width="14" fill="none" />
  </g>

  <!-- Network Junction Nodes -->
  <g id="network-nodes" fill="url(#sunGold)">
    <circle cx="256" cy="190" r="14" />
    <circle cx="200" cy="230" r="13" />
    <circle cx="312" cy="230" r="13" />
    <circle cx="256" cy="280" r="14" />
    <circle cx="195" cy="326" r="13" />
    <circle cx="317" cy="326" r="13" />
    <circle cx="256" cy="385" r="13" />
  </g>

  <!-- Overarching Canopy Wings (Protective Arch) -->
  <g id="canopy-wings" filter="url(#subtleGlow)">
    <path d="M 52 308 C 88 200 168 135 256 128 C 172 152 108 215 78 300 Z" fill="url(#canopyArc)" />
    <path d="M 460 308 C 424 200 344 135 256 128 C 340 152 404 215 434 300 Z" fill="url(#canopyArc)" />
    <path d="M 48 308 C 100 160 210 120 256 120 C 302 120 412 160 464 308 C 400 185 295 152 256 152 C 217 152 112 185 48 308 Z" fill="url(#canopyArc)" />
    <circle cx="48" cy="308" r="18" fill="url(#sunGold)" />
    <circle cx="464" cy="308" r="18" fill="url(#sunGold)" />
  </g>
</svg>
`;
}

export const sunshadeVectorSvg = buildSunshadeVectorSvg();

function stripSvgWrapper(svg) {
  return svg
    .replace(/<\?xml.*?\?>/g, '')
    .replace(/<svg[^>]*>/g, '')
    .replace(/<\/svg>/g, '');
}

export function generateHorizontalLogoSvg({ dark = true, width = '100%', height = '100%' } = {}) {
  const textColor = dark ? '#FFFFFF' : '#111827';
  const accentColor = dark ? '#F59E0B' : '#D97706';
  const subtitleColor = dark ? '#94A3B8' : '#64748B';
  const badgeBg = dark ? '#451A03' : '#FFFBEB';
  const badgeBorder = dark ? '#D97706' : '#F59E0B';
  const badgeText = dark ? '#FDE68A' : '#B45309';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 680 160" width="${width}" height="${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Embedded SunShade Emblem -->
  <g transform="translate(10, 10) scale(0.273)">
    ${stripSvgWrapper(sunshadeVectorSvg)}
  </g>

  <!-- Typography -->
  <text x="165" y="80" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="48" font-weight="800" letter-spacing="-0.5">
    <tspan fill="${textColor}">SunShade </tspan>
    <tspan fill="${accentColor}">Docs</tspan>
  </text>

  <!-- Subtitle Tagline -->
  <text x="168" y="114" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="${subtitleColor}" letter-spacing="3.0">
    PORTAL &amp; LIVING BINDER ENGINE
  </text>

  <!-- Ecosystem Pill Badge -->
  <g transform="translate(502, 52)">
    <rect width="72" height="24" rx="12" fill="${badgeBg}" stroke="${badgeBorder}" stroke-width="1.2" />
    <circle cx="12" cy="12" r="3.5" fill="#F59E0B" />
    <text x="22" y="16" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="${badgeText}" letter-spacing="0.5">
      DOCS
    </text>
  </g>
</svg>
`;
}

function generateTextOnlySvg({ dark = true } = {}) {
  const textColor = dark ? '#FFFFFF' : '#111827';
  const accentColor = dark ? '#F59E0B' : '#D97706';
  const subtitleColor = dark ? '#94A3B8' : '#64748B';
  const badgeBg = dark ? '#451A03' : '#FFFBEB';
  const badgeBorder = dark ? '#D97706' : '#F59E0B';
  const badgeText = dark ? '#FDE68A' : '#B45309';

  return `<svg width="530" height="160" viewBox="0 0 530 160" xmlns="http://www.w3.org/2000/svg">
    <text x="10" y="80" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="48" font-weight="800" letter-spacing="-0.5">
      <tspan fill="${textColor}">SunShade </tspan>
      <tspan fill="${accentColor}">Docs</tspan>
    </text>
    <text x="12" y="114" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="${subtitleColor}" letter-spacing="3.0">
      PORTAL &amp; LIVING BINDER ENGINE
    </text>
    <g transform="translate(352, 52)">
      <rect width="72" height="24" rx="12" fill="${badgeBg}" stroke="${badgeBorder}" stroke-width="1.2" />
      <circle cx="12" cy="12" r="3.5" fill="#F59E0B" />
      <text x="22" y="16" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" fill="${badgeText}" letter-spacing="0.5">
        DOCS
      </text>
    </g>
  </svg>`;
}

function buildIcoBuffer(pngBuffers, sizes) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);

  let offset = 6 + 16 * sizes.length;
  const entries = [];
  for (let i = 0; i < sizes.length; i++) {
    const entry = Buffer.alloc(16);
    const size = sizes[i];
    const buf = pngBuffers[i];
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buf.length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

async function main() {
  console.log('--- Generating Production Favicons & Logos for SunShade Docs ---');

  // 1. Write vector SVGs
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), sunshadeVectorSvg);
  fs.writeFileSync(path.join(appDir, 'icon.svg'), sunshadeVectorSvg);
  fs.writeFileSync(path.join(publicDir, 'logo-icon.svg'), sunshadeVectorSvg);
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), generateHorizontalLogoSvg({ dark: true }));
  fs.writeFileSync(path.join(publicDir, 'logo-light.svg'), generateHorizontalLogoSvg({ dark: false }));
  console.log('✓ Vector SVGs written (icon.svg, logo.svg, logo-light.svg, logo-icon.svg)');

  // 2. Render master 1024x1024 raster emblem directly from vector SVG
  const masterSvgBuffer = Buffer.from(buildSunshadeVectorSvg({ width: 1024, height: 1024 }));
  const { data: trimmedMasterBuffer, info } = await sharp(masterSvgBuffer, { density: 144 })
    .trim()
    .png()
    .toBuffer({ resolveWithObject: true });
  console.log(`✓ Master emblem rasterized & trimmed to ${info.width}x${info.height}`);

  async function makeSquareEmblem(targetSize, paddingRatio = 0.08) {
    const innerSize = Math.round(targetSize * (1 - paddingRatio * 2));
    const resized = await sharp(trimmedMasterBuffer)
      .resize(innerSize, innerSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();

    return sharp({
      create: {
        width: targetSize,
        height: targetSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resized, gravity: 'center' }])
      .png()
      .toBuffer();
  }

  // 3. Multi-resolution favicon.ico (16, 32, 48)
  const icoSizes = [16, 32, 48];
  const icoBuffers = await Promise.all(icoSizes.map((s) => makeSquareEmblem(s, 0.04)));
  const icoBuffer = buildIcoBuffer(icoBuffers, icoSizes);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  console.log(`✓ Multi-resolution favicon.ico written (${icoBuffer.length} bytes)`);

  // 4. Discrete PNG favicons
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), await makeSquareEmblem(16, 0.02));
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), await makeSquareEmblem(32, 0.04));
  fs.writeFileSync(path.join(publicDir, 'favicon-48x48.png'), await makeSquareEmblem(48, 0.06));
  console.log('✓ Discrete PNG favicons written (16x16, 32x32, 48x48)');

  // 5. Apple touch icon (180x180)
  const appleInner = await sharp(trimmedMasterBuffer)
    .resize(138, 138, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const appleTouchIcon = await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 9, g: 13, b: 22, alpha: 1 },
    },
  })
    .composite([{ input: appleInner, gravity: 'center' }])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), appleTouchIcon);
  console.log('✓ Apple touch icons written');

  // 6. PWA & Master logo-icon PNGs
  const pwa192 = await makeSquareEmblem(192, 0.06);
  const pwa512 = await makeSquareEmblem(512, 0.08);
  fs.writeFileSync(path.join(publicDir, 'android-chrome-192x192.png'), pwa192);
  fs.writeFileSync(path.join(publicDir, 'android-chrome-512x512.png'), pwa512);
  fs.writeFileSync(path.join(publicDir, 'logo-icon.png'), pwa512);
  console.log('✓ PWA & logo-icon PNGs written (192x192, 512x512)');

  // 7. Horizontal raster logos (680x160)
  const logoEmblem = await sharp(trimmedMasterBuffer)
    .resize(136, 136, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const logoDark = await sharp({
    create: {
      width: 680,
      height: 160,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: logoEmblem, top: 12, left: 10 },
      { input: Buffer.from(generateTextOnlySvg({ dark: true })), top: 0, left: 150 },
    ])
    .png()
    .toBuffer();

  const logoLight = await sharp({
    create: {
      width: 680,
      height: 160,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: logoEmblem, top: 12, left: 10 },
      { input: Buffer.from(generateTextOnlySvg({ dark: false })), top: 0, left: 150 },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'logo.png'), logoDark);
  fs.writeFileSync(path.join(publicDir, 'logo-dark.png'), logoDark);
  fs.writeFileSync(path.join(publicDir, 'logo-light.png'), logoLight);
  console.log('✓ Horizontal raster logos written (logo.png, logo-dark.png, logo-light.png)');

  // 8. Web App Manifest
  const webManifest = {
    name: 'SunShade Docs',
    short_name: 'Docs',
    description: 'Central documentation portal and Living Binder engine for SunShade Systems',
    start_url: '/',
    display: 'standalone',
    background_color: '#090d16',
    theme_color: '#f59e0b',
    icons: [
      { src: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };

  fs.writeFileSync(path.join(publicDir, 'site.webmanifest'), `${JSON.stringify(webManifest, null, 2)}\n`);
  console.log('✓ site.webmanifest written');
}

main().catch((err) => {
  console.error('Failed to generate assets:', err);
  process.exit(1);
});
