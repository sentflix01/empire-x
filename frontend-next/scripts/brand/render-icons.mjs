#!/usr/bin/env node
/**
 * Rebuilds every still logo file from the last frame of the intro video, so
 * the small logo is the same picture as the animated one: the network of
 * businesses over the globe, white on brand blue (docs/brand/BRAND_BOOK.md).
 *
 *   node scripts/brand/render-icons.mjs        (needs ffmpeg and ImageMagick)
 *
 * Writes (names from lib/brandAssets.ts; a changed logo gets new names):
 *   public/brand/nodbusiness-icon-v2.webp    288 px round logo for pages (shown at 144 px at most)
 *   public/icons/nodbusiness-icon-v2.png     96 px round logo for the browser tab
 *   public/icons/icon-192-v2.png, icon-512-v2.png  PWA icons ("any maskable": full-bleed
 *                                             blue, logo inside the 80% safe zone)
 *   public/apple-touch-icon.png              180 × 180, full-bleed blue, no transparency
 *   app/favicon.ico                          16, 32 and 48 px (packed with ImageMagick)
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
// The frame's own blue at the circle's edge, so full-bleed icons show no seam.
const BLUE = { r: 0x26, g: 0x62, b: 0xe9, alpha: 1 };
// The outer boxes reach ~45% of the width from the centre; at 85% scale they
// stay inside the maskable safe zone (a circle of 40% radius).
const MASKABLE_SCALE = 0.85;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-icons-'));
const frame = path.join(tmp, 'frame.png');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-sseof', '-0.1', '-i', out('public/brand/nodbusiness-intro.mp4'), '-frames:v', '1', frame]);
const { width } = await sharp(frame).metadata();

// Round logo with soft, transparent corners.
const circle = Buffer.from(`<svg width="${width}" height="${width}"><circle cx="${width / 2}" cy="${width / 2}" r="${width / 2 - 1}" fill="#fff"/></svg>`);
const round = await sharp(frame).ensureAlpha().composite([{ input: circle, blend: 'dest-in' }]).png().toBuffer();

async function roundLogo(size, file) {
  const img = sharp(round).resize(size, size, { kernel: 'lanczos3' });
  await (file.endsWith('.webp') ? img.webp({ quality: 82, alphaQuality: 90 }) : img.png({ compressionLevel: 9, palette: true, quality: 90 })).toFile(file);
}

async function fullBleed(size, file) {
  const inner = Math.round(size * MASKABLE_SCALE);
  const logo = await sharp(round).resize(inner, inner, { kernel: 'lanczos3' }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BLUE } })
    .composite([{ input: logo, gravity: 'centre' }])
    .flatten({ background: BLUE })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(out(file));
}

await roundLogo(288, out('public/brand/nodbusiness-icon-v2.webp'));
await roundLogo(96, out('public/icons/nodbusiness-icon-v2.png'));
await fullBleed(512, 'public/icons/icon-512-v2.png');
await fullBleed(192, 'public/icons/icon-192-v2.png');
await fullBleed(180, 'public/apple-touch-icon.png');

const sizes = [16, 32, 48];
for (const s of sizes) await roundLogo(s, path.join(tmp, `${s}.png`));
execFileSync('convert', [...sizes.map((s) => path.join(tmp, `${s}.png`)), out('app/favicon.ico')]);
fs.rmSync(tmp, { recursive: true, force: true });

console.log('written: round logo 288/96, icon-512, icon-192, apple-touch-icon, favicon.ico (16/32/48)');

/*
 * Intro videos (run once when the logo colours change; ffmpeg):
 * black → #2563eb, white → white, greys → the tints between.
 *
 *   ffmpeg -i in.mp4 -vf "lutrgb=r='37+(255-37)*val/255':g='99+(255-99)*val/255':b='235+(255-235)*val/255'" \
 *     -c:v libx264 -pix_fmt yuv420p -crf <same quality> -an -movflags +faststart out.mp4
 */
