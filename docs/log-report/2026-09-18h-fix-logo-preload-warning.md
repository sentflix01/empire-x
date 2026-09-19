# fix: remove priority from logo Image in AppLayout — eliminates preload warning

> **Type:** Bugfix · **Date:** 2026-09-18 · **Branch:** `feat/personal-business-toggle-auth-port-fixes` · **Status:** ✅ Committed

## Root cause

`AppLayout.tsx` is a `'use client'` component. The `priority` prop on a Next.js `<Image>` inside a client component causes Next.js to emit `<link rel="preload" as="image">` in the document `<head>`. However, because the component only mounts after client-side hydration, the `<img>` element that would "consume" the preload hint doesn't exist in the initial server-rendered HTML. The browser loads the page, sees the preload hint, waits a few seconds, finds no matching element, and logs:

> The resource `.../brand/nodbusiness-icon.svg` was preloaded using link preload but not used within a few seconds from the window's load event.

## Fix

Removed `priority` from the logo `<Image>` in `AppLayout.tsx` (line ~399). The logo is not above-the-fold critical content — it is inside a client layout component that mounts post-hydration. Removing `priority` eliminates the spurious preload hint without any visible performance impact.
