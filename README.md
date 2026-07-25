# TasteStack

Track everything you love — anime, manga, movies, TV, games, music, and
books — in one place, with a public profile you can share.

## Stack

Next.js 16 (App Router) + TypeScript · Tailwind + shadcn/ui · Prisma +
SQLite (local) / Postgres (production) · NextAuth (email + password) ·
Zustand for client state.

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

## Project layout

```
src/app/            Next.js routes — pages render inside a single "/" route
                     that swaps views client-side; src/app/api/ holds the
                     backend route handlers
src/components/      UI components; src/components/tastestack/ holds the
                     app's actual screens (Discover, Profile, Feed, etc.)
src/lib/             Prisma client, auth config, catalog data, external
                     API clients (AniList, Open Library, TMDB, RAWG, Last.fm)
src/store/           Zustand store for client-side navigation/session state
prisma/schema.prisma Database schema (Users, Items, Follows, Activities)
db/custom.db          Local SQLite database file (a few test accounts/items
                       are already in there from development)
```
