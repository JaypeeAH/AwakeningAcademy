# Operations guide

How to run The Awakening Academy safely in production: configuration, security settings, privacy
requests, monitoring, and backups.

## 1. Environment variables

Set these in Vercel under **Project → Settings → Environment Variables**, and in `.env.local` for local
development. Redeploy after changing them.

| Variable | Required | What it does |
|---|---|---|
| `SUPABASE_URL` | Yes | Your Supabase project URL. It also sets the one outside address browsers may upload files to (CSP). |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Used for the signed-in user's session. |
| `SUPABASE_SECRET_KEY` | Yes | Server only. Never share it or commit it. |
| `ANTHROPIC_API_KEY` | No | Turns on **AI question drafts** in the Quest Builder. |
| `AI_DRAFT_MODEL` | No | Overrides the drafting model. The default is `claude-opus-5-5`. |
| `AI_DRAFTS` | No | Set to `off` to disable drafting even when a key is present. |
| `ERROR_WEBHOOK_URL` | No | A Slack, Discord or other webhook that receives a short alert for each unexpected error. |

## 2. Database migrations

Run every file in `supabase/migrations` in name order in the Supabase SQL editor. Each file runs once.
Never edit a migration that has already been applied; add a new one instead.

The two `…_enums.sql` files must run on their own, before the migration that follows them. Postgres
can't use a new enum value in the same transaction that adds it.

## 3. Security settings

- **Rate limits.** These are enforced by the database (`hit_rate_limit`), so they hold across every
  Vercel instance. Edit them in `src/server/security/rateLimit.ts`.

  | Action | Limit |
  |---|---|
  | Sign-in | 20 per 5 min per device, 8 per 5 min per account |
  | Sign-up | 6 per hour per device |
  | Password and confirmation emails | 6 per 15 min per device, 3 per 15 min per address |
  | Password reset | 10 per 15 min per device |
  | Hand-ins | 30 per minute per student |
  | Secret phrases | 10 per minute per student |
  | Secret markers | 30 per minute per student |
  | AI drafts | 10 per hour and 40 per day per teacher |
  | Data export | 5 per hour per person |
  | Browser error reports | 20 per minute per device |

  Devices and email addresses are stored only as hashes. If the limiter itself fails, requests are
  allowed and the failure is logged. Students are never locked out by an outage.
- **Content-Security-Policy and other headers.** These are set in `next.config.ts`:
    - Scripts and styles load from this site only.
    - Images may come from any `https` address, because teachers link lesson pictures.
    - Frames are allowed only for YouTube's privacy-enhanced player and Vimeo.
    - Uploads go only to your Supabase project.
    - HSTS is on in production.
    - If you add a new outside service, add it to the policy there.
- **Minors' privacy:**
    - Leaderboards are off by default and show only weekly XP.
    - Students can hide themselves from leaderboards.
    - Videos load only after a student presses play.
    - Lesson images and homework are private to the course.

## 4. Monitoring errors

- **Every unexpected error is logged** as one JSON line with `"event":"app_error"` and a short
  `reference` code. This covers API errors and errors in the browser.
    - Users see the reference in the error message, so they can quote it.
    - Search for it in **Vercel → Project → Logs**.
- **Alerts:** to be alerted, set `ERROR_WEBHOOK_URL` to an incoming webhook (Slack, Discord, Microsoft
  Teams via a workflow, or an alerting tool). It receives the reference, path and error message. It
  never receives user IDs, emails or request bodies.
- **Sentry (optional):** to use Sentry instead, install `@sentry/nextjs` and call it from
  `src/server/observability/reportError.ts`, which is the one place every error passes through.

## 5. Privacy requests

- **A person's data.** Students and teachers can download everything stored about them as a JSON file
  from **Player Profile → Your data**. An administrator can download anyone's from **Administration →
  Users & roles** (the download is recorded in the audit log).
- **Deleting an account.** **Administration → Users & roles → Delete account** permanently removes:
    - the account and profile
    - XP, levels and ranks
    - enrolments, attempts, answers and uploaded homework files
    - rewards, inventory, skills, discoveries, achievements, streaks and guild memberships
    - notifications

  Courses and activities a teacher created stay, with no creator recorded, so students keep their
  classes. The deletion is recorded in the audit log, which keeps only the account id and its role.
  An administrator can't delete their own account this way.

## 6. AI question drafts

1. **Turn it on:** add `ANTHROPIC_API_KEY` to the environment variables and redeploy.
2. **How teachers use it:** in the Quest Builder, they choose **Draft with AI**, pick a lesson or paste
   text, and choose the number of questions, types, difficulty and objectives.
3. **Review is required:** drafts arrive unsaved and marked **AI draft**. The activity can't be published
   until the teacher has reviewed each one.
4. **Usage is logged:** every request is recorded in `ai_draft_requests` (teacher, course, model,
   tokens, outcome), and limited per teacher (see section 3).
5. **What's sent:** only the lesson text or pasted text and the teacher's choices go to the AI provider.
   No student data is sent.

## 7. Backups and restore

**What to back up:**
1. **The database.**
    - Supabase takes daily backups on paid plans (**Database → Backups**). Point-in-time recovery is an
      add-on.
    - On the free plan, take your own: `supabase db dump --db-url "$DATABASE_URL" -f backup.sql`, or
      `pg_dump` with the connection string from **Project Settings → Database**.
    - Do this before each term and before running new migrations.
2. **Storage.** Homework uploads live in the private `submissions` bucket and lesson images in
   `lesson-media`. Database backups don't include files. Copy the buckets with the Supabase CLI
   (`supabase storage cp -r ss:///submissions ./submissions-backup`) or the Storage API.
3. **Configuration.** Keep a private copy of the environment variables and of
   `supabase/templates/*.html` (the email templates).

**Restore:**
1. Create or choose the target Supabase project.
2. Restore the SQL dump with `psql "$DATABASE_URL" -f backup.sql`, or use the dashboard's restore for
   managed backups.
3. Copy the storage buckets back.
4. Set the environment variables in Vercel to the restored project and redeploy.
5. Check sign-in, a lesson, a quiz hand-in and a homework download.

**Practice a restore once a term** on a spare project, so you know it works before you need it.

## 8. Tests

| Command | What it runs |
|---|---|
| `npm test` | Unit tests and database tests (PGlite: the real migrations in memory) |
| `npm run test:e2e` | Playwright end-to-end tests of the 15 acceptance workflows, against a running app |
| `npm run lint`, `npm run typecheck`, `npm run build` | The checks to run before deploying |

The end-to-end tests create test accounts (`zz-e2e-…@example.com`) and delete them afterwards. Run them
against a non-production Supabase project when you can.

**Demo data:** `ALLOW_DEMO_SEED=true npm run seed:demo -- --yes` creates a demo course with 12 students
for exploring Analytics, and `-- --clean` removes it. It's for development only; it is never part of
the migrations.
