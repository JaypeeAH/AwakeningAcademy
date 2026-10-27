# Codebase Architecture Reference

Detailed reference for **The Awakening Academy**. Read [SKILL.md](../SKILL.md) first for the rules; this
file explains *where things are and how they connect*. Paths are relative to `src/` unless stated otherwise.

---

## 1. Technology Stack

| Area | Library | Notes |
|---|---|---|
| Framework | `next` 16 (App Router, Turbopack) | `src/proxy.ts` (formerly middleware) refreshes the Supabase session |
| UI | `react` / `react-dom` 19.2 | React-Compiler lint rules on (relaxed only in `components/ui/**`) |
| Language | TypeScript 5.9 strict | Alias `@/*` → `src/*` |
| Backend | `@supabase/supabase-js` 2, `@supabase/ssr` | Postgres + Auth; keys are server-only env vars |
| Styling | Tailwind CSS 4 (`@tailwindcss/postcss`, `@tailwindcss/typography`) | `tailwind.config.ts` via `@config`; tokens are CSS variables |
| Class merge | `classnames` + `tailwind-merge` | `utils/classNames.ts` |
| State | `zustand` 5 | Generic resource stores (`stores/createResourceStore.ts`) |
| Fetching | `swr` 2 | Defaults in `configs/swr.config` |
| HTTP | `axios` + `axios-retry` | `services/api.ts`; retries GET only; 401 → sign-in |
| Forms | `react-hook-form` 7 + `zod` 3.25 + `@hookform/resolvers` 3 | |
| Markdown | `react-markdown` | `shared/MarkdownContent` (no raw HTML) |
| Overlays / motion | `react-modal`, `@floating-ui/react`, `framer-motion` | `MotionConfig reducedMotion="user"` in the shell |
| Select / scroll | `react-select`, `simplebar-react` | |
| Icons | `react-icons` (Tabler) | Only through `configs/icons.config.tsx` |
| Dates | `dayjs` | `utils/dates.ts` |
| Tests | `vitest`, `@electric-sql/pglite` | Pure logic + SQL/RLS in an in-process Postgres |

Fonts: Inter (body, `--font-body`) and Cinzel (display, `--font-display`, brand/rank/title moments only).

---

## 2. Request Lifecycle

```
Browser                                          Server
───────                                          ──────
app/(portal)/x/page.tsx (server comp.) ────────► server/actions/*       (first load / permission check)
  └─ <XSWRProvider fallbackData>
       └─ useSWRX()  (services/x)
            └─ api.fetchJson (axios) ──────────► app/api/x/route.ts
                                                    └─ apiAuthHandler(permission, …)  → 401/403, Origin check
                                                         ├─ zod .parse(body / query), readId(params)
                                                         ├─ server/actions/x  (ownership checks, decisions)
                                                         │    ├─ createUserClient()  (RLS-scoped reads)
                                                         │    ├─ supabaseAdmin()     (writes after authorisation)
                                                         │    └─ .rpc('award_xp' | 'finalize_attempt' | …)  (game state)
                                                         └─ server/utils/response (JSON / error)
       └─ useSyncResource → store (stores/GameStores)
            └─ components read with selectors
```

---

## 3. Data Model (supabase/migrations)

| Migration | Contents |
|---|---|
| `…0100_foundation.sql` | Enums, tables, indexes, RLS helper functions, read policies, `revoke` of browser writes |
| `…0200_progression.sql` | Level formula, profile bootstrap trigger, XP/rank/attempt functions, grants |
| `…0300_reference_data.sql` | Default settings, XP rules, F→SSS ranks + gates, subjects, class titles |
| `…0400_activity_content.sql` | `save_activity_content` (Quest Builder atomic save) |
| `20261027000100_signup_join_code.sql` | `handle_new_user` also enrols a valid class code from sign-up metadata |
| `…0200_delete_safety.sql` | Ledger links may be cleared on delete (history kept); creators `on delete set null` |
| `…0300_assessment_depth.sql` | Essays/uploads, rubrics, manual grading, timed attempts + autosave, feedback modes, question bank, `submissions` bucket |
| `20261028000100_phase3_enums.sql` | `xp_source` value `skill_bonus` (separate file: a new enum value can't be used in the transaction that adds it) |
| `20261029000100_lesson_media.sql` | Private `lesson-media` bucket (images only, 5 MB) + `course_media` |
| `20261030000100_phase4_enums.sql` | `xp_source` values `achievement`, `team_quest` |
| `20261030000200_social_challenges.sql` | Settings `timezone` / `streak_milestones`; `courses.leaderboard_mode` / `student_guilds`; `profiles.leaderboard_hidden`; `questions.phase`; `activities.boss` / `team_config`; `learning_days`; achievements; guilds; team quest completions; leaderboard functions; `save_activity_content` (phases) |
| `20261031000100_ai_analytics_hardening.sql` | `questions.objective` / `ai_draft`; `ai_draft_requests` (AI usage log); `rate_limit_hits` + `hit_rate_limit`; `save_activity_content` (objective, AI-draft flag) |
| `…0200_skills_inventory_secrets.sql` | Items + inventory ledger, skills + usages, Easter eggs + discoveries, `allow_skills` / `allow_bunny_skips`, `attempts.skipped_question_ids`, Second Chance allowances; `start_attempt` / `grade_attempt` replaced |

### Tables

| Group | Tables |
|---|---|
| People | `profiles` (role, display name, email, `equipped_title_id`) — created by `handle_new_user` on `auth.users` insert |
| Classes | `subjects` (`theme` → SubjectOptions), `class_titles` (per-subject tiers; `subject_id null` = hybrid like Polymath) |
| Courses | `courses` (subject, `join_code`, status), `course_teachers`, `course_enrollments`, `modules` |
| Content | `activities` (kind, body, objectives, XP, dates, attempts, passing score, `reveal_answers`, `xp_repeatable`, status, position), `activity_prerequisites`, `questions`, `question_options`, `question_keys` (teacher-only) |
| Work | `attempts` (one open per student+activity; `expires_at`, `draft_responses` autosave, `feedback`, `graded_by`), `attempt_responses` (outcome incl. `partial` / `skipped` / `pending_review`, per-answer `feedback`), `attempt_files` (homework uploads → private `submissions` bucket), `activity_completions` (best %, passed — what mastery reads; re-derived by `refresh_completion`) |
| Reuse | `bank_questions` (per course, teacher-only; copied into activities with new ids) |
| Rules | `progression_settings` (single row), `xp_rules` (default/min/max per source), `ranks` (min level + mastery gates) |
| Player state | `student_progress` (total XP, level, rank), `student_subject_progress`, `xp_ledger` (append-only, unique `idempotency_key`, running balance), `level_events`, `rank_history` |
| Items | `item_definitions` (code, kind consumable/collectible, rarity, `effect` — only `bunny_skip` today), `inventory_items` (charges ≥ 0, one row per student+item), `inventory_transactions` (append-only ledger, unique `idempotency_key`, egg/attempt/question refs) |
| Skills | `skill_definitions` (unlock requirements, charges + recharge window, eligible kinds, `allowed_in_formal`, `requires_teacher_permission`, `passive`, `config`), `student_skills`, `skill_usages` (unique key, `effect` jsonb), `attempt_allowances` (Second Chance extra attempts) |
| Secrets | `easter_eggs` (course, trigger + zod-validated `config`, clue / `clue_visible`, reveal lore, `phrase_hash`, `marker_key`, rarity, `rewards`, active — teachers only), `egg_discoveries` (one per student+egg) |
| Media | `course_media` (teacher-uploaded lesson images; served through `/api/media/[id]`) |
| Social | `learning_days` (one per student per local day; `shielded`), `achievement_definitions` (condition JSON), `student_achievements`, `guilds` (course, emblem, open, status active/pending, max members), `guild_members` (one per student per course; role, status), `team_quest_completions` |
| Ops | `notifications`, `audit_events`, `ai_draft_requests` (teacher's own / admins), `rate_limit_hits` (server only) |

### SQL functions

| Function | Who | What |
|---|---|---|
| `xp_for_level`, `level_for_xp` | anyone (immutable) | Formula: XP L→L+1 = base + step×(L−1); cumulative thresholds. Mirrored by `utils/progression.ts` |
| `user_role`, `is_admin`, `is_course_teacher`, `is_enrolled`, `teaches_student`, `can_view_activity` | RLS policies | SECURITY DEFINER helpers |
| `handle_new_user` | trigger | Creates profile (always `student`) + progress at the first rank |
| `lock_student_progress` | internal | Creates if missing and `FOR UPDATE`-locks the player row (serialises a student's changes) |
| `award_xp` | service_role | Exactly-once per key; updates total, level, subject path; level event + notification; `evaluate_rank` |
| `evaluate_rank` | internal | Promotes through every rank now qualified for (level AND gates); never skips/demotes |
| `mastery_stats` | service_role | averageScore / passedAssessments (quiz, exam, homework, boss) / completedLessons |
| `apply_awards` | internal | Applies `[{amount, source, idempotencyKey, reason}]` |
| `complete_lesson` | service_role | Completion row + awards + rank check |
| `start_attempt` | service_role | Resume open attempt or start next (advisory lock, `MAX_ATTEMPTS`) |
| `finalize_attempt` | service_role | In-progress → graded once; responses; best/passed; awards; rank check |
| `save_activity_content` | service_role | Upserts questions/options/keys/prerequisites; refuses removing answered questions or foreign ids |
| `recalculate_levels` | service_role | Re-derives levels after a formula change (ranks kept) |
| `attempt_grace` | anyone | 30-second allowance after a timed attempt's `expires_at` (mirrors `ATTEMPT_GRACE_SECONDS`) |
| `save_attempt_draft` | service_role | Autosave on an open, unexpired attempt (owner only) |
| `refresh_completion` | internal | Completion = best/pass across all graded attempts (a re-grade can lower it) |
| `grade_attempt` | service_role | Teacher marks → totals cross-checked → graded (or still pending) → completion, awards (same keys), rank, notification, audit. Refuses marks on skipped questions (`QUESTION_SKIPPED`); skipped questions are left out of the max |
| `grant_item` | service_role | The only way inventory changes: locks the row, applies once per key, never below zero, writes the ledger |
| `claim_discovery` | service_role | Records a discovery once, then XP via `apply_awards` (source `secret_quest`) and items via `grant_item` (key `egg:<egg>:<student>:<item>`); notification; rank check |
| `use_bunny_skip` | service_role | Owner's open attempt, activity allows skips, never formal kinds; spends one charge (key `bunny:<attempt>:<question>`), adds the question to `skipped_question_ids` |
| `unlock_skills` | service_role | Grants every skill now qualified for (level, rank, discoveries); notifies once |
| `use_skill` | service_role | Unlocked, enabled, not passive; eligibility vs the activity; charges in the rolling window under an advisory lock; once per key; Time Dilation moves `expires_at`, Second Chance adds an allowance |
| `start_attempt` (Phase 3) | service_role | Max attempts + Second Chance allowances |
| `hit_rate_limit` | service_role | Fixed-window counter per key (atomic upsert); returns allowed / remaining / retryAfter |
| `record_learning_day` | service_role | One row per student per local day (the server computes the day) |
| `shield_streak` | service_role | Second Chance (same charges/lock as `use_skill`) fills one empty day; once per key |
| `grant_achievement` | service_role | Once per student; XP via `apply_awards` (key `achievement:<id>:<student>`); notification; rank |
| `complete_team_quest` | service_role | Once per guild+activity; every active member: completion row, awards (key `team:<activity>:<student>`), notification, rank (members locked in id order) |
| `course_leaderboard`, `personal_best_week` | service_role | Weekly XP per enrolled student in a course (no manual adjustments); a student's best week |

Lock order everywhere: **attempt → student progress**. Rewards are safe under concurrency because the ledger
key is unique and the player row is locked.

### Security
- RLS on every table; `authenticated` can only `select` what policies allow; `anon` nothing.
- Answer keys: `question_keys` readable by course teachers only.
- Students see published activities of courses they're enrolled in, and only their own work/progress.
- Teachers see students they teach (`teaches_student`). Admins see everything.
- Easter eggs: course teachers only. Students learn about secrets only through the server's Codex (clue only,
  no trigger, title or reward until found). Phrases are stored as `sha256(eggId:normalisedPhrase)`.

---

## 4. Server Layer

### `server/data/supabase/`
| File | Exports |
|---|---|
| `config.ts` | `getSupabaseUrl`, `getSupabasePublishableKey`, `getSupabaseSecretKey`, `isSupabaseConfigured`, `requireSupabaseConfig` |
| `server.ts` | `createUserClient()` — acts as the signed-in user (cookies) |
| `admin.ts` | `supabaseAdmin()` — service role, singleton |
| `errors.ts` | `unwrap`, `unwrapMaybe`, `check`, `toAppError` (SQL codes → typed errors, incl. Phase 3: `NOT_ENOUGH_CHARGES`, `SKIPS_NOT_ALLOWED`, `SKILL_LOCKED`, `NO_CHARGES`…), `DatabaseError` |
| `storage.ts` | `createSubmissionUploadUrl` (browser uploads directly — Vercel's 4.5 MB body limit), `downloadSubmission` (byte check), `getSubmissionUrl` (1-minute download link), `removeSubmissions` |

### `server/actions/`
| Folder | Main exports |
|---|---|
| `auth` | `getCurrentUser` (cached; `getClaims` + profile role), `requireUser`, `assertPermission`, `requirePagePermission`, `signIn`, `signUp`, `signOut`, `exchangeAuthCode` |
| `progression` | `getProgressionSettings`, `getRanks`, `getXpRules`, `getProgressionConfig`, `saveProgressionConfig`, `getPlayerStatus`, `getXpHistory`, `getRankHistory`, `adjustXp`; `mappers.ts` (`parseSnapshot`, `parseAppliedAwards`) |
| `subjects` | `getSubjects`, `getClassTitles`, `getSubjectPaths`, `getStudentClass`, `mapSubjectMeta` |
| `courses` | `getCoursesForUser`, `getCourse`, `createCourse`, `updateCourse`, `resetJoinCode`, `joinCourse`, `getRoster`, `addStudent`, `removeStudent`, modules CRUD/reorder; `access.ts` (`requireCourseTeacher`, `requireCourseAccess`, `isCourseTeacher`, `isEnrolled`) |
| `activities` | `getCourseActivities`, `getActivityForPlay`, `completeLesson`, `createActivity`, `getActivityEditor`, `saveActivity`, `setActivityStatus`, `deleteActivity`, `reorderActivities`, `requireActivityTeacher`, `requireStudentQuest`, `assertPlayable`; `quests.ts` (`buildQuests`, `getQuestBoard`); `mappers.ts` |
| `attempts` | `startAttempt` (returns draft + files + server time), `saveAttemptDraft`, `submitAttempt` (late → graded from autosave), `prepareAttemptUpload` / `confirmAttemptUpload` / `deleteAttemptFile` / `getFileDownloadUrl`, `getAttemptResult` (keys per feedback mode), `getMyFeedback`, `getActivityResults`; `finalize.ts` (`finalizeAttempt`, `finalizeExpiredAttempts` — lazy sweep of timed-out attempts) |
| `grading` | `getGradingQueue`, `getAttemptForGrading`, `gradeAttempt` |
| `bank` | `getBankQuestions`, `saveBankQuestion`, `updateBankQuestion`, `deleteBankQuestion` |
| `reports` | `getCourseProgress` (gradebook + support flags), `getTeacherOverview`, `getAdminOverview` |
| `users` | `getUsers`, `setUserRole`, `getPlayerProfile`, `updateProfile` |
| `notifications` | `getNotifications`, `markNotificationsRead` |
| `audit` | `recordAudit`, `getAuditEvents` |
| `inventory` | `getItemDefinitions`, `getInventory`, `getBunnyCharges`, `useBunnySkip`, `createItemDefinition`, `updateItemDefinition` (code and effect fixed) |
| `skills` | `getSkillDefinitions`, `unlockSkills`, `getSkillBook`, `useSkill` (computes each effect server-side, then `use_skill`), `getAttemptPowers` (bunny charges, skips, Insight/Echo results, usable skills), `getQuestSkills` (Overdrive / Second Chance on the briefing), `overdriveAwards`, `updateSkillDefinition` |
| `aiDrafts` | `getAiStatus`, `draftQuestions` (teacher check → source text → rate limit → provider → `utils/aiDrafts` → log) |
| `analytics` | `getCourseAnalytics` (course teacher; pages through >1000 rows; filters module/student/date) |
| `privacy` | `exportPersonalData`, `exportUserData` (admin, audited), `deleteUserAccount` (storage files, then auth user → cascade) |
| `media` | `getCourseMedia`, `prepareMediaUpload`, `confirmMediaUpload` (byte check), `getMediaViewUrl` (teacher or enrolled → 1-hour signed URL) |
| `streaks` | `getLearningDays`, `recordLearning` (day + milestone XP), `getStreak`, `shieldStreak` |
| `achievements` | `getPlayerStats`, `checkAchievements` (never throws), `getAchievementBook`, admin CRUD |
| `guilds` | `getCourseGuilds`, teacher `createGuild` / `updateGuild` / `approveGuild` / `deleteGuild` / `manageGuildMember` / `updateCourseSocial`, student `requestToJoin` / `leaveGuild` / `foundGuild` |
| `teamQuests` | `checkTeamQuests` (never throws), `getTeamQuestStatus` (play view) |
| `leaderboards` | `getCourseLeaderboard` (privacy modes, guild totals, personal best), `setLeaderboardHidden` |
| `progression/afterLearning.ts` | `afterLearning(studentId, { learned })` → streak → team quests → secrets → achievements; used by `completeLesson`, `submitAttempt` and teacher grading (learned: false) |
| `secrets` | `checkDiscoveries` (automatic triggers → `claim_discovery`; never throws), `claimMarker`, `speakPhrase`, `getCodex`, `getCourseSecrets`, `createSecret`, `updateSecret`, `deleteSecret` (validated against the course, items and the `secret_quest` XP rule) |
| `help` | `getHelpCenter(user)`, `getHelpArticle(user, slug)` — content from `server/help/` filtered to the user's role by `utils/helpCenter` (`forRole`, `buildHelpCenter`, `searchHelp`), so other roles' text never reaches the browser |
| `samples` | `getSampleCourses`, `addSampleCourse` (content in `configs/sampleCourses/`; built through `createCourse` → `createModule` → `createActivity` → `saveActivity` → `setActivityStatus`, then published; half-made course deleted on failure) |
| `theme` | `'use server'` `getTheme` / `setTheme` (cookie) |

### Other server modules
| Path | Purpose |
|---|---|
| `server/ai/` | `QuestionDraftProvider` interface, `AnthropicDraftProvider` (SDK, structured outputs, refusal fallback), `getDraftProvider()` (null when unconfigured) |
| `server/security/rateLimit.ts` | `enforceRateLimit(scope, subject)`, `LIMITS`, `ipKey`, `emailKey` (hashed), `peekRemaining` |
| `server/observability/reportError.ts` | `reportError` — structured log line + reference code + optional `ERROR_WEBHOOK_URL`; used by `getApiErrorResponse` and `/api/client-errors` |

### API routes (`app/api/**/route.ts`)
| Route | Methods | Permission |
|---|---|---|
| `auth/sign-in`, `auth/sign-up`, `auth/sign-out` | POST | public (sign-out: session) |
| `me/status` | GET | play |
| `me/profile` | GET, PATCH | signed in |
| `me/xp-history`, `me/rank-history` | GET | play |
| `notifications`, `notifications/read` | GET, POST | signed in (own only) |
| `subjects` | GET | signed in |
| `quests` | GET | play |
| `courses` | GET, POST | signed in / courses.manage |
| `courses/join` | POST | play |
| `courses/[courseId]` | GET, PATCH | access / courses.manage |
| `courses/[courseId]/join-code` | POST | courses.manage |
| `courses/[courseId]/students(/[studentId])` | GET, POST, DELETE | courses.manage |
| `courses/[courseId]/modules(/order)`, `modules/[moduleId]` | POST, PUT, PATCH, DELETE | courses.manage |
| `courses/[courseId]/activities(/order)` | GET, POST, PUT | access / courses.manage |
| `courses/[courseId]/progress` | GET | results.view |
| `activities/[activityId]` | GET (play view), PUT (builder save), DELETE | play / courses.manage |
| `activities/[activityId]/editor`, `/status` | GET, POST | courses.manage |
| `activities/[activityId]/complete`, `/attempts` | POST | play |
| `activities/[activityId]/results` | GET | results.view |
| `attempts/[attemptId]`, `/submit` | GET, POST | owner or course teacher / play |
| `teacher/overview` | GET | results.view |
| `admin/overview`, `admin/users(/[userId])`, `admin/xp-adjustments` | GET, PATCH, POST | users.manage |
| `admin/progression` | GET, PUT | progression.manage |
| `auth/resend`, `auth/forgot-password`, `auth/reset-password` | POST | public (reset: the recovery session) |
| `attempts/[attemptId]/draft` | PUT | play (owner) |
| `attempts/[attemptId]/files/prepare`, `attempts/[attemptId]/files(/[fileId])` | POST, DELETE | play (owner, open attempt) |
| `files/[fileId]` | GET → 302 signed URL | uploader or course teacher |
| `me/feedback` | GET | play |
| `grading`, `grading/[attemptId]` | GET, POST | results.view (course teacher) |
| `courses/[courseId]/bank`, `bank/[bankQuestionId]` | GET, POST, PATCH, DELETE | courses.manage |
| `admin/audit` | GET | audit.view |
| `me/inventory`, `me/skills`, `me/codex` | GET | play |
| `skills/use` | POST | play |
| `attempts/[attemptId]/skip` | POST | play (owner) |
| `secrets/marker`, `secrets/phrase` | POST | play |
| `courses/[courseId]/secrets`, `secrets/[eggId]` | GET, POST, PUT, DELETE | courses.manage (course teacher) |
| `items`, `items/[itemId]` | GET (signed in), POST, PUT | progression.manage |
| `admin/skills`, `admin/skills/[skillId]` | GET, PUT | progression.manage |
| `activities/[activityId]/ai-drafts`, `ai/status` | POST, GET | courses.manage |
| `courses/[courseId]/analytics` | GET | results.view (course teacher) |
| `me/export`, `admin/users/[userId]/export`, `admin/users/[userId]` | GET, GET, DELETE | signed in / users.manage |
| `client-errors` | POST | public (rate-limited) |
| `courses/[courseId]/media(/prepare)`, `media/[mediaId]` | GET, POST / GET → 302 | courses.manage / teacher or enrolled |
| `me/streak`, `me/streak/shield`, `me/achievements` | GET, POST | play |
| `admin/achievements(/[achievementId])` | GET, POST, PUT, DELETE | progression.manage |
| `courses/[courseId]/guilds`, `/guilds/found`, `/guilds/leave`, `/social`, `/leaderboard` | GET, POST, PUT | access / play / courses.manage |
| `guilds/[guildId]`, `/approve`, `/members`, `/join` | PUT, DELETE, POST | courses.manage / play (join) |

Plus `app/auth/confirm/route.ts` (email confirmation code exchange).

---

## 5. Pure Logic (`utils/`, shared by client and server, unit-tested)

| File | Purpose |
|---|---|
| `progression.ts` | `xpToNextLevel`, `xpForLevel`, `levelForXp`, `getLevelProgress`, `getRankTrial`, `validateRankLadder`, `clampToRule`, `completionKey`, `highScoreKey`, `computeLessonAwards`, `computeAttemptAwards`, `summarizeRewards` |
| `grading.ts` | `gradeAttempt` (single/multiple/true-false/short answer; essays → pending_review), `normalizeAnswer` |
| `quests.ts` | `getQuestState` (upcoming / locked / in_progress / available / completed + reason + attempts left) |
| `classTitles.ts` | `getSubjectTitle`, `getNextSubjectTitle`, `getUnlockedTitles`, `getPlayerClass`, `UNCLASSED_TITLE` |
| `activityValidation.ts` | `getQuestionIssues`, `getPublishIssues` (Quest Builder checklist + server enforcement) |
| `reports.ts` | `getSupportReasons` (learning signals, never XP) |
| `manualGrading.ts` | `applyManualGrades` (teacher marks → totals, pass, pending), `outcomeForPoints` |
| `fileTypes.ts` | `checkUpload` (allowed extension AND matching bytes), `sniffFileFamily`, `safeFileName`, `UPLOAD_ACCEPT` |
| `feedback.ts` | `canRevealAnswers(mode, dueAt, { isTeacher })`, feedback mode labels |
| `timing.ts` | `isPastGrace`, `secondsRemaining`, `formatCountdown`, `ATTEMPT_GRACE_SECONDS` |
| `questionBank.ts` | `copyBankQuestion` (fresh ids, remapped answers), `filterBankQuestions` |
| `secrets.ts` | `evaluateTrigger` (every automatic trigger), `parseEggConfig`, `currentStreak`, `normalizePhrase`, `phraseHashInput`, `markerSnippet`, `SECRET_LINK`, `MANUAL_TRIGGERS_SET` |
| `aiDrafts.ts` | `aiDraftToQuestion` / `aiDraftsToQuestions` (normalise + validate model output, flag `aiDraft`), `markdownToSourceText` |
| `analytics.ts` | `scoreDistribution`, `objectivePerformance`, `missedQuestions`, `workStatus`, `retryStats`, `xpBreakdown` |
| `media.ts` | `parseVideoUrl` (YouTube/Vimeo only → privacy-friendly embed URL), `imageMarkdown`, `videoMarkdown`, `getMediaUrl`, `readingStats`, callout types |
| `lessonDoc.ts` | `markdownToDoc` / `docToMarkdown`: the visual editor's document ⇄ stored Markdown for every editor feature (escaping, callouts, videos, images, tables, secret markers); round-trip tested |
| `markdownEditing.ts` | Toolbar text edits: `wrapSelection`, `prefixLines`, `insertBlock`, `insertInline` |
| `streaks.ts` | `localDay`, `currentStreak`, `bestStreak`, `reachedMilestones`, `nextMilestone`, `shieldableDay`, `weekWindow` / `startOfLocalDay` (DST-safe), `isValidTimeZone` |
| `achievements.ts` | `evaluateAchievement`, `achievementProgress`, `parseCondition`, `achievementKey` |
| `teamQuests.ts` | `teamQuestProgress`, `requiredMembers`, `parseTeamConfig`, `teamQuestKey` |
| `leaderboard.ts` | `buildLeaderboard` (off / initials / names; hidden students left out; no ids), `rankByXp`, `initialsOf` |
| `boss.ts` | `BossConfigSchema`, `groupByPhase`, `bossHpLeft`, `getBossIssues` |
| `skills.ts` | `FORMAL_KINDS`, `skillRequirements`, `skillCharges` (rolling window), `skillAllowedOn` (mirrors `use_skill`), `pickInsightOption` (a wrong option; never below two) |
| `dates.ts`, `parse.ts`, `errors.ts`, `classNames.ts`, `queryRoute.ts`, `focus.ts`, theme helpers | Plumbing |

Reward rules: lesson XP on first completion; assessment completion XP on the first **pass**; high-score
bonus once at ≥ `highScoreThreshold`; `xpRepeatable` gives completion XP per passing attempt; amounts are
clamped to the admin's `xp_rules` range. Practice quizzes don't count toward mastery.

Phase 3 keys: secret XP `egg:<egg>:<student>` (source `secret_quest`); Overdrive bonus
`overdrive:<activity>:<student>` (source `skill_bonus`, paid with the first pass); skill uses `insight:<attempt>:<question>:<n>`,
`echo:<attempt>:<question>`, `td:<attempt>`, `sc:<activity>:<student>:<attemptsUsed>`, `od:<activity>:<student>`,
`ds:<course>:<egg>:<student>`. A skipped question is graded `skipped` (0 points, out of the max) — never correct.

---

## 6. Client Layer

### Services (`services/`)
| Service | Exports |
|---|---|
| `api.ts` | `api.fetchJson`, `ApiError` (`status`, `code`, `body`), `ApiOptions` |
| `progression` | `useSWRPlayerStatus`, `useSWRXpHistory`, `useSWRRankHistory`, `useSWRProgressionConfig`, `apiSaveProgressionConfig`, `apiAdjustXp`, `ensure*` |
| `activities` | `useSWRQuests`, `useSWRActivityForPlay`, `apiCompleteLesson`, `useSWRCourseActivities`, `apiCreateActivity`, `useSWRActivityEditor`, `apiSaveActivity`, `apiSetActivityStatus`, `apiDeleteActivity`, `apiReorderActivities`, `useSWRActivityResults` |
| `attempts` | `apiStartAttempt`, `apiSaveDraft`, `apiSubmitAttempt`, `useSWRAttemptResult`, `uploadAttemptFile` (prepare → PUT to signed URL → confirm), `apiDeleteAttemptFile`, `getFileUrl`, `useSWRMyFeedback` |
| `ai` | `useSWRAiStatus`, `apiDraftQuestions` |
| `analytics` | `useSWRAnalytics(courseId, filters)` |
| `media` | `useSWRCourseMedia`, `uploadCourseImage` (prepare → PUT → confirm) |
| `social` | `useSWRStreak`, `apiShieldStreak`, `useSWRAchievements`, admin achievements, `useSWRCourseGuilds` + guild actions, `apiUpdateCourseSocial`, `useSWRLeaderboard` |
| `game` | `useSWRInventory`, `apiBunnySkip`, `useSWRSkillBook`, `apiUseSkill`, `useSWRCodex`, `apiClaimMarker`, `apiSpeakPhrase`, `useSWRCourseSecrets` + create/update/delete, `useSWRItemDefinitions`, `apiCreateItem`/`apiUpdateItem`, `useSWRSkillDefinitions`, `apiUpdateSkill` |
| `courses` | `useSWRCourses`, `useSWRCourse`, create/update/join/reset, roster, modules, `useSWRCourseProgress` |
| `users` | `useSWRProfile`, `apiUpdateProfile`, `useSWRUsers`, `apiSetUserRole`, `useSWRAuditEvents` |
| `misc` | `apiSignIn`, `apiSignUp`, `apiResendConfirmation`, `apiForgotPassword`, `apiResetPassword`, `useSWRSubjects`, `useSWRNotifications`, `apiMarkNotificationsRead`, overviews |
| `grading` | `useSWRGradingQueue`, `useSWRAttemptForGrading`, `apiGradeAttempt`; bank: `useSWRBank`, `apiSaveToBank`, `apiUpdateBankQuestion`, `apiDeleteBankQuestion` |

Rules: SWR key = API URL (relative to `/api`); `null` key to skip; `ensure*` converts dates.

### Stores (`stores/`)
| Store | Kind |
|---|---|
| `createResourceStore.ts` | `createResourceStore<T>()`, `createKeyedStore`, `createKeyedResourceStore<T>()`, `resourceSlice` |
| `GameStores.ts` | `usePlayerStatusStore`, `useProfileStore`, `useNotificationsStore`, `useCoursesStore`, `useTeacherOverviewStore`, `useAdminOverviewStore`, `useProgressionConfigStore`; keyed: `useCourseStore`, `useCourseActivitiesStore`, `useRosterStore`, `useCourseProgressStore`, `useActivityEditorStore`, `useActivityResultsStore`, `usePlayViewStore`, `useCourseSecretsStore`; `useInventoryStore`, `useSkillBookStore`, `useCodexStore`, `useItemDefinitionsStore`, `useSkillDefinitionsStore`; `useQuestBoardStore` (+ filter) and `getVisibleQuests` |
| `AdminStores.ts` | Admin filters/pagination |
| `RecentItemsStore.ts` | "Recently visited" (localStorage, per user, `skipHydration`) |

Hooks (`utils/hooks/`): `useSession`, `useTheme`, `useNavigation`, `useBreadcrumbs`/`usePageBreadcrumbs`,
`useSyncResource`, `useRecordRecentItem`, `useDebouncedValue`, `useBeforeUnloadWarning`.

### Components
| Layer | Contents |
|---|---|
| `ui/` | Template primitives (Button, Card, Table, Tabs, Form, Input, Select, Dialog, Drawer, Dropdown, Segment, Switcher, Checkbox, Radio, Tag, Badge, Progress, Tooltip, Pagination, toast…) |
| `shared/` | `ConfirmDialog`, `EmptyState`, `ErrorState`, `Loading`, `PageHeader`, `StatTile`, `MarkdownContent` (GFM, callouts, captions, click-to-play videos, secret markers), `markdown/VideoEmbed`, `markdown/remarkCallouts`, `UserAvatar`, `Container`, `NavToggle`, `SetupRequired` |
| `game/` | `RankEmblem` (original SVG crest, ornaments by tier), `XpBar`, `SystemPanel`, `PlayerIdentity`, `RankTrialPanel`, `RewardDialog`, `DiscoveryDialog` (one or more finds, after the RewardDialog), `SecretMarker` + `SecretMarkerProvider` (lesson markers; `MarkdownContent secrets`), `GameTags` (`XpReward`, `LevelBadge`, `RankTag`, `SubjectTag`, `ActivityKindTag`, `PublishStatusTag`, `QuestStateTag`, `DifficultyStars`) |
| `template/` | `PostLoginLayout`, `SideNav`, `MobileNav`, `Header`, `HeaderSearch` (→ Quest Board), `UserDropdown`, `ThemeToggle`, `Logo`/`LogoMark`, `PageContainer`, `VerticalMenuContent` (+ `RecentItemsMenu`), `Theme/` |
| `learn/` | `LearnClientPage`, `LessonView`, `AssessmentView`, `QuizRunner` (autosave, uploads, timer, powers), `AttemptPowersBar` + `KnowledgeEchoPanel` (Easter Bunny with confirm, Insight, Echo, Time Dilation), `QuestSkillsPanel` (Overdrive, Second Chance), `AttemptTimer`, `QuestionCard` (answer / preview / review / grader — all question kinds, files, comments, rubric, Insight-removed options, skipped), `AttemptResultView` |
| `achievements/`, `courses/details/student/` (Guild, Leaderboard tabs), `courses/details/manage/` (Guilds, Leaderboard tabs), `activities/editor/visual/` (TipTap visual editor: extensions, node views, toolbar — the default), `activities/editor/markdown/` (Markdown mode toolbar, image and video dialogs), `game/LearningOutcomeDialogs` + `AchievementDialog`, `learn/BossBattle`, `learn/TeamQuestView`, `dashboard/StreakPanel` | Phase 4 and the lesson editor |
| `inventory/`, `codex/` | Inventory & Skills page (items, history, skill book, Dungeon Sense); Codex (found entries, ??? silhouettes, secret phrase) |
| `grading/` | `GradingQueueClientPage`, `GraderClientPage`, `GradeQuestionPanel` |
| `bank/` | Bank filters, list, save-to / add-from dialogs |
| `auth/` | `SignInCard`, `SignUpCard` (class code), `ForgotPasswordCard`, `ResetPasswordCard`, `CheckEmailPanel` (resend), `PasswordInput`, `ArrivalNotice` |
| `quests/` | `QuestBoardClientPage`, `QuestCard` |
| `courses/` | `CoursesClientPage`, `CourseSWRProviders`, `details/CourseClientPage` (→ `manage/CourseManageView` or `StudentCourseView`), `dialogs/`, `forms/` |
| `activities/` | `editor/` (Quest Builder), `results/` |
| `dashboard/` | Student / Teacher / Admin dashboards |
| `profile/`, `history/`, `notifications/`, `admin/` | Player profile + titles, Chronicle, bell, admin pages |

### Pages (`app/`)
| Page | Renders |
|---|---|
| `(portal)/page.tsx` | Dashboard by role |
| `(portal)/quests` | Quest Board (`?q=` from header search) |
| `(portal)/courses`, `courses/[courseId]` | Course list; course (manage vs student view, `?tab=`) |
| `(portal)/courses/[courseId]/activities/[activityId]/edit`, `/results` | Quest Builder; results |
| `(portal)/learn/[activityId]` | Learning Dungeon (`?attempt=` re-opens a result) |
| `(portal)/profile`, `(portal)/history` | Player profile; Chronicle |
| `(portal)/inventory`, `(portal)/codex` | Inventory & Skills; Codex |
| `(portal)/analytics` | Teacher analytics (`?course=`) |
| `(portal)/achievements` | Achievement book (progress, hidden ones as ???) |
| `(portal)/admin/users`, `/progression`, `/items`, `/achievements`, `/audit` | Administration (`/items`: item and skill definitions; `/achievements`: achievement definitions) |
| `(portal)/grading`, `(portal)/grading/[attemptId]` | Marking queue; grader |
| `(portal)/help`, `(portal)/help/[slug]` | Help Center (`?topic=`), articles; every role, content filtered by role on the server |
| `(auth)/login`, `(auth)/signup` (`?code=`), `(auth)/forgot-password`, `(auth)/reset-password`, `privacy`, `not-found` | Public |

---

## 7. Styling

```
assets/styles/
├── app.css         manifest (tailwindcss, @config, dark variant, every file below)
├── tailwind/       _tokens.css (colour variables, light + .dark), _base.css (incl. Ecme border/cursor resets)
├── components/     the Ecme template's primitive styles, verbatim (index.css imports them) — don't fork; extend via tokens
├── template/       Ecme shell styles (index.css) + _layout.css
├── vendors/        _simple-bar.css
├── game/           _system.css (system panel, xp bar, subject themes), _ranks.css (rank tones)
└── others/         _animations.css (all gated by prefers-reduced-motion)
```

- Dark (default): near-black page (`gray-950`), navy surfaces (`gray-800`), electric-blue `primary`, gold for rare things
- Light: same hues at accessible contrast
- `.system-panel` (+ `-gold`), `.system-eyebrow`, `.xp-bar`/`.xp-bar-fill`, `.subject-theme-*`, `.rank-tone-*`, `.rank-tag`

---

## 8. Testing & Verification

```bash
npm test              # vitest: src/utils/*.test.ts + tests/db/*.test.ts (PGlite runs every migration)
npm run typecheck
npm run lint
npm run format:check
npm run db:types      # after changing a migration
npm run build
npm run dev
```

- `tests/db/testDb.ts` shims Supabase (`auth.users`, `auth.uid()` from `request.jwt.claim.sub`, roles) and offers
  `createUser`, `createCourse`, `createActivity`, `awardXp`, `progressOf`, `asUser` (runs as `authenticated` so RLS applies)
- PGlite is single-connection: concurrency tests prove idempotency, not lock contention (the unique key + `FOR UPDATE` cover that in Postgres)
- Never commit `.env.local`; create test accounts with obvious names and delete them afterwards
