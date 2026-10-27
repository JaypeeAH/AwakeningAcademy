---
name: follow-existing-codebase
description: >-
  Follow The Awakening Academy (gamified learning platform: Next.js 16 App Router + Supabase + Vercel)
  architecture, coding style, component patterns, security model and design system when implementing new
  features, pages, components, API routes, server actions, SQL migrations or game mechanics. Activate this
  skill for any development task that adds or modifies code in the repository. It ensures consistency,
  maximum reuse, server-side trust for every game reward, and that new code looks like a natural extension
  of the existing codebase.
---

# Follow Existing Codebase — The Awakening Academy

> **Core Principle:** Before creating anything new, search for something that already exists.
> Reuse it if possible. If it cannot be reused directly, extend or compose it. Only create
> something new when there is a clear reason.

> **Game Principle:** The browser is never trusted. XP, scores, correct answers, rank, inventory and
> eligibility are decided on the server and applied in Postgres — idempotently and atomically.

Students are "players" who earn XP from lessons and assessments, level up, climb ranks F → SSS (level
**and** mastery gates) and grow subject-based classes ("Advanced Mathematician"). Teachers author courses
and quests; administrators tune the rules. For the detailed map (every table, function, action, route,
store and component), read [architecture.md](./references/architecture.md).

---

## Decision Hierarchy

1. **Reuse** an existing component, hook, utility, service, store, server action or SQL function
2. **Extend** an existing one in a backward-compatible way
3. **Compose** existing pieces into a new feature component
4. **Create** a new reusable component (in `ui/`, `shared/` or `game/` if others will need it)
5. **Create** page-specific implementation (last resort)

Never jump directly to step 5.

---

## Before Writing Any Code

### Step 1 — Understand the request
Page, component, API route, server action, store, SQL migration, game rule, or fix? Which role(s) use it
(student / teacher / admin) and which permission guards it?

### Step 2 — Search the codebase, in this order
1. `src/components/ui/` — design-system primitives (Button, Card, Table, Tabs, Form, Select, Dialog, Segment…)
2. `src/components/shared/` — app composites (ConfirmDialog, EmptyState, ErrorState, Loading, PageHeader, StatTile, MarkdownContent)
3. `src/components/game/` — game presentation (RankEmblem, XpBar, SystemPanel, PlayerIdentity, RankTrialPanel, RewardDialog, DiscoveryDialog, SecretMarker, GameTags)
4. `src/components/<feature>/` — `courses/`, `activities/`, `learn/`, `quests/`, `profile/`, `history/`, `inventory/`, `codex/`, `dashboard/`, `admin/`
5. `src/services/<entity>/` — browser API functions + SWR hooks
6. `src/stores/` — Zustand stores (`GameStores.ts`, `createResourceStore.ts`)
7. `src/@types/<entity>/` — interfaces, zod schemas, `*Options.ts` maps
8. `src/server/actions/<entity>/` — business logic; `src/server/data/supabase/` — clients + error mapping
9. `supabase/migrations/` — schema, RLS, game-state SQL functions
10. `src/utils/` (pure, shared client+server, unit-tested), `src/utils/hooks/`, `src/constants/`, `src/configs/`
11. Grep for a similar feature and copy its shape

### Step 3 — Produce a short plan

| Section | Content |
|---|---|
| **Existing pieces to reuse** | Components, hooks, utils, services, stores, actions, SQL functions |
| **New pieces required** | Only those that genuinely need creating |
| **Files to modify** | Expected file list |
| **Security** | Permission, ownership check, RLS impact, what the server must decide |
| **Architecture fit** | Which layer each change lives in and why |

---

## Project Stack

| Aspect | Value |
|---|---|
| Framework | Next.js 16 (App Router, `src/proxy.ts`), React 19.2, deployed on **Vercel** |
| TypeScript | 5.9 (strict), path alias `@/*` → `src/*` |
| Backend | **Supabase**: Postgres (RLS on every table) + Auth (email/password, `@supabase/ssr` cookies) |
| Styling | Tailwind CSS 4 + CSS-variable tokens (`src/assets/styles`), dark-first fantasy theme |
| Client state | Zustand 5, fed by SWR 2 (SWR → Zustand bridge via `useSyncResource`) |
| HTTP (browser) | axios + axios-retry, only through `src/services/api.ts` |
| Forms | react-hook-form 7 + zod 3 + @hookform/resolvers |
| Content | Markdown via `react-markdown` (`shared/MarkdownContent`, raw HTML never rendered) |
| Motion | framer-motion inside `<MotionConfig reducedMotion="user">` + CSS animations gated by `prefers-reduced-motion` |
| Icons | react-icons (Tabler) via semantic names in `src/configs/icons.config.tsx` |
| Dates | dayjs (`src/utils/dates.ts`) |
| Tests | Vitest: pure logic (`src/utils/*.test.ts`) + SQL in PGlite (`tests/db/*.test.ts`) |
| Lint / format | ESLint flat config (next core-web-vitals + typescript + prettier); Prettier: single quotes, no semicolons, 4 spaces, width 120 |

Roles: `student`, `teacher`, `admin` (`profiles.role`, set only by admins). Permissions in
`@types/auth/Roles.ts`: `play`, `courses.manage`, `results.view`, `users.manage`, `progression.manage`,
`audit.view`. API routes use `apiAuthHandler(permission, …)`; pages use `requirePagePermission(permission)`;
the UI hides actions with `useSession().can(permission)` (presentation only).

---

## Security Model (non-negotiable)

1. **The browser never talks to Supabase.** It calls `/api/*` routes; Supabase keys are server-only env vars.
2. **Every route authorises:** `apiAuthHandler(permission | null, …)` (401/403), then the action checks
   ownership (`requireCourseTeacher`, `requireCourseAccess`, `requireStudentQuest`, "your own attempt").
   Students get **404** (not 403) for things they can't see, so ids can't be probed.
3. **Reads** that RLS can scope may use `createUserClient()`; **writes** use `supabaseAdmin()` *after*
   authorisation. RLS still denies all browser-role writes and scopes reads (defense in depth).
4. **Game state changes only inside SQL functions** (`SECURITY DEFINER`, `EXECUTE` granted to
   `service_role` only): `award_xp`, `complete_lesson`, `start_attempt`, `finalize_attempt`,
   `save_activity_content`, `recalculate_levels`. Never `update student_progress` / `insert xp_ledger` from TS.
5. **Decide in TypeScript, apply in SQL.** Pure functions (`utils/progression.ts`, `utils/grading.ts`,
   `utils/quests.ts`, `utils/classTitles.ts`, `utils/activityValidation.ts`) decide; SQL applies with locks.
6. **Every reward has a deterministic idempotency key** (`completionKey`, `highScoreKey`, `adjust:<admin>:<requestId>`).
   The ledger's unique key makes refreshes, double clicks and concurrent tabs harmless.
7. **Answer keys never leave the server** for students (`question_keys` is teacher-only under RLS; play views
   use `QUESTION_SELECT`, never `KEYED_QUESTION_SELECT`). Explanations are revealed only if `reveal_answers`.
8. **Roles never come from user input** (sign-up metadata is ignored by `handle_new_user`).
9. **Audit** consequential changes with `recordAudit()` (roles, XP adjustments, progression rules, publishing).
10. Minors may use the platform: collect only a display name + sign-in email. No new personal fields without
    a documented reason.
11. **Uploads** never pass through our functions (Vercel's 4.5 MB body limit): the server issues a one-time
    signed upload URL for a path it chooses, then reads the stored bytes back and checks them
    (`checkUpload`) before attaching the file. Downloads go through `/api/files/[id]` (access check →
    one-minute signed URL). The `submissions` bucket is private.
12. **Time** for timed attempts comes from the server (`expires_at`); the UI countdown is cosmetic.
13. **Items, skills and secrets are server-decided.** Inventory changes only through `grant_item` /
    `use_bunny_skip` (ledger + key); skills only through `use_skill`, after the action computes the effect
    (Insight returns a *wrong* option id — never the key). Nothing on exams/homework/boss battles
    (`FORMAL_KINDS`). A skipped question is graded `skipped`, never correct. Students never receive an
    undiscovered secret's title, trigger, config or rewards — only a teacher-approved clue. Discovery checks
    (`checkDiscoveries`) must never break the action that triggered them.
14. **Social features protect minors.** Leaderboards are off by default, show only weekly XP (never scores
    or answers), use initials or display names as the course chooses, respect `leaderboard_hidden`, and
    are ranked on the server so other students' ids never reach the browser. Post-reward work goes
    through `afterLearning` and never throws.
15. **Lesson media:** images are uploaded like homework (signed URL → byte check) into the private
    `lesson-media` bucket and served via `/api/media/[id]` (teacher or enrolled student). Videos are links
    only (`parseVideoUrl`: YouTube/Vimeo), rendered click-to-play so nothing loads until the student
    presses play. Never render raw HTML or iframes from lesson content.
16. **Lessons are stored as Markdown.** The visual editor (TipTap) only offers what `utils/lessonDoc.ts` can
    round-trip; add a node there (both directions + a test) before offering it in the editor.

---

## Folder Structure Rules

```
supabase/migrations/   → Ordered SQL: schema + RLS, progression functions, reference data, builder functions
scripts/               → generate-db-types.mjs (PGlite → src/@types/supabase/database.types.ts)
tests/db/              → PGlite tests for SQL functions and RLS (testDb.ts shims Supabase's auth schema)
src/
├── @types/            → Types, zod schemas, *Options.ts maps, one folder per entity; supabase/database.types.ts (generated)
├── app/
│   ├── layout.tsx     → html/body, fonts, theme cookie, ThemeProvider, SWRAppConfig
│   ├── (auth)/        → login, signup (public)
│   ├── (portal)/      → app shell (PostLoginLayout); page.tsx files are server components
│   ├── api/<route>/route.ts → validate (zod) → server action → response
│   └── auth/confirm/  → email confirmation callback
├── assets/styles/     → ALL CSS (app.css manifest; tailwind/, components/, template/, game/, others/)
├── components/
│   ├── ui/ shared/ game/ template/ auth/ swr/
│   └── <feature>/     → kebab-case feature dirs with dialogs/, forms/, details/, editor/, results/, manage/
├── configs/           → app.config (every path), navigation.config, icons.config, swr.config, theme
├── constants/         → *.constant.ts
├── server/            → SERVER-ONLY (every file starts with `import 'server-only'`, except 'use server' actions)
│   ├── actions/<entity>/  → business logic (+ mappers.ts for row → app type)
│   ├── data/supabase/     → config, server (user client), admin (service role), errors (unwrap/check/toAppError)
│   ├── routes/api/        → apiHandler, apiAuthHandler, readJsonBody, readId, readQuery
│   └── utils/             → response.ts, errors.ts
├── services/<entity>/ → browser API functions + SWR hooks (+ api.ts)
├── stores/            → Zustand stores
├── utils/             → pure utilities (+ *.test.ts); hooks/; hoc/
└── proxy.ts           → session refresh + optimistic redirect to /login
```

### File naming

| Type | Convention | Example |
|---|---|---|
| Components | PascalCase `.tsx`, default export | `QuestCard.tsx` |
| Feature dirs | kebab-case | `components/activities/editor/` |
| Client pages | `<Entity>ClientPage.tsx` | `QuestBoardClientPage.tsx` |
| SWR providers | `<Entity>SWRProvider` | `CourseSWRProvider` |
| Services | `services/<entity>/index.ts` | `services/activities/index.ts` |
| Server actions | `server/actions/<entity>/index.ts` | `server/actions/attempts/index.ts` |
| Request schemas | `@types/<entity>/<Entity>Schema.ts` | `ActivitySchema.ts` |
| Form schemas | `@types/<entity>/forms/*FormData.ts` | `ActivityFormData.ts` |
| Choice maps | `<Entity><Field>Options.ts` | `ActivityKindOptions.ts`, `RankOptions.ts` |
| Migrations | `YYYYMMDDHHMMSS_description.sql` | `20261026000200_progression.sql` |
| Pure logic + tests | `utils/<name>.ts` + `utils/<name>.test.ts` | `grading.ts`, `grading.test.ts` |

---

## Component Patterns

```tsx
import Tag from '@/components/ui/Tag'
import { rankTagClass } from '@/@types/progression/RankOptions'
import classNames from '@/utils/classNames'

export function RankTag({ code, className }: { code: string; className?: string }) {
    return <Tag className={classNames(rankTagClass(code), className)}>{code}-Rank</Tag>
}
```

- Props are interfaces (`[Component]Props`) or inline for tiny components; destructured in the signature
- `className` accepted and merged with `classNames()` (`classnames` + `tailwind-merge`)
- `'use client'` only where hooks/handlers/browser APIs are used
- Pages are **server components**: `requirePagePermission`, validate ids, server-fetch to avoid a loading
  flash (`notFound()` via `isNotFound(error)`), then render `*SWRProvider` + `*ClientPage`
- React 19: `ref` is a prop; ids from `useId`; no `Date.now()`/`Math.random()` in render
- Imports always `@/…`; `import { type X }` for types; no barrels except `ui/*/index`
- Use **SystemPanel** for game information (status, trials, rewards) and plain **Card**/tables for teaching tools
  and reports. Learning content stays calm and readable.

---

## Critical Architecture Pattern: SWR → Zustand Bridge

```
[page.tsx (server)] ─► [XSWRProvider] ─► useSWRX() (services/) ─► api.fetchJson ─► /api/x ─► server action ─► Supabase
                              │ useSyncResource(swr, setters)
                              ▼
                       [Zustand store]  ─►  leaf components read with selectors
```

```ts
// services/activities/index.ts
export const apiGetActivityEditor = async (activityId: string) =>
    ensureEditorData(await api.fetchJson<ActivityEditorData>({ method: 'get', url: getActivityEditorUrl(activityId) }))
export const useSWRActivityEditor = (activityId: string | null, config?: SWRConfiguration<ActivityEditorData>) =>
    useSWR(activityId ? getActivityEditorUrl(activityId) : null, () => apiGetActivityEditor(activityId!), config)
```

- Stores: `createResourceStore<T>()` (single) / `createKeyedResourceStore<T>()` (per course/activity id) in
  `stores/createResourceStore.ts`; instances live in `stores/GameStores.ts`
- A provider calls the hook and `useSyncResource(swr, { setData, setLoading, setError, setRefresh })`
- After a mutation: call the store's `refresh()` (and related stores', e.g. player status after a reward)
- Array-building selectors (`getVisibleQuests`) run inside `useMemo`, never as a store selector
- Exception: page-local paginated data no other component shares (e.g. Chronicle tabs) may read SWR directly

---

## Server Patterns

### API route
```ts
export const POST = apiAuthHandler<{ attemptId: string }>('play', async (req, ctx, user) => {
    const attemptId = readId((await ctx.params).attemptId, 'attempt')
    const input = SubmitAttemptSchema.parse(await readJsonBody(req))
    return getJsonResponse(await submitAttempt(user, attemptId, input))
})
```
Routes stay thin. Writes from other origins are blocked by `apiHandler` (Origin check).

### Server actions and data
- `unwrap(result, 'load the course')` for queries that must return data; `unwrapMaybe` for `.maybeSingle()`;
  `check(result, 'save …')` for writes; `toAppError` for RPC errors. The context string completes
  "Couldn’t …" in the user-facing message
- SQL `raise exception 'CODE'` → mapped to typed errors with friendly wording in `KNOWN_ERRORS`
  (`server/data/supabase/errors.ts`) — add new codes there
- Map rows → app types in `mappers.ts` (camelCase, `Date`s); the browser never sees raw rows
- Typed errors from `@/@types/errors`: `DataError` 400, `UnauthorizedError` 401, `ForbiddenError` 403,
  `NotFoundError` 404, `ConflictError` 409, `TooManyRequestsError` 429, `ServiceUnavailableError` 503
- New game mechanics: a pure TS decision function + test, a SQL function (service-role only) + PGlite test,
  then the action wiring them together

### Database changes
1. Add a new migration (never edit an applied one); enable RLS + read policies; `revoke … from anon, authenticated`
2. `npm run db:types` to regenerate `src/@types/supabase/database.types.ts`
3. Add/extend PGlite tests in `tests/db/`
4. A new enum value goes in its own migration before the one that uses it (Postgres can't use it in the same transaction)

---

## Form Patterns

```tsx
const form = useForm<JoinCourseInput>({ resolver: zodResolver(JoinCourseSchema), defaultValues: { code: '' } })
<FormProvider {...form}>
    <Form id={FORM_ID} onSubmit={form.handleSubmit(onValid)} noValidate>
        <FormItem label="Join code" htmlFor="join-code" invalid={!!errors.code} errorMessage={errors.code?.message}>
            <Controller name="code" control={control} render={({ field }) => <Input id="join-code" {...field} />} />
        </FormItem>
    </Form>
</FormProvider>
```
- Request schemas (`@types/<entity>/<Entity>Schema.ts`) are reused by the route **and** typed into the service
- Dialog forms: `ConfirmDialog confirmForm={FORM_ID}`; the server validates again — form schemas are UX

---

## Styling Rules

- CSS only in `src/assets/styles/` (manifest `app.css`); otherwise Tailwind classes
- Tokens, never hex in components: `primary` (electric blue), `gold` (rare rewards only), `gray-50…950`
  (blue-tinted; 800 = navy surface, 950 = page), `error`/`success`/`warning`/`info` (+ `-subtle`)
- Rank colours: `rank-tone-*` (`game/_ranks.css`, via `getRankTone`); subject colours: `subject-theme-*`
  (`game/_system.css`, via `SubjectTag` / `subject-accent` / `subject-bar`)
- Always add `dark:` variants; dark is the default theme, light must stay accessible
- Radius: `rounded-lg` small, `rounded-xl` controls, `rounded-2xl` cards/panels/dialogs
- Icons only from `@/configs/icons.config` (semantic names; nav keys in the default map)
- Motion: brief, meaningful, and off under reduced motion

---

## UX Conventions

- Auth wording lives in `configs/authMessages.config.ts`; Supabase email templates in `supabase/templates`
  (any-device `token_hash` links). Keep them in the same friendly, student-first voice.
- Every async action shows progress (`loading`) and ends in a toast (`toastSuccess` / `toastError(msg, error)`)
- Errors say what happened **and what to do next**; empty states explain why and offer the next step
- Rewards: show `RewardDialog` with the server's `RewardSummary` (XP, level up, promotion) — never compute XP client-side
- Academic outcomes first: reports lead with scores, completion and "may need support"; XP/rank are engagement
- Destructive actions use `ConfirmDialog` (`warning`/`danger`) and say what can't be undone
- Refresh-safe flows: attempts resume, drafts survive reloads, repeated submits are no-ops
- Accessibility: native inputs, labels, `aria-*` on progress/state, keyboard navigation, skip link, AA contrast
- Responsive: mobile first; tables scroll horizontally; layouts collapse to one column

---

## Quality Checklist

- [ ] **Reuse**: existing components, services, stores, actions, SQL functions
- [ ] **Layers**: page → provider → store → UI; route → action → Supabase
- [ ] **Security**: permission + ownership checked server-side; nothing trusted from the browser; RLS on new tables
- [ ] **Idempotency**: every reward/consumption has a deterministic key and is applied in SQL
- [ ] **Types**: from `@types/`; no `any`; request schemas shared by route and service; DB types regenerated
- [ ] **Tests**: pure logic in `src/utils/*.test.ts`; SQL/RLS in `tests/db/*.test.ts`
- [ ] **Styling**: tokens, `classNames()`, `dark:` variants, icons from `icons.config`, reduced motion
- [ ] **Verified**: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and the change looked at in the browser

---

## Anti-Patterns (Do NOT Do)

- ❌ Compute or send XP, scores, correctness, rank or eligibility from the browser
- ❌ Write game state (`student_progress`, `xp_ledger`, `attempts` status, inventory) outside the SQL functions
- ❌ Call Supabase from the browser or expose keys with `NEXT_PUBLIC_`
- ❌ Return answer keys to students, or raw database rows to the browser
- ❌ Use `supabaseAdmin()` before authorising the user
- ❌ Hard-code rewards, thresholds or rank levels (they are admin-configurable data)
- ❌ Create a component/hook/util that already exists; add a library without a clear reason
- ❌ Call SWR directly in leaf components (use a `*SWRProvider` → store)
- ❌ Put business logic in `route.ts`; import `src/server/**` from client components
- ❌ Hard-code colours or URLs (use tokens and `configs/app.config`)
- ❌ Buttons that do nothing, placeholder features presented as working, or mock data in place of persistence
- ❌ Copy artwork, names or branding from Solo Leveling or any other franchise — all lore and emblems are original
- ❌ Semicolons, double quotes, or files formatted differently from Prettier
