# Siipi — Web Dashboard

Next.js 16 (App Router) web dashboard for the Siipi bird sighting logger.

See the [root README](../README.md) for the full project overview and setup instructions.

## Commands

```bash
npm run dev    # development server on localhost:3000
npm run build  # production build
npm run lint   # ESLint
```

## Environment variables

Create `web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```
