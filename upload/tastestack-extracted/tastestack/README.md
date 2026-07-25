# TasteStack

**TasteStack is one profile for everything you are into.** It brings anime, manga, films, television, games, music, and books into one public, shareable culture profile.

## What it does

- Creates a personal profile at `/u/[username]` with media stats and favourite picks.
- Lets people discover titles across seven media types and add them as planned, in progress, completed, on hold, or dropped.
- Live-searches anime & manga (AniList) and books (Open Library) with real cover art — no API key needed. Movies/TV, games, and music currently use a small curated preview until you add a free TMDB / RAWG / Last.fm key (see **Live search** below).
- Lets you rate (0–10), track progress, write a short review, favourite, or remove any title straight from your profile.
- Follow other users and see their activity — additions, ratings, completions, favourites, and reviews — in your feed alongside your own.
- Supports public/private profiles and editable profile details.
- Keeps the experience deliberately lightweight and useful without asking users to maintain separate accounts for every hobby.

## Live search

| Media | Provider | Needs a key? |
|---|---|---|
| Anime, Manga | AniList | No |
| Books | Open Library | No |
| Movies, TV | TMDB | Yes — `TMDB_API_KEY` |
| Games | RAWG | Yes — `RAWG_API_KEY` |
| Music | Last.fm | Yes — `LASTFM_API_KEY` |

All five providers are wired up in `src/lib/api/`. Anime, manga, and books
work immediately. Movies/TV, games, and music light up automatically the
moment you add the matching key to `.env.local` — no code changes needed.
Until then, Discover shows a curated preview for those types with an
in-app note telling you which env var to set.

> **Note on Last.fm covers:** Last.fm's album-search endpoint sometimes
> returns a blank placeholder image instead of real cover art — that's a
> known quirk of their API, not a bug here.

## Built with

- Next.js 14, React, and TypeScript
- Tailwind CSS
- Prisma and SQLite for local development
- NextAuth credentials authentication
- Codex with GPT-5.6 for product design, implementation, debugging, and production-build verification

## Run locally

### Prerequisites

- Node.js 20+
- npm

### Setup

1. Clone the repository and open the `tastestack` directory.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local` and set the required values. For local SQLite development, use a `DATABASE_URL` such as `file:./prisma/dev.db`, set `NEXTAUTH_URL=http://localhost:3000`, and generate a secure `AUTH_SECRET`.
4. Create/update the local database:

   ```bash
   npm run db:push
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

6. Visit `http://localhost:3000`, create an account, then use **Discover** to build a stack.

## Project structure

- `src/app` — pages and API routes
- `src/components` — shared interface components
- `src/lib/catalog.ts` — curated cross-media discovery catalog
- `prisma/schema.prisma` — profile, media, social, and activity data model

## How Codex and GPT-5.6 were used

Codex with GPT-5.6 accelerated the build from an initial Next.js starter to a complete product flow: it designed the responsive interface, implemented the discovery and profile experiences, added authenticated persistence for items and settings, and ran production builds to validate TypeScript and route integration. Human direction defined the product vision: a MyAnimeList-inspired profile that represents all hobbies rather than only anime.

## Verification

The production build passes:

```bash
npm run build
```

## Deploying

See [`DEPLOY.md`](./DEPLOY.md) for the exact steps to move from local SQLite
to a production Postgres database on Vercel.

## Roadmap

- Richer per-status list views (e.g. a dedicated "Watching" tab per media
  type) — `getItemsByType()` in `src/lib/profile.ts` already groups items by
  status and is ready to power this.
- The TMDB/RAWG/Last.fm fetchers are written but untested against live
  traffic (no keys were available in the dev environment that built them) —
  worth a quick manual smoke test once you add your own keys.
