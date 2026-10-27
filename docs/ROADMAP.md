# Roadmap: improved phase prompts

**Status:** Phases 1 (foundation and progression engine), 2 (assessment depth), 3 (skills, inventory,
Easter eggs and the Easter Bunny) and 4 (boss battles, team quests, achievements, guilds and leaderboards)
are built. The lesson editor also gained a toolbar, images (upload, course library, link) and YouTube/Vimeo
videos. Phase 2 also added sign-up with a class code, password reset,
and any-device email links. Each later phase below is a ready-to-use prompt,
tied to the code that now exists. Paste one into a new session. Every prompt assumes the
`follow-existing-codebase` skill, which has the rules on layers, security, reuse and styling.

Changes from the original brief:

- **Decide in TypeScript, apply in SQL.** Every new mechanic gets a pure decision function with unit
  tests, plus a service-role SQL function with PGlite tests.
- **Rewards need idempotency keys.** Each new reward or consumption names its key up front.
- **Subject classes.** Students grow a class per subject (and hybrid titles), driven by subject XP *and*
  mastery, so titles mean something.
- **Learning first.** Every report leads with learning signals. XP and rank appear as engagement only.
- **Smaller vertical slices.** Each phase ends with acceptance checks you can run.

---

## Phase 2: Assessment depth — ✅ done

What was built, for reference:

- Migration `20261027000300_assessment_depth.sql`:
    - `grade_attempt`, `save_attempt_draft`, `refresh_completion`, the `submissions` bucket and
      `attempt_files`, `bank_questions`, `feedback_mode` and `time_limit_minutes`
    - rubrics on `question_keys`
- Logic in `src/utils/`: `manualGrading.ts`, `fileTypes.ts`, `feedback.ts`, `timing.ts` and
  `questionBank.ts`.
- Pages: `/grading` (queue), `/grading/[attemptId]` (grader), the Question bank tab, and the
  Chronicle → Feedback tab.
- Uploads go from the browser straight to storage through a one-time signed URL; Vercel limits function
  request bodies to 4.5 MB. The server then checks the stored bytes.

The original prompt is kept below for reference.

```
Extend The Awakening Academy's Quest Builder and grading. Follow the follow-existing-codebase skill.

Build on what exists: activities/questions/question_keys/attempts/attempt_responses, gradeAttempt
(src/utils/grading.ts, essays already return pending_review), finalize_attempt, save_activity_content,
the Quest Builder (src/components/activities/editor) and results pages.

Implement:
1. Essay questions in the builder (rubric text + points) and "homework" activities with file upload
   (Supabase Storage, private bucket, signed URLs, max size/type validation on the server, virus-safe
   content types only).
2. Manual grading: attempts with pending answers get status 'pending_review' and NO rewards. Teachers
   grade per answer (points + feedback) in a grading queue. A new SQL function `grade_attempt`
   (service role) records grades, sets the final score/pass, upserts activity_completions and applies
   rewards via apply_awards with the SAME idempotency keys as auto-graded work. Audit every grade change.
   Re-grading never double-awards.
3. Timed assessments: `time_limit_minutes` on activities. start_attempt stores `expires_at`. Submissions
   after expiry (+ a short grace period) are auto-finalised with what was saved. The server is the clock.
   Students see a countdown that respects reduced motion.
4. Question bank: reusable questions per course (tags, objectives, difficulty). "Add from bank" copies
   into an activity (copies, so editing never changes graded history).
5. Feedback settings: show score only / answers after due date / answers immediately.
6. Student view of teacher feedback in the attempt result and the Chronicle.

Tests: pure grading rules (rubric totals, pass after manual grade); PGlite tests for grade_attempt
(idempotent re-grade, no double XP, rank evaluation after grading), timed expiry, RLS on uploads.
Acceptance: a teacher grades an essay, the student sees feedback and receives XP once, and a
re-grade changes the score without new XP.
```

## Phase 3: Skills, inventory, Easter eggs and the Easter Bunny — ✅ done

Built as specified, with these decisions:

- Migrations `20261028000100_phase3_enums.sql` (the `skill_bonus` XP source) and
  `20261028000200_skills_inventory_secrets.sql`.
- Skill effects are worked out in `server/actions/skills` and recorded once by `use_skill`. Insight removes one
  wrong option on practice quizzes. Knowledge Echo points to a completed lesson, preferring a prerequisite.
  Time Dilation adds minutes to a timed attempt, once per attempt. Second Chance gives one extra attempt, but
  only once every attempt is used. Overdrive is armed before a quest the student hasn't completed, and its
  bonus is paid with the first pass. Dungeon Sense reveals a clue or a nudge, never the answer. Guild Leader
  is passive and kept for Phase 4.
- Secrets: hidden objects and hidden sections are Markdown links in lessons (`[✦](secret:KEY)`,
  `[](secret-seen:KEY)`). Phrases are stored only as salted SHA-256. Automatic triggers are checked after
  lesson completion, submission, grading and item gains.
- Streak days were first counted in a `SCHOOL_TIMEZONE` env var; Phase 4 replaced it with the admin time zone setting.

Original prompt:

```
Implement skills, inventory and a data-driven Easter egg engine. Follow the follow-existing-codebase skill.
Integrate with the existing progression engine (award_xp, apply_awards, evaluate_rank). Do not create a
second XP system.

Data (new migration): item_definitions (consumable/collectible, rarity, effect), inventory_items
(student, item, charges ≥ 0, unique per student+item), inventory_transactions (append-only, unique
idempotency_key, +/− charges, reason, attempt/question refs), skill_definitions (unlock requirements as
data, charges, cooldown, eligible activity kinds, allowed_in_formal_assessments, affects_score/xp),
student_skills, skill_usages, easter_eggs (trigger type + JSON config validated by zod, rarity,
visibility, clue text, reward list), egg_discoveries (unique per student+egg), activity settings
`allow_skills` and `allow_bunny_skips`.

Engine: a pure `evaluateTrigger(trigger, context)` per trigger type (visit lesson section, activity
sequence, hidden object id, secret phrase (hash compared server-side), score/streak milestone, item
combination, cross-course challenge, class-wide count). Discovery is claimed through ONE SQL function
`claim_discovery` (idempotent per student+egg) that grants rewards through apply_awards / inventory
transactions. Never reveal undiscovered secrets: clues only.

Easter Bunny: a claimed discovery adds exactly one charge. `use_bunny_skip(attempt, question)` (SQL,
service role) locks the inventory row, checks ownership, charge > 0, that the attempt is in progress
and owned, and that the activity allows skips and is not an exam/required checkpoint. It decrements once
(idempotency key bunny:<attempt>:<question>) and records the response as 'skipped' (scored 0, excluded
from the max score per the teacher's rule, never correct). The student sees the effect and confirms
before consuming. Teacher results already show skipped separately (QuestionStat.skipped).

Skills (Insight, Time Dilation, Second Chance, Overdrive, Knowledge Echo, Dungeon Sense, Guild Leader):
the server validates every activation. Insight removes one wrong option in PRACTICE questions only, and
skills never apply to exams or reveal protected answers.

UI: Inventory & Skills page, Codex/collection book (discovered vs ??? silhouettes), teacher Easter egg
editor (no code changes needed to add secrets), discovery toast/dialog via RewardDialog.
Tests: eligibility, duplicate claims, a race on the last charge (two consumes → one succeeds),
prohibited exams, skipped ≠ correct, inventory can't change from the browser (RLS).
```

## Phase 4: Boss battles, team quests, achievements, guilds and leaderboards — ✅ done

Built as specified. The decisions:

- **Migrations:**
    - `20261030000100_phase4_enums.sql` adds the `achievement` and `team_quest` XP sources.
    - `20261030000200_social_challenges.sql` holds everything else.
- **Boss battles:**
    - `questions.phase` (1–5) and `activities.boss` ({ name, phases }).
    - The HP bar appears only after hand-in and comes from the server-graded score.
- **Streaks:**
    - Stored in the `learning_days` table, recorded on lesson completion and hand-in.
    - Days are counted in `progression_settings.timezone` (admin setting). This replaces the Phase 3
      `SCHOOL_TIMEZONE` env var.
    - Milestones live in `progression_settings.streak_milestones`. Each is paid once, ever (key
      `streak:<student>:<days>`).
    - Second Chance can fill one missed day via `shield_streak`.
- **Achievements:**
    - Conditions are zod-validated JSON (`utils/achievements.ts`).
    - Granted through `grant_achievement` (key `achievement:<id>:<student>`).
    - 12 are seeded, one of them hidden.
- **Guilds and team quests:**
    - Teachers form guilds; students can request to join.
    - Guild Leaders may found guilds when the course allows it.
    - A team quest's `team_config` is { activityIds, required: 'all' | n }. `complete_team_quest` pays
      every active member once (key `team:<activity>:<student>`).
- **Leaderboards:**
    - Set per course with `courses.leaderboard_mode` (off by default) and `profiles.leaderboard_hidden`.
    - Only XP earned in the course during the week counts; manual adjustments don't.
    - Ranked on the server, so other students' ids never reach the browser.
- **Post-reward checks:** `afterLearning` runs after each reward, in this order: streak, team quests,
  secrets, achievements.

Original prompt:

```
Add social and challenge mechanics. Follow the follow-existing-codebase skill.

1. Boss battles: multi-topic assessments with "phases" (question groups), higher XP (boss_battle rule),
   optional HP-bar presentation driven by the score. They count toward mastery (already in GRADED_KINDS).
2. Achievements: data-driven definitions (condition JSON validated by zod, evaluated by a pure function
   after each reward), unique per student, optional XP via apply_awards (key achievement:<id>:<student>),
   and a codex page.
3. Learning streaks: computed from activity_completions per local day (timezone setting). The streak
   reward uses key streak:<student>:<milestone>. Second Chance can protect a streak (Phase 3).
4. Guilds/teams inside a course: teacher-formed or student-joined (teacher approval). Team quests
   complete when every member (or N members) completes. Rewards go to each member through apply_awards.
5. Leaderboards: per course, weekly window, opt-in visibility set by the admin/teacher
   (off / initials only / display names). Show personal bests. Never show scores or answers, only XP
   earned in the window. Minors' privacy first.
Tests: achievement conditions, streak boundaries across midnight/timezones, team completion,
leaderboard privacy modes (RLS + API).
```

## Phase 5: AI-assisted drafting, analytics depth, polish and hardening

```
1. AI question drafts: a provider-independent server interface `QuestionDraftProvider` (server-only,
   keys in env). Teachers paste lesson text or pick a lesson, then choose count, types, difficulty and
   objectives. Drafts land in the Quest Builder as unsaved questions marked "AI draft" and need explicit
   teacher review and save. Nothing is published automatically. If no provider is configured, the button
   explains how to enable it and manual authoring still works. Rate-limit per teacher and log usage.
2. Teacher analytics: filters (course, module, student, date range), score distributions, performance
   by learning objective (objectives on questions), commonly missed questions, incomplete or overdue work,
   retries, skipped questions and bonus XP shown separately. Academic metrics come first. Add tests for
   calculations and authorisation, plus a dev-only seed script (never in production migrations).
3. Polish: Lighthouse/axe pass (keyboard, focus, contrast), reduced-motion audit, mobile checks at
   360/768/1280, empty and error states everywhere, rank-up sequence timing.
4. Hardening: rate limits on auth and submit routes (e.g. Upstash or Vercel KV), CSP headers, Sentry or
   an equivalent, data export/deletion for a student (privacy requests), backup/restore notes, and
   Playwright end-to-end tests for the 15 acceptance workflows in the master brief.
```
