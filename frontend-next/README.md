# Empire X Frontend

Active web frontend for Empire X. Built with Next.js 16 App Router, TypeScript, TailwindCSS, shadcn/ui components, TanStack Query, and Socket.IO client.

## Getting Started

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

## Environment

Required for local development:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional for richer staging simulation:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

## Quality Gates

Run these before pushing a staging deploy:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The app intentionally uses local/system font fallbacks in `app/globals.css` so builds do not depend on fetching Google Fonts.

## Deploy

Deploy this folder (`frontend-next`) to Vercel. Set `NEXT_PUBLIC_API_BASE_URL` to the deployed backend URL and `NEXT_PUBLIC_APP_URL` to the Vercel frontend URL.
