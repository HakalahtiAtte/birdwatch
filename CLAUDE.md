# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo structure

```
birdwatch/
├── mobile/   — Expo React Native app (iOS/Android)
├── web/      — Next.js web app
├── shared/   — Shared TypeScript types (shared/types/database.ts)
└── supabase/ — Supabase edge functions
```

Each subdirectory is an independent package with its own `node_modules` and `package.json`. Commands must be run from the relevant subdirectory.

## Commands

### Mobile (`cd mobile`)
```bash
npm start          # Start Expo dev server (scan QR to open in Expo Go)
npm run android    # Start on Android emulator
npm run ios        # Start on iOS simulator
```

### Web (`cd web`)
```bash
npm run dev    # Start Next.js dev server on localhost:3000
npm run build  # Production build
npm run lint   # ESLint
```

## Environment variables

**Mobile** — create `mobile/.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

**Web** — create `web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Required for account deletion — never expose to client
UPSTASH_REDIS_REST_URL=           # Required for rate limiting in production (see below)
UPSTASH_REDIS_REST_TOKEN=         # Required for rate limiting in production
```

### Rate limiting setup (Upstash Redis)
The auth rate limiter (`src/lib/rate-limit.ts`) uses Upstash Redis in production and falls back
to in-memory in local dev. The in-memory fallback is NOT reliable on serverless — set up Upstash
before deploying:

1. Create a Redis database at https://console.upstash.com (free tier is fine)
2. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel environment variables
3. Add the same vars to `web/.env.local` for local testing

## Deployment

- **Web**: Vercel — https://birdwatch-ten.vercel.app
- **Mobile Android**: EAS build (dev client APK), installed on device. Run builds from `mobile/`.
- **Mobile iOS**: Pending Apple Developer account ($99/year)
- **Backend**: Supabase project `sfmovzodaagmwhyfapmq` (eu-west-3)

## What is built

### Mobile (fully built)
- Auth: login, signup, session persistence via SecureStore
- `app/(tabs)/sightings.tsx` — sightings list, time + species view, search, pull to refresh
- `app/(tabs)/add.tsx` — add sighting: species autocomplete (11,167 eBird species), GPS, offline draft queue
- `app/(tabs)/lifelist.tsx` — life list tab
- `app/(tabs)/profile.tsx` — profile tab
- `app/(tabs)/map.tsx` — map with green markers, callouts, links to sighting detail
- `app/sighting/[id].tsx` — sighting detail
- `app/sighting/edit/[id].tsx` — edit sighting, photo upload (camera + gallery), soft delete
- `app/species/[id].tsx` — species detail
- `app/import.tsx` — import screen
- Offline draft sync

### Web (fully built)
- Auth: login, signup — server actions in `src/app/(auth)/actions.ts`
- Auth guard: `src/app/dashboard/layout.tsx` checks auth server-side before rendering any dashboard page
- Dashboard overview with stats and activity chart
- `dashboard/sightings` — table with search, sort, edit modal, soft delete
- `dashboard/lifelist` — life list view
- `dashboard/map` — interactive Leaflet map
- `dashboard/gallery` — photo grid with signed URLs
- `dashboard/alerts` — species alert manager
- `dashboard/settings` — CSV export, account deletion

### Backend (Supabase)
- 8 tables with RLS — fully audited: `sightings`, `species`, `life_list`, `photos`, `hotspots`, `species_alerts`, `user_preferences`
- 11,167 eBird species imported (read-only)
- Photos storage bucket with signed URLs
- `soft_delete_sighting` and `update_sighting` RPCs (SECURITY INVOKER)
- Life list maintained by SECURITY DEFINER triggers — users cannot manipulate directly
- No anon access to any RPC

## What is NOT done yet

1. **Android build failing** — EAS errored on "Install dependencies". Check logs at expo.dev.
2. **iOS build** — needs Apple Developer account ($99/year). Once paid: `eas build --profile development --platform ios` from `mobile/`.
3. **Push notifications** — `species_alerts` table and `on_sighting_insert_notify` trigger exist, but the edge function and Expo push token registration are not implemented.
4. **Finnish species names** — species table has English names only. Plan: add `finnish_name` column, import BirdLife Finland taxonomy, show Finnish when locale is `fi`.
5. **Email confirmation** — currently OFF in Supabase Auth (dev convenience). Must be turned ON with custom SMTP before any public launch.

## Architecture

### Supabase backend
Single Supabase project shared by both apps. Database types are defined once in `shared/types/database.ts`
and should be imported from there in both apps.

#### New table template (required every time)
From May 30, 2026, new tables are not exposed to the Data API by default. Every `CREATE TABLE` must
be followed by RLS and an explicit GRANT in the same SQL block:

```sql
CREATE TABLE public.new_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  -- columns...
);

ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.new_table TO authenticated;
```

Use `GRANT SELECT ON public.new_table TO anon` as well only for read-only reference tables (e.g. `species`).
RLS policies still control row-level access — the GRANT is just the door.

### Mobile (Expo + expo-router)
- **Routing**: File-based via expo-router v6. Route groups: `app/(auth)/` and `app/(tabs)/`.
- **Auth flow**: `context/AuthContext.tsx` exposes `useAuth()` hook. Root `_layout.tsx` wraps everything
  in `<AuthProvider>` and redirects based on session state.
- **Supabase client**: `lib/supabase.ts` — uses `expo-secure-store` as the auth storage adapter.
- **TypeScript strict mode** is enabled.

### Web (Next.js App Router)
- **⚠️ Non-standard Next.js version (16.2.4)** — APIs and conventions may differ from training data.
  Before writing any Next.js-specific code, read the relevant guide in `web/node_modules/next/dist/docs/`.
- **Supabase**: Two clients — `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts`
  (server components/actions). Always use the server client in Server Components and Actions, browser
  client in Client Components.
- **Auth guard**: Handled by `src/app/dashboard/layout.tsx` (server-side redirect). There is no
  `middleware.ts` — the layout check protects all `/dashboard/*` routes.
- **Rate limiting**: `src/lib/rate-limit.ts` — Upstash Redis in production, in-memory fallback in dev.
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`, not `tailwind.config.js`).
