# Deploying TasteStack

TasteStack runs locally on SQLite with zero setup. Going live needs two
changes: a real Postgres database (SQLite's a single file, and most hosts —
including Vercel — don't give you a writable, persistent filesystem), and a
few environment variables set on your host. Below is the path for
**Vercel + Supabase**, which is what this project was planned for, but any
Postgres host (Neon, Railway, Vercel Postgres) works the same way.

## 1. Push the code to GitHub

```bash
git remote add origin https://github.com/<you>/tastestack.git
git push -u origin main
```

(If you've been working in a sandbox/cloud IDE, download or export the
project first, then run the above from your own machine or a fresh clone.)

## 2. Create a Postgres database

**Supabase** (free tier is plenty to start):
1. Create a project at https://supabase.com.
2. Go to **Settings → Database → Connection string** and copy the **URI** —
   use the "Session pooler" or "Transaction pooler" string for serverless
   platforms like Vercel, not the direct connection.

You'll get something like:
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres
```

## 3. Switch the schema from SQLite to Postgres

In `prisma/schema.prisma`, change one line:

```prisma
datasource db {
  provider = "postgresql"   // was "sqlite"
  url      = env("DATABASE_URL")
}
```

No model changes are needed — the schema was written to be portable.

## 4. Push the schema to your new database

With `DATABASE_URL` in your shell pointing at the new Postgres instance:

```bash
npx prisma db push
```

This creates all the tables (`users`, `items`, `follows`, `activities`, plus
the NextAuth tables) in Postgres. Run this once before your first deploy,
and again any time you change `schema.prisma`.

## 5. Generate a production secret

Don't reuse the one in your local `.env` — generate a fresh one:

```bash
openssl rand -base64 32
```

## 6. Import into Vercel and set environment variables

Import the repo at https://vercel.com/new. Before the first deploy (or
right after, then redeploy), set these under
**Project Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | your Supabase connection string from step 2 |
| `NEXTAUTH_SECRET` | the value you generated in step 5 |
| `NEXTAUTH_URL` | your production URL, e.g. `https://tastestack.vercel.app` |

Optional — only if you want live search for movies/TV, games, or music
(anime, manga, and books already work with no key, since AniList and Open
Library are public APIs):

| Variable | Unlocks | Get a free key at |
|---|---|---|
| `TMDB_API_KEY` | Movies & TV | https://www.themoviedb.org/settings/api |
| `RAWG_API_KEY` | Games | https://rawg.io/apidocs |
| `LASTFM_API_KEY` | Music | https://www.last.fm/api/account/create |

These are read by `/api/config`, which tells the Discover page which tabs
can live-search — so adding a key later just works, no code changes needed.

## 7. Deploy

Vercel builds automatically on push. `npm run build` now runs
`prisma generate` first (via the `build` and `postinstall` scripts in
`package.json`), so the Prisma Client is always in sync with your schema —
nothing extra to configure.

## Notes

- **`prisma db push` vs migrations**: this project uses `db push` for
  simplicity (no migration history). Fine for a small/solo project. For
  proper migration history later, switch to `prisma migrate dev` locally
  and `prisma migrate deploy` in your build command.
- **Re-seeding**: there's no seed script — the first users/items are
  whatever real people create through the app itself. If you want to keep
  the 3 local test accounts, you'd need to export them from the SQLite file
  and insert them into Postgres manually; easiest is just to sign up fresh.
- **Custom domain**: once deployed, update `NEXTAUTH_URL` to match, or auth
  callbacks will point at the wrong host.
- **Rotate the secret if this repo was ever pushed with `.env` committed.**
  This project's `.env` was previously tracked in git history before this
  fix — if you push this repo publicly, treat the old `NEXTAUTH_SECRET`
  value as burned (the fresh one in `.env` now, generated during this
  fix, was never committed).
