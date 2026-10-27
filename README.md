# The Awakening Academy

A gamified learning platform. Students are players who earn XP from lessons and assessments, level up,
and climb ranks from **F to SSS**. A rank needs both the level **and** demonstrated mastery. Each student
also grows a **class** from the subjects they study: Apprentice Mathematician → Advanced Mathematician →
Sage of Numbers, with hybrid titles like Polymath. Teachers build courses and quests. Administrators tune
the rules.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Auth) · Tailwind CSS 4 · Vercel.
Conventions live in [`.agent/follow-existing-codebase`](.agent/follow-existing-codebase/SKILL.md). Teachers: see the
[teacher guide](docs/TEACHER_GUIDE.md).

## What works (Phases 1–4)

| Area | Features |
|---|---|
| Accounts | Email sign-up/sign-in (always as a student) · admins assign roles · minimal personal data |
| Teachers | Courses (subject, join code, publish/archive) · modules · roster (add by email or join code) · **Quest Builder** for lessons (Markdown), practice quizzes, quizzes and exams: multiple choice, multiple select, true/false and short answer, with explanations, objectives, difficulty, XP within admin limits, dates, attempt limits, passing score, prerequisites, answer reveal, draft/publish checklist and student preview · results per activity (which questions the class misses) · course gradebook with "may need support" flags |
| Students | Status window (rank crest, level, XP bar, class title, promotion trial, recommended quest, course progress, recent rewards) · Quest Board · Learning Dungeon (lessons, resumable attempts, server-graded results with explanations) · reward and rank-up moments · Player Profile (subject paths, equip titles) · Chronicle (XP ledger, promotions) · notifications |
| Admins | Level formula, rank ladder and mastery gates, XP limits (with level recalculation) · users and roles · audited manual XP adjustments · audit log |
| Assessment (Phase 2) | Essay and file-upload questions with rubrics · homework · teacher grading queue with per-answer points and comments · re-grading without double XP · timed attempts graded from autosave when time runs out · feedback modes (answers now / after the due date / score only) · course question bank · feedback in the Chronicle |
| Secrets & skills (Phase 3) | Teacher Easter egg editor (hidden objects and sections in lessons, secret phrases, quest sequences, score and streak milestones, item sets, cross-course and class-wide goals; clue, lore, rarity, XP and item rewards) · student Codex with ??? silhouettes · Easter Bunny skips (confirmed, never on exams, recorded as skipped) · seven skills unlocked by level, rank and discoveries (Insight, Knowledge Echo, Time Dilation, Second Chance, Overdrive, Dungeon Sense, Guild Leader) · Inventory & Skills page · admin item and skill tuning |
| Challenges & social (Phase 4) | Boss battles in phases with a post-hand-in HP bar · learning streaks with milestone XP and a Second Chance streak shield · data-driven achievements (admin-managed, hidden ones) · guilds per course (teacher-formed, join requests, student-founded with Guild Leader) · team quests rewarding every member · weekly course leaderboards (off / initials / names, students can hide) |
| Lesson editor | Formatting toolbar and shortcuts · image upload (private, byte-checked), course image library, image links, paste/drop · YouTube/Vimeo videos (click-to-play, privacy-enhanced) · callouts · tables · full-screen side-by-side preview · reading time |
| Engine | Server-side XP ledger with idempotency keys · atomic, concurrency-safe SQL functions · RLS on every table · answer keys and rubrics never sent to students early |

The remaining phases are planned in [docs/ROADMAP.md](docs/ROADMAP.md).

## Set up

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Apply the migrations** in `supabase/migrations`, in filename order. Either:
    - paste each file into the SQL editor and run it, or
    - with the Supabase CLI: `supabase link --project-ref <ref>`, then `supabase db push`.
3. **Auth settings and emails:** follow [supabase/templates/README.md](supabase/templates/README.md). It
   covers the Site URL and redirect URLs, branded student-friendly emails whose links work on any device,
   and custom SMTP (recommended for a school). You can turn off "Confirm email" for local testing.
   All wording on the sign-in screens lives in `src/configs/authMessages.config.ts`.
4. **Environment:** copy `.env.example` to `.env.local` and fill in the three values from Project
   Settings → API.
5. **Run:** `npm install`, then `npm run dev`, then open http://localhost:3000.
6. **Make yourself an administrator.** Sign up in the app, then run this in the Supabase SQL editor:
    ```sql
    update public.profiles set role = 'admin' where email = 'you@school.edu';
    ```
    After that, promote teachers from **Administration → Users & roles**.

## Deploy to Vercel

Import the repository in Vercel (framework: Next.js) and add the three environment variables. Then add
the production `/auth/confirm` URL to Supabase's redirect list. No other services are needed.

## Try the core loop

1. As a **teacher**, create a course, add a lesson and a quiz, publish both, and copy the join code.
2. As a **student**, use **Courses → Join a course** with the code. Complete the lesson and get XP once;
   completing it again gives no more. Pass the quiz to get XP plus a high-score bonus at ≥90%.
3. Watch the level bar and the **promotion trial**. E-Rank needs level 10 *and* a 50% average on graded
   work, 1 passed assessment and 3 lessons, so adjust the gates in **Administration → Progression rules**
   to see a promotion sooner.
4. As the teacher, open the quiz's **Results** and the course's **Progress** tab.

## Scripts

| Command | What |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Vitest: pure game logic plus SQL and RLS tests (runs every migration in PGlite, an in-process Postgres) |
| `npm run typecheck` / `lint` / `format:check` | Quality gates |
| `npm run db:types` | Regenerates `src/@types/supabase/database.types.ts` from the migrations |

## How rewards stay fair

- The browser only sends choices (e.g. selected options). The server grades the answers, decides the
  rewards (`src/utils/progression.ts`), and applies them in one transaction (`award_xp` /
  `finalize_attempt`, executable only with the secret key).
- Every reward has a deterministic key (`complete:<activity>:<student>`). The ledger's unique index makes
  refreshes, double clicks and parallel tabs harmless.
- The ledger can't be edited. Corrections are new, audited `manual_adjustment` entries.
- Ranks are never taken away. Changing the level formula recalculates levels from XP.
