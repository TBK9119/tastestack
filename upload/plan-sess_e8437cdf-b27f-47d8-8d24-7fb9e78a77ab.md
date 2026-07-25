## TasteStack — Final Build Plan (Build Now, Accounts Later)

### Workflow
**Phase A — Build the entire app locally** → no accounts needed, runs on your machine
**Phase B — Go live** (later, ~15 min) → create GitHub + Vercel + Supabase + 3 API keys, swap config

Everything below is Phase A. Phase B is a quick cutover at the end.

---

### Tech stack
- **Next.js 14** (App Router) + **TypeScript** — full-stack React
- **TailwindCSS** — styling (recreates the mockup look)
- **Prisma** ORM + **SQLite** (local file `prisma/dev.db`) — zero-config database
- **NextAuth.js** (Credentials provider) — local auth for dev (email+password stored in SQLite)
- All code lives in `C:\Users\thavb\ZCodeProject\tastestack\`

### API integrations
| Medium | API | Status during build |
|---|---|---|
| Anime + Manga | **AniList** (GraphQL, no key) | ✅ Fully working |
| Books | **OpenLibrary** (no key) | ✅ Fully working |
| Movies + TV | TMDB | ⚙️ Coded, shows "add key" prompt |
| Games | RAWG.io | ⚙️ Coded, shows "add key" prompt |
| Music | Last.fm | ⚙️ Coded, shows "add key" prompt |

API keys stored in `.env.local` (gitignored). When you add real keys later, the 3 locked tabs instantly work — no rebuild.

---

### Database schema (Prisma + SQLite)
```
User      id, email, passwordHash, username (unique), displayName,
          bio, avatarUrl, bannerColor, isPublic, createdAt

Follow    followerId → User, followingId → User (unique pair)

Item      id, userId, type, apiId, source, title, coverUrl, year,
          extra (Json), status, rating, progressCurrent,
          progressTotal, review, isFavorite, createdAt, updatedAt

Activity  id, userId, itemId, action, createdAt
```

The schema is identical to what Supabase/Postgres will use, so Phase B migration is a one-line provider swap in `prisma/schema.prisma` + re-push.

---

### Project structure
```
tastestack/
├── prisma/
│   ├── schema.prisma          # DB schema
│   └── dev.db                 # SQLite file (auto-created)
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (nav, theme)
│   │   ├── page.tsx           # Landing page
│   │   ├── (auth)/signup/     # Signup
│   │   ├── (auth)/login/      # Login
│   │   ├── discover/page.tsx  # Search & add items
│   │   ├── dashboard/page.tsx # Private edit view
│   │   ├── feed/page.tsx      # Activity feed (follows)
│   │   ├── settings/page.tsx  # Edit profile
│   │   └── [@username]/       # Public profile (mockup layout)
│   ├── components/            # UI components (ItemCard, AddModal, etc.)
│   ├── lib/
│   │   ├── db.ts              # Prisma client
│   │   ├── auth.ts            # NextAuth config
│   │   └── api/
│   │       ├── anilist.ts     # ✅ working now
│   │       ├── openlibrary.ts # ✅ working now
│   │       ├── tmdb.ts        # ⚙️ key-gated
│   │       ├── rawg.ts        # ⚙️ key-gated
│   │       └── lastfm.ts      # ⚙️ key-gated
│   └── app/api/               # Server routes (search, items, follow)
├── .env.local                 # API keys (gitignored)
├── .env.example               # Template for keys
├── package.json
└── tailwind.config.ts
```

---

### Features built in v1
1. Email + password signup/login
2. Universal search (auto-detects medium from active tab)
3. Add-to-list modal: status, 1–10 rating, progress tracking, favorite toggle, review
4. Status buckets per medium (Watching / Completed / Planned / Dropped / On-Hold)
5. **Public profile pages** at `/@username` (the mockup layout, now dynamic)
6. Follow / unfollow + follower counts
7. Activity feed of followed users
8. Profile stats bar + favorites showcase
9. Profile editing (avatar URL, bio, banner color, username)
10. Fully responsive (phone/tablet/desktop)

---

### Build phases (I execute in this order, you test after each)
**Phase 0 — Scaffold** → Next.js + Tailwind + Prisma + SQLite + NextAuth wired. Empty app boots on `localhost:3000`.

**Phase 1 — Auth + profile shell** → signup/login working; empty `/@username` page renders with mockup styling.

**Phase 2 — Anime end-to-end** → AniList search, add items, anime tab on profile shows them in status buckets. **(First fully-working flow — you can test the whole loop.)**

**Phase 3 — Books end-to-end** → OpenLibrary search + books tab working.

**Phase 4 — Movies/Games/Music code** → Full code written; tabs show "Add your free API key in Settings" until keys added.

**Phase 5 — Social layer** → follow/unfollow buttons, `/feed` activity page, follower counts.

**Phase 6 — Polish** → profile editing, stats refinements, empty states, loading spinners, error handling, SEO metadata for public profiles.

---

### Phase B (later, when you want to go live)
1. You create: GitHub, Vercel, Supabase accounts + 3 API keys (~25 min)
2. I swap `prisma/schema.prisma` provider from `sqlite` → `postgresql` with your Supabase URL
3. Push schema to Supabase, redeploy on Vercel
4. Live at `tastestack.vercel.app`

---

### What I need from you now
Nothing. You said "build all things first" — so I will. Sit back, direct feature tweaks as we go, and test on `localhost:3000` after each phase.

**Approve and I'll start Phase 0 immediately.**