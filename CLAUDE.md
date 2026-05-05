# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo structure

```
birdwatch/
├── mobile/   — Expo React Native app (iOS/Android)
├── web/      — Next.js web app
└── shared/   — Shared TypeScript types (shared/types/database.ts)
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
```

**Web** — create `web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Current build state

### Mobile — what exists
- Auth screens: `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`
- Auth context: `context/AuthContext.tsx` — `useAuth()` hook, session state, sign out
- Supabase client: `lib/supabase.ts`
- Root layout: `app/_layout.tsx` — wraps in `<AuthProvider>`, routes to `/(auth)` or `/(tabs)`

### Mobile — what does NOT exist yet (build next)
- `app/(tabs)/` — entire directory is missing; all tab screens are placeholder targets
- `app/sighting/[id].tsx` — sighting detail

### Web — scaffolded only
- `src/middleware.ts` — auth guard protecting `/dashboard/*`
- `src/lib/supabase/` — browser and server clients
- No route pages built yet beyond the default Next.js homepage

## Architecture

### Supabase backend
Single Supabase project shared by both apps. Database types are defined once in `shared/types/database.ts` and should be imported from there in both apps. Key tables: `sightings`, `species`, `life_list`, `photos`, `hotspots`, `species_alerts`, `user_preferences`.

### Mobile (Expo + expo-router)
- **Routing**: File-based via expo-router v6. Route groups: `app/(auth)/` (login, signup) and `app/(tabs)/` (main app — not yet scaffolded).
- **Auth flow**: `context/AuthContext.tsx` exposes `useAuth()` hook. `App.tsx` redirects to `/(tabs)/sightings` or `/(auth)/login` based on session state. The root `_layout.tsx` wraps everything in `<AuthProvider>`.
- **Supabase client**: `lib/supabase.ts` — uses `expo-secure-store` as the auth storage adapter.
- **TypeScript strict mode** is enabled.

### Web (Next.js App Router)
- **⚠️ Non-standard Next.js version (16.2.4)** — APIs and conventions may differ from training data. Before writing any Next.js-specific code, read the relevant guide in `web/node_modules/next/dist/docs/`.
- **Supabase**: Two clients — `src/lib/supabase/client.ts` (browser, `createBrowserClient`) and `src/lib/supabase/server.ts` (server components/actions, `createServerClient` with cookie store). Always use the server client in Server Components and the browser client in Client Components.
- **Auth middleware**: `src/middleware.ts` protects `/dashboard/*` routes, redirecting unauthenticated users to `/login`.
- **Styling**: Tailwind CSS v4 (PostCSS plugin approach — `@tailwindcss/postcss`, not the traditional `tailwind.config.js`).
