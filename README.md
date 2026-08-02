# TasteStack

Track everything you love — anime, manga, movies, TV, games, music, and
books — in one place, with a public profile you can share.

**Live:** [tastestack.vercel.app](https://tastestack.vercel.app)

## Stack

Next.js 16 (App Router) + TypeScript · Tailwind + shadcn/ui · Prisma +
SQLite (local) / Postgres (production) · NextAuth (email + password) ·
Zustand for session state · Vitest for unit tests.

## Features

- Track anime, manga, movies, TV, games, music, and books against a single
  rating/status/progress model, backed by free public APIs (AniList,
  Open Library, and optionally TMDB, RAWG, Last.fm).
- Custom lists with drag-to-reorder (`@dnd-kit`).
- Import an existing library from MyAnimeList (XML), Letterboxd (CSV), or
  Goodreads (CSV) exports.
- Public profile pages with per-type stats, favorites, and follows.
- Light/dark theme, profile picture upload, activity feed.
- SEO: per-profile metadata, Open Graph/Twitter cards, JSON-LD, and a
  sitemap generated from live public profiles.

## Notable engineering decisions

**URL is the source of truth for navigation.** Earlier versions kept "which
page am I on" in a Zustand field, with the whole app rendered as a single
client-side route. That meant empty HTML for crawlers and unshareable
links. Every page is now a real route under `src/app/` — the browser
handles navigation state for free, and it's crawlable and shareable by
construction. `src/store/app-store.ts` now only mirrors the signed-in user
from NextAuth, not navigation state.

**Optional data sources are detected at runtime, not build time.** TMDB,
RAWG, and Last.fm all require API keys TasteStack doesn't ship with by
default. `src/app/api/config` reports which are configured, and the UI
disables the corresponding tabs instead of failing — so the app runs fully
featured the moment a key is added to the environment, with no code
changes or redeploy logic needed.

**Large user data never touches the session cookie.** Profile pictures are
stored as compressed base64 in Postgres and fetched on demand, not stuffed
into the NextAuth JWT — cookies have a hard size ceiling, and a large
`avatarUrl` claim breaks login for everyone silently.

## Run it locally

```bash
npm install          # or: bun install
npm run db:push       # creates the local SQLite database from prisma/schema.prisma
npm run dev            # http://localhost:3000
```

A `.env` is already included with a local SQLite `DATABASE_URL` and a
generated `NEXTAUTH_SECRET`, so it runs out of the box. See `.env.example`
for what each variable does, and `DEPLOY.md` for taking this to production
(Vercel + Postgres, plus optional API keys to unlock movie/TV, game, and
music search).

## Tests

```bash
npm test          # run once
npm run test:watch # watch mode
```

Current coverage focuses on the three import parsers
(`src/lib/import/parsers.ts`) — pure functions that turn a MyAnimeList XML
export or a Letterboxd/Goodreads CSV export into TasteStack's internal
format, including edge cases like rating-scale conversion, unknown status
values, and duplicate/blank rows.

## Project layout

```
src/app/              Real Next.js routes: /discover, /login, /signup,
                       /feed, /lists, /settings, /profile/[username], etc.
                       src/app/api/ holds the backend route handlers.
src/components/        UI components; src/components/tastestack/ holds the
                       app's actual screens (Discover, Profile, Feed, etc.)
src/lib/                Prisma client, auth config, catalog data, external
                       API clients (AniList, Open Library, TMDB, RAWG,
                       Last.fm), and the import-format parsers.
src/store/              Zustand store — just the signed-in user, mirrored
                       from the NextAuth session.
prisma/schema.prisma   Database schema (Users, Items, Lists, Follows,
                       Activities).
db/custom.db            Local SQLite database file (a few test accounts/
                       items are already in there from development).
```
