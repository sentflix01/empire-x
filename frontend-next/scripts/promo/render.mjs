#!/usr/bin/env node
/**
 * Renders the wordless promo videos (decision "Promo videos load when
 * visible", project-brain/DECISIONS.md) from the scenes in ./scenes.
 *
 *   node scripts/promo/render.mjs                 # every scene
 *   node scripts/promo/render.mjs banner          # one scene
 *   node scripts/promo/render.mjs landing --preview 2,5,11 --out /some/dir
 *                                                  # PNG stills only
 *
 * Each scene draws a frame for any time t (window.setTime), so Playwright
 * steps through it frame by frame and ffmpeg encodes the frames. Output goes
 * to public/promo/<scene>-<w>x<h>-<version>.mp4 plus a -poster.webp (and, for
 * the guide and builder videos, <scene>-<version>.en.vtt subtitles),
 * and every file must fit its size budget; the encoder lowers quality step by
 * step until it does. When a scene changes, bump its version and update
 * lib/promoAssets.ts (old names stay cached in browsers and the service worker).
 *
 * H.264 only: for these flat graphics it is smaller than VP9 at the same look,
 * and every browser plays it.
 *
 * Needs ffmpeg with libx264 and libwebp, and Playwright's Chromium
 * (or PROMO_CHROMIUM=/path/to/chrome).
 */
/* global process, console, window */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../public/promo');
const LANG = 'en';
const KB = 1024;

const SCENES = {
  // Full step-by-step guide; downloads only when someone taps "Watch how it works".
  guide: {
    version: 'v4', css: [360, 640], scale: 2, fps: 30, poster: 6.0, captions: true,
    renditions: [{ w: 720, h: 1280, budget: 4500 * KB }, { w: 480, h: 854, budget: 2400 * KB }],
  },
  // Owner side only: build from pieces and change any part, any time. Opens from
  // the landing page's "Build and change a website" button.
  builder: {
    version: 'v1', css: [360, 640], scale: 2, fps: 30, poster: 60.0, captions: true,
    renditions: [{ w: 720, h: 1280, budget: 4500 * KB }, { w: 480, h: 854, budget: 2400 * KB }],
  },
  landing: {
    version: 'v4', css: [360, 640], scale: 2, fps: 30, poster: 18.6,
    renditions: [{ w: 720, h: 1280, budget: 2000 * KB }, { w: 480, h: 854, budget: 1100 * KB }],
  },
  // Wordless; plays small behind the feed banner's own text.
  banner: {
    version: 'v2', css: [640, 240], scale: 2, fps: 30, poster: 6.5,
    renditions: [{ w: 1280, h: 480, budget: 400 * KB }, { w: 640, h: 240, budget: 200 * KB }],
  },
};

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const names = args.filter((a, i) => !a.startsWith('--') && !['--preview', '--out'].includes(args[i - 1]));
const preview = flag('--preview')?.split(',').map(Number);
const previewDir = flag('--out') ?? os.tmpdir();

const ffmpeg = (a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: 'inherit' });

async function frames(page, name, cfg, times, dir) {
  await page.goto(`${pathToFileURL(path.join(here, 'scenes', `${name}.html`)).href}?lang=${LANG}`);
  await page.evaluate(() => window.READY);
  const files = [];
  for (const [i, t] of times.entries()) {
    await page.evaluate((x) => window.setTime(x), t);
    const file = path.join(dir, `f${String(i).padStart(4, '0')}.png`);
    await page.screenshot({ path: file });
    files.push(file);
  }
  return files;
}

function encode(dir, cfg, r) {
  const file = path.join(outDir, `${cfg.name}-${r.w}x${r.h}-${cfg.version}.mp4`);
  const scale = `scale=${r.w}:${r.h}:flags=lanczos,format=yuv420p`;
  // Constant-quality encodes; the loop raises CRF until the file fits.
  for (let crf = 25; crf <= 51; crf += 3) {
    const codec = ['-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', String(crf), '-profile:v', 'high', '-movflags', '+faststart'];
    ffmpeg(['-framerate', String(cfg.fps), '-i', path.join(dir, 'f%04d.png'), '-vf', scale, ...codec, '-an', file]);
    const size = fs.statSync(file).size;
    if (size <= r.budget) return { file, size, crf };
  }
  throw new Error(`${file} does not fit ${r.budget} bytes`);
}

// PROMO_CHROMIUM points at a Chromium binary when Playwright's own is not installed.
const browser = await chromium.launch(process.env.PROMO_CHROMIUM ? { executablePath: process.env.PROMO_CHROMIUM } : {});
try {
  for (const name of names.length ? names : Object.keys(SCENES)) {
    const cfg = { ...SCENES[name], name };
    if (!SCENES[name]) throw new Error(`unknown scene ${name}`);
    const context = await browser.newContext({ viewport: { width: cfg.css[0], height: cfg.css[1] }, deviceScaleFactor: cfg.scale });
    const page = await context.newPage();
    const duration = await page.goto(`${pathToFileURL(path.join(here, 'scenes', `${name}.html`)).href}?lang=${LANG}`).then(() => page.evaluate(async () => { await window.READY; return window.DURATION; }));
    const captions = cfg.captions ? await page.evaluate(() => window.CAPTIONS) : null;

    if (preview) {
      fs.mkdirSync(previewDir, { recursive: true });
      const dir = fs.mkdtempSync(path.join(previewDir, `${name}-`));
      await frames(page, name, cfg, preview, dir);
      console.log(`${name}: stills for t = ${preview.join(', ')} in ${dir}`);
      await context.close();
      continue;
    }

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `promo-${name}-`));
    const count = Math.round(duration * cfg.fps);
    const times = Array.from({ length: count }, (_, i) => i / cfg.fps);
    await frames(page, name, cfg, times, dir);
    await context.close();
    fs.mkdirSync(outDir, { recursive: true });

    const posterFrame = path.join(dir, `f${String(Math.round(cfg.poster * cfg.fps)).padStart(4, '0')}.png`);
    for (const r of cfg.renditions) {
      const { file, size, crf } = encode(dir, cfg, r);
      console.log(`${path.relative(process.cwd(), file)}  ${(size / KB).toFixed(0)} KB  crf ${crf}`);
      const poster = path.join(outDir, `${name}-${r.w}x${r.h}-${cfg.version}-poster.webp`);
      ffmpeg(['-i', posterFrame, '-vf', `scale=${r.w}:${r.h}:flags=lanczos`, '-c:v', 'libwebp', '-quality', '82', poster]);
      console.log(`${path.relative(process.cwd(), poster)}  ${(fs.statSync(poster).size / KB).toFixed(0)} KB`);
    }
    if (captions) {
      const stamp = (x) => new Date(x * 1000).toISOString().slice(11, 23);
      const vtt = `WEBVTT\n\n${captions.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n')}`;
      const file = path.join(outDir, `${name}-${cfg.version}.${LANG}.vtt`);
      fs.writeFileSync(file, vtt);
      console.log(`${path.relative(process.cwd(), file)}  ${captions.length} captions`);
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
} finally {
  await browser.close();
}
