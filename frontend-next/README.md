# Nodbusiness Frontend

Active web frontend for Nodbusiness. Built with Next.js 16 App Router, TypeScript, TailwindCSS, shadcn/ui components, TanStack Query, and Socket.IO client.

## Getting Started

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3002.

## Environment

Required for local development:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

Required for production on Cloudflare Pages:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-hostname.example.com
NEXT_PUBLIC_APP_URL=https://nodbusiness.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

Optional production settings:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

> Make sure your Google OAuth client includes the deployed frontend URL in Authorized JavaScript origins.

## Free beta / local development

For a free pilot or local testing, keep the frontend and backend on localhost and do not configure Cloudflare R2.

- Frontend env:
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`
  - `NEXT_PUBLIC_APP_URL=http://localhost:3002`
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com`
- Backend can continue using local disk uploads by leaving R2 env vars unset.
- This is fine for development and a small closed beta, but not for large public production.
- Practical free-beta capacity is small: focus on feature validation, a handful of businesses, and light uploads.

## Quality Gates

Run these before pushing a staging deploy:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The app intentionally uses local/system font fallbacks in `app/globals.css` so builds do not depend on fetching Google Fonts.

## Deploy

Deploy this folder (`frontend-next`) to **Vercel**. Connect your GitHub repo in the Vercel dashboard, set the root directory to `frontend-next`. Set `NEXT_PUBLIC_API_BASE_URL` to your Render backend URL (e.g. `https://nodbusiness-backend-9psf.onrender.com`) and `NEXT_PUBLIC_APP_URL` to your Vercel domain. Vercel deploys automatically on every push to `main`. See `DEPLOYMENT_VARIABLES.md` for the full environment variable list.
