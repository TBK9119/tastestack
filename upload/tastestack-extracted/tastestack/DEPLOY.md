# Deploying TasteStack

TasteStack runs locally on SQLite with zero setup. Going live needs two
changes: a real Postgres database, and a few environment variables set on
your hosting platform. Below is the exact path for Vercel + Supabase, which
is what the project was scaffolded for — but any Postgres host (Neon,
Railway, Vercel Postgres) works the same way.

## 1. Create a Postgres database

**Supabase** (free tier is plenty to start):
1. Create a project at https://supabase.com.
2. In your project, go to **Settings → Database → Connection string** and
   copy the **URI** (use the "Session pooler" or "Transaction pooler" string
   for serverless platforms like Vercel — not the direct connection).

You'll get something like:
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres
```

## 2. Switch the schema from SQLite to Postgres

In `prisma/schema.prisma`, change one line:

```prisma
datasource db {
  provider = "postgresql"   // was "sqlite"
  url      = env("DATABASE_URL")
}
```

No model changes are needed — the schema was written to be portable.

## 3. Push the schema to your new database

With `DATABASE_URL` in your shell pointing at the new Postgres instance:

```bash
npx prisma db push
```

This creates all the tables (`users`, `items`, `follows`, `activities`) in
Postgres. Run this once before your first deploy, and again any time you
change `schema.prisma`.

## 4. Generate a production AUTH_SECRET

Don't reuse the one in `.env.local`. Generate a fresh one:

```bash
openssl rand -base64 32
```

## 5. Set environment variables on Vercel

Push this repo to GitHub, then import it at https://vercel.com/new. Before
the first deploy (or right after, then redeploy), set these under
**Project Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | your Supabase connection string from step 1 |
| `AUTH_SECRET` | the value you generated in step 4 |
| `NEXTAUTH_URL` | your production URL, e.g. `https://tastestack.vercel.app` |

Optional, only if you want live search for movies/TV, games, or music (see
README for where to get each free key):

| Variable | Unlocks |
|---|---|
| `TMDB_API_KEY` | Movies & TV |
| `RAWG_API_KEY` | Games |
| `LASTFM_API_KEY` | Music |

Anime, manga, and books already work with no key (AniList and Open Library
are public APIs).

## 6. Deploy

Vercel builds automatically on push. The `postinstall` script in
`package.json` already runs `prisma generate` on every install, so the
Prisma Client is always in sync with your schema.

## Notes

- **`prisma db push` vs migrations**: this project uses `db push` for
  simplicity (no migration history). That's fine for a small/solo project.
  If you want proper migration history later, switch to
  `prisma migrate dev` locally and `prisma migrate deploy` in your build
  command.
- **Re-seeding**: there's no seed script yet — the first users/items are
  whatever real people create through the app itself.
- **Custom domain**: once deployed, update `NEXTAUTH_URL` to match if you
  attach a custom domain, or auth callbacks will point at the wrong host.
