# Siipi — Lintubongaussovellus

A production-grade bird sighting logger built for Finnish birders. Solo full-stack project: React Native mobile app, Next.js web dashboard, and a shared Supabase backend — all in one monorepo.

**Live:** [siipi-web (Vercel)](https://birdwatch-ten.vercel.app) · Android via EAS

## Stack

| Layer | Technology |
|---|---|
| Mobile | Expo SDK 54, React Native, expo-router |
| Web | Next.js 16 (App Router), Tailwind CSS v4 |
| Backend | Supabase — PostgreSQL, Auth, Storage, Edge Functions |
| Push | Expo Push API + Firebase FCM V1 |
| Rate limiting | Upstash Redis |
| Email | Resend (SMTP) |
| Builds | EAS (Android), Vercel (web) |

## Monorepo structure

```
siipi/
├── mobile/      Expo React Native app (iOS/Android)
├── web/         Next.js web dashboard
├── shared/      TypeScript types and utilities shared by both apps
├── supabase/    Edge functions (Deno)
└── scripts/     One-time data import scripts
```

## Features

- Log bird sightings with GPS, photos, count, and notes
- 11,167 eBird species with Finnish names from IOC World Bird List v15.2
- Offline-first mobile — drafts saved locally, synced on reconnect
- Location-aware push notifications when a target species is spotted nearby
- Life list auto-maintained by database triggers
- Web dashboard: sightings table, life list, interactive map, photo gallery, species alerts
- Rate-limited auth (Upstash Redis), email confirmation, Row Level Security on all tables

## Getting started

### Web

```bash
cd web
cp .env.local.example .env.local   # fill in your Supabase + Upstash credentials
npm install
npm run dev                         # http://localhost:3000
```

### Mobile

```bash
cd mobile
cp .env.local.example .env.local   # fill in your Supabase + Maps credentials
npm install
npm start                           # scan QR with Expo Go
```

See [`CLAUDE.md`](./CLAUDE.md) for the full list of environment variables and deployment instructions.

## License

MIT
