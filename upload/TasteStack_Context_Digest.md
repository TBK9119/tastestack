# TasteStack — ZCode Session Context Digest

**Source:** ZCode session `sess_e8437cdf-b27f-47d8-8d24-7fb9e78a77ab`, model GLM-5.2, 86 API turns, spanning July 18–19, 2026 (~20 hrs elapsed, ~10 hrs active work)
**Purpose of this doc:** carry the *decisions, reasoning, and outcomes* from that session into a new context (e.g. this Claude conversation) without re-uploading the raw logs or project files.

---

## 1. What TasteStack is

A personal media/hobby tracker, explicitly modeled on **MyAnimeList** but multi-medium: one profile that tracks anime/manga, movies/TV, games, music, and books in one place — status buckets (Watching/Completed/Planned/Dropped), ratings, favorites, progress tracking. The user has no coding background beyond basic HTML/CSS, so ZCode was directed to build 100% of the code while the user made product/scope decisions.

Working directory on the user's machine (Windows, Git Bash): `C:\Users\thavb\ZCodeProject\tastestack\`

---

## 2. Decision timeline (the important pivots)

The scope changed twice — worth knowing so nobody re-litigates settled questions or gets confused about *why* the stack is what it is.

| # | Decision point | Answer given | Effect |
|---|---|---|---|
| 1 | Media types for v1 | Anime+Manga, Movies+TV, Music — **must be free APIs, no copyright risk** | Ruled out anything requiring paid keys or hosting copyrighted media |
| 2 | Coding involvement | No experience, HTML/CSS basics only | ZCode writes 100% of code |
| 3 | How to start | Static demo/mockup first | Built a single-file HTML mockup before any real build |
| 4 | Naming | **TasteStack** | Rebranded mockup + renamed project folder |
| 5 | Who uses it (1st ask) | "Personal now, social later" | Started scoping a simple localStorage-only build |
| 6 | Where it lives (1st ask) | Local machine only | Plan A = single HTML file, no server, no accounts |
| → | **Plan A presented ("Real Working Version")** | **Rejected by user** | User explicitly asked the who/where/involvement questions to be **re-asked** |
| 5b | Who uses it (2nd ask) | **Multi-user social platform** | Reversal — now needs real backend, DB, auth |
| 6b | Where it lives (2nd ask) | **Free cloud hosting** (Vercel) | Reversal — now needs a deployable full-stack app |
| → | **Plan B presented ("Full Build Plan")**: Next.js + Supabase + Vercel, GitHub-based | Plan approval was interrupted by a tool error before the user could respond | Re-planned rather than resubmitted verbatim |
| 7 | Social scope | "Medium social" (profiles + follow/unfollow + feed, not full comments/curation) | Follow system + activity feed included in scope; comments/curated lists explicitly deferred |
| 8 | Profile visibility | Public by default (like MAL/Letterboxd) | No login required to view a profile |
| 9 | Domain | Free `.vercel.app` | No custom domain purchase |
| 10 | **Sequencing** | "Build all things first, accounts later" | Key decision: **local-first build**, cloud accounts (GitHub/Vercel/Supabase/API keys) deferred to a later "Phase B" cutover |
| 11 | Local DB choice | SQLite (not Docker Postgres) | Zero-install, swaps to Supabase Postgres later via a one-line Prisma provider change |
| 12 | Demo-ready media during local build | Anime (AniList) + Books (OpenLibrary) — both keyless APIs | These two are fully working without any signup; Movies/Games/Music are coded but key-gated |
| 13 | GitHub push | **Explicitly told: do not push to GitHub** ("dont push this files to github" → later softened to "after seeing website, then we can push") | Everything stays local-only for now; `.gitignore` already protects secrets for whenever pushing does happen |

**Net result:** the shipped plan is **"Final Build Plan (Build Now, Accounts Later)"** — a multi-user social architecture (Next.js/Prisma/NextAuth) but running entirely on local SQLite with zero cloud accounts, designed so the later move to Supabase/Vercel is a small config swap, not a rewrite.

---

## 3. Approved architecture (as currently being built)

**Stack:** Next.js 14 (App Router) + TypeScript + TailwindCSS + Prisma ORM + SQLite (local) + NextAuth.js (Credentials provider, email+password)

**External APIs:**
| Medium | API | Key needed | Status |
|---|---|---|---|
| Anime/Manga | AniList (GraphQL) | No | Fully working during local build |
| Books | OpenLibrary | No | Fully working during local build |
| Movies/TV | TMDB | Yes (free) | Coded, shows "add key in Settings" prompt |
| Games | RAWG.io | Yes (free) | Coded, key-gated |
| Music | Last.fm | Yes (free) | Coded, key-gated (switched from an earlier MusicBrainz suggestion — Last.fm has built-in cover art) |

**Data model (Prisma schema, 7 tables):** User, Item, Follow, Activity, Account, Session, VerificationToken. `Item` carries `type`, `source`, `status` (watching/completed/planned/dropped/onhold), `rating` (0–10), `progressCurrent/Total`, `review`, `isFavorite` — this is the same shape planned for the eventual Postgres/Supabase migration.

**Routes planned:** `/`, `/signup`, `/login`, `/discover`, `/dashboard`, `/u/[username]` (public profile), `/feed`, `/settings`.

**Phase B (deferred, not yet started):** create GitHub + Vercel + Supabase accounts + 3 API keys → swap Prisma provider `sqlite → postgresql` → push schema → redeploy. Estimated ~15–25 min when the user is ready.

---

## 4. Build progress & current state

**Phase 0 — Scaffold: ✅ Complete and verified**
- Next.js/TypeScript/Tailwind/Prisma/NextAuth scaffolded, ~20 files written (config, `.env`/`.env.local`/`.env.example`, Prisma schema, auth config, landing/login/signup/dashboard/settings/feed/discover pages, navbar, placeholder profile route).
- `npm install` succeeded (Next.js bumped from 14.2.18 → 14.2.35 to patch a known security vuln flagged during install).
- SQLite DB created and synced (`prisma/dev.db`).
- Dev server verified running at `http://localhost:3000` — landing, `/login`, `/signup` all returned HTTP 200.
- A full backup of Phase 0 was made at `C:\Users\thavb\ZCodeProject\tastestack-backups\phase-0\` (excludes `node_modules`, `.next`, `dev.db` — regenerable). This backup pattern is meant to repeat before each phase.

**Phase 1 — Auth + public profile shell: 🔄 In progress**
- `src/lib/profile.ts` (profile data-fetching helper) written.
- `src/components/Avatar.tsx` (avatar with image/initial fallback) written.
- Session log ends here — this is exactly where the screenshot's progress tracker ("Phase 1 — Auth + public profile shell, 1/7") reflects the cutoff.

**Phases 2–6 (Anime end-to-end, Books end-to-end, Movies/Games/Music, Social layer, Polish):** not yet started.

---

## 5. Problems hit during the build, and how they were resolved

Useful if similar issues resurface:

1. **Plan mode couldn't run environment checks** — `EnterPlanMode` blocks all non-read-only tools, so a Node/npm/git version check had to be deferred until after plan approval.
2. **Node.js / npm not installed** — blocked all further work. Resolved with manual click-by-click Node LTS install instructions; verified after user confirmed install (`node v24.18.0`, `npm 11.16.0`).
3. **Next.js 14.2.18 flagged with a security vulnerability** on install — immediately patched to `14.2.35`.
4. **Prisma couldn't find `DATABASE_URL`** — Prisma doesn't read Next.js's `.env.local` convention; fixed by adding a plain `.env` with just the (non-secret, local-only) `DATABASE_URL`.
5. **`.gitignore` iteration** — briefly gitignored `.env.example` by mistake, then corrected so the *template* file (no secrets) stays committable while `.env`/`.env.local` (real secrets) stay excluded.
6. **Backup via `rsync`/`robocopy` failed** — `rsync` isn't available on Windows; a `robocopy` call via `cmd.exe` silently failed (0-byte result) due to Git Bash path translation issues. Fixed by switching to a native **PowerShell** `Copy-Item` script, which worked and was verified (17 source files + configs present, `node_modules`/`.next`/db excluded, ~261 KB).
7. **Dev server had to be stopped before backing up** — Windows file locks on a running Next.js process would have corrupted a live copy; server was stopped, backed up, then restarted.

---

## 6. Standing constraints / preferences to carry forward

- **No GitHub push** until the user has seen and approved the working site — currently local-only, no git remote.
- **No cloud accounts yet** (GitHub/Vercel/Supabase/API keys) — explicitly deferred to "Phase B," triggered only when the user says so.
- User has **no coding background** — explanations should stay plain-language first, code second; ZCode has been writing all code and only asking product/scope questions.
- Snapshot-before-each-phase backup pattern was adopted (`tastestack-backups/phase-0/`, presumably `phase-1/` etc. going forward) — worth continuing if picking this up elsewhere.
- Environment: Windows, Git Bash (MINGW64), paths like `C:\Users\thavb\ZCodeProject\tastestack\`.

---

## 7. Where to pick up

If continuing this build in a new context: Phase 1 (auth + public profile shell) is partway done — `profile.ts` and `Avatar.tsx` exist; the actual `/u/[username]` profile page (banner, avatar, stats bar, per-medium tabs, status sections) still needs to be built out, then Phase 2 (AniList-backed anime tracking, the first fully working end-to-end flow) is next.
