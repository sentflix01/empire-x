#!/usr/bin/env node
/**
 * Rebuilds the raster logo files from public/brand/nodbusiness-icon.svg
 * (white mark on brand blue #2563eb; docs/brand/COLOR_SYSTEM.md).
 *
 *   node scripts/brand/render-icons.mjs
 *
 * Writes:
 *   public/icons/icon-192.png, icon-512.png  PWA icons ("any maskable": full-bleed
 *                                             blue, mark inside the 80% safe zone)
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
const SVG = fs.readFileSync(path.join(ROOT, 'public/brand/nodbusiness-icon.svg'));
const BLUE = { r: 0x25, g: 0x63, b: 0xeb, alpha: 1 };
// The outer boxes reach ~43% of the width from the centre; at 90% scale they
// stay inside the maskable safe zone (a circle of 40% radius).
const MASKABLE_SCALE = 0.9;

async function fullBleed(size, file) {
  const inner = Math.round(size * MASKABLE_SCALE);
  const mark = await sharp(SVG, { density: 72 * (inner / 280) * 2 }).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BLUE } })
    .composite([{ input: mark, gravity: 'centre' }])
    .flatten({ background: BLUE })
    .png({ compressionLevel: 9 })
    .toFile(path.join(ROOT, file));
}

async function plain(size, file) {
  await sharp(SVG, { density: 72 * (size / 280) * 2 }).resize(size, size).png().toFile(file);
}

await fullBleed(512, 'public/icons/icon-512.png');
await fullBleed(192, 'public/icons/icon-192.png');
await fullBleed(180, 'public/apple-touch-icon.png');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nb-favicon-'));
const sizes = [16, 32, 48];
for (const s of sizes) await plain(s, path.join(tmp, `${s}.png`));
execFileSync('convert', [...sizes.map((s) => path.join(tmp, `${s}.png`)), path.join(ROOT, 'app/favicon.ico')]);
fs.rmSync(tmp, { recursive: true, force: true });

console.log('icons written: icon-512, icon-192, apple-touch-icon, favicon.ico (16/32/48)');

/*
 * Intro videos (run once when the logo colours change; ffmpeg):
 * black → #2563eb, white → white, greys → the tints between.
 *
 *   ffmpeg -i in.mp4 -vf "lutrgb=r='37+(255-37)*val/255':g='99+(255-99)*val/255':b='235+(255-235)*val/255'" \
 *     -c:v libx264 -pix_fmt yuv420p -crf <same quality> -an -movflags +faststart out.mp4
 */
