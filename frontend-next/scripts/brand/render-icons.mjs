#!/usr/bin/env node
/**
 * Renders the raster logo files from the vector icons made by build-logo.mjs,
 * so every size is drawn sharp rather than shrunk from a photo.
 *
 *   node scripts/brand/build-logo.mjs && node scripts/brand/render-icons.mjs   (needs ImageMagick)
 *
 * Writes (names from lib/brandAssets.ts; a changed logo gets new names):
 *   public/icons/nodbusiness-icon-v3.png     96 px browser-tab icon (round, transparent corners)
 *   public/icons/icon-192-v3.png, icon-512-v3.png  PWA icons ("any maskable": full-bleed
 *                                             blue, logo inside the 80% safe zone)
 *   public/apple-touch-icon.png              180 × 180, full-bleed blue, no transparency
 *   app/favicon.ico                          16, 32 and 48 px from the small icon
 *
 * The intro videos are recoloured once with ffmpeg (see the bottom of this file).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const out = (f) => path.join(ROOT, f);
const ICON = fs.readFileSync(out('public/brand/nodbusiness-icon-v3.svg'));
const SMALL = fs.readFileSync(out('public/brand/nodbusiness-icon-small-v3.svg'));
const BLUE = { r: 0x25, g: 0x63, b: 0xeb, alpha: 1 };
// The outer boxes reach ~45% of the width from the centre; at 85% scale they
// stay inside the maskable safe zone (a circle of 40% radius).
const MASKABLE_SCALE = 0.85;

// Render the 280-unit SVG straight at the target size (density = 72 dpi × scale).
const raster = (svg, size) => sharp(svg, { density: (72 * size) / 280 }).resize(size, size);

async function fullBleed(size, file) {
  const inner = Math.round(size * MASKABLE_SCALE);
  const logo = await raster(ICON, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BLUE } })
    .composite([{ input: logo, gravity: 'centre' }])
    .flatten({ background: BLUE })
    .png({ compressionLevel: 9, palette: true, quality: 95 })
    .toFile(out(file));
}

fs.mkdirSync(out('public/icons'), { recursive: true });
await raster(ICON, 96).png({ compressionLevel: 9 }).toFile(out('public/icons/nodbusiness-icon-v3.png'));
await fullBleed(512, 'public/icons/icon-512-v3.png');
await fullBleed(192, 'public/icons/icon-192-v3.png');
await fullBleed(180, 'public/apple-touch-icon.png');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-icons-'));
const sizes = [16, 32, 48];
for (const s of sizes) await raster(SMALL, s).png().toFile(path.join(tmp, `${s}.png`));
execFileSync('convert', [...sizes.map((s) => path.join(tmp, `${s}.png`)), out('app/favicon.ico')]);
fs.rmSync(tmp, { recursive: true, force: true });

console.log('written: tab icon 96, icon-512, icon-192, apple-touch-icon, favicon.ico (16/32/48)');

/*
 * Intro videos (run once when the logo colours change; ffmpeg):
 * black → #2563eb, white → white, greys → the tints between.
 *
 *   ffmpeg -i in.mp4 -vf "lutrgb=r='37+(255-37)*val/255':g='99+(255-99)*val/255':b='235+(255-235)*val/255'" \
 *     -c:v libx264 -pix_fmt yuv420p -crf <same quality> -an -movflags +faststart out.mp4
 */
