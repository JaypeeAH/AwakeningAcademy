import 'server-only'
import {
    adminAchievementsPath,
    adminAuditPath,
    adminItemsPath,
    adminProgressionPath,
    adminUsersPath,
    getHelpArticlePath,
} from '@/configs/app.config'
import type { HelpArticle } from '@/@types/help/Help'

/** Help for administrators: people, school-wide rules and running the Academy. */
export const adminArticles: HelpArticle[] = [
    {
        slug: 'users-and-roles',
        title: 'Users and roles',
        summary: 'Give teachers and administrators their role, find people, and correct a student’s XP.',
        topic: 'admin-people',
        audiences: ['admin'],
        popular: true,
        body: `Everyone signs up as a **student**. Roles are only ever changed here, never by what someone types at sign-up.

## Change a role

1. Open [Users & roles](${adminUsersPath}). Search by name or email, or filter by role.
2. Choose a new role in the person's row and confirm.

| Role | Can |
| --- | --- |
| Student | Join courses, learn, earn XP |
| Teacher | Create and manage their own courses, mark work, see their students' results |
| Administrator | Everything a teacher can do in every course, plus users, progression rules, items, achievements and the audit log |

A student who becomes staff keeps their XP and history but stops taking part in quests. You can't change your own role; ask another administrator.

## Adjust a student's XP

Use **Adjust XP** to correct mistakes, such as a reward lost to an outage or one granted in error.

- Enter the amount (negative to remove) and a **reason**. The student sees both.
- XP can't go below zero, and ranks already earned are never taken away.
- Every role change and XP adjustment is recorded in the [Audit log](${adminAuditPath}).`,
    },
    {
        slug: 'privacy-requests',
        title: 'Privacy requests: data downloads and account deletion',
        summary: 'Download everything stored about a person, or permanently delete an account and its data.',
        topic: 'admin-people',
        audiences: ['admin'],
        body: `## Download a person's data

Students and teachers can download their own data from **Player Profile → Your data**. To download anyone's, open [Users & roles](${adminUsersPath}) and choose the download button in their row. You get a JSON file with their profile, progress, answers, rewards and more. The download is recorded in the audit log.

## Delete an account

1. In [Users & roles](${adminUsersPath}), choose the delete button in the person's row.
2. Type their email address to confirm, then choose **Delete permanently**.

This permanently removes:

- the account and profile
- XP, levels and ranks
- enrolments, attempts, answers and uploaded homework files
- rewards, inventory, skills, discoveries, achievements, streaks and guild memberships
- notifications

Courses and activities a teacher created stay, with no creator recorded, so students keep their classes. The deletion is recorded in the audit log, which keeps only the account's id and role.

> [!WARNING]
> Deletion can't be undone. Download the person's data first if your school needs a copy. You can't delete your own account this way.`,
    },
    {
        slug: 'progression-rules',
        title: 'Progression rules',
        summary: 'Tune the level formula, rank requirements, XP ranges, the school time zone and streak milestones.',
        topic: 'admin-rules',
        audiences: ['admin'],
        popular: true,
        body: `[Progression rules](${adminProgressionPath}) apply to the whole school. Change them, then choose **Save rules**.

## Level formula

- **XP for level 1 → 2** and **Extra XP per level** set how much XP each level costs.
- **Maximum level** caps the climb.
- **High-score bonus from** sets the score (for example 90%) that earns the one-time high-score bonus.

The preview shows what the first levels will cost. Changing the formula asks you to confirm **Save and recalculate**: each student's level is worked out again from the XP they already have, so some levels may go up or down.

## Rank ladder

Ranks run from F to SSS. For each one set its name and description, and what a promotion needs: a minimum **level**, **average score** on graded work, number of **graded assessments passed** and **lessons completed**. Students are promoted automatically once they meet every requirement.

## XP rewards

For each source of XP (lessons, quizzes, exams, homework, boss battles, secrets and more) set a **minimum**, **default** and **maximum**. Teachers choose an amount within this range for each activity.

## Learning days & streaks

- **Time zone:** decides when a school day starts, for streaks and for weekly leaderboards (which start on Monday).
- **Streak milestones:** the streak lengths that pay XP, such as 3, 7 and 14 days.

Every change is recorded in the audit log.`,
    },
    {
        slug: 'items-and-skills',
        title: 'Items and skills',
        summary: 'Create items for secrets to give out, and tune when skills unlock, their charges and recharge time.',
        topic: 'admin-rules',
        audiences: ['admin'],
        body: `Manage both in [Items & skills](${adminItemsPath}).

## Items

Items are what secrets give students. Choose **New item** and set its name, code, description, kind (**consumable** or **collectible**), rarity and sort order.

> [!NOTE]
> The **Easter Bunny** is the item with a built-in effect: students spend one to skip a question in a quiz that allows it. Other items you create are rewards students collect and show in their inventory, and they can be used in **item set** secrets (holding several items at once).

## Skills

Skills unlock automatically. For each skill you can change:

- its name, description and rarity
- **Unlocks at:** the level and rank needed
- **Charges** and how long they take to recharge
- the effect's size where it has one (extra minutes for Time Dilation, bonus for Overdrive)
- **Enabled**, to switch a skill off for everyone

Skills never work on exams, homework or boss battles, whatever their settings.`,
    },
    {
        slug: 'manage-achievements',
        title: 'Manage achievements',
        summary: 'Create achievements students earn automatically, with conditions, optional XP, and hidden ones.',
        topic: 'admin-rules',
        audiences: ['admin'],
        body: `Students earn achievements automatically when they meet the condition. It's checked whenever they finish a lesson, hand in a quiz or exam, or have work graded, and each achievement is earned once.

1. Open [Achievements](${adminAchievementsPath}) under Administration and choose **New achievement**.
2. Give it a name, code, description, icon and rarity.
3. Under **Earned for**, choose its condition, for example:
    - lessons completed, or graded activities passed
    - 100% scores on graded activities, or boss battles won
    - a learning streak (best ever), team quests completed or secrets discovered
    - a level, a rank or total XP reached, or courses joined
4. Optionally set an **XP reward**.
5. Turn on **Hidden** to keep it a surprise until it's earned.

Students who already meet a new achievement's condition get it the next time they finish a lesson, hand in a quiz or exam, or have work graded, because that's when achievements are checked.`,
    },
    {
        slug: 'audit-log',
        title: 'The audit log',
        summary: 'See who changed roles, XP, progression rules or published content, and when.',
        topic: 'admin-ops',
        audiences: ['admin'],
        body: `The [Audit log](${adminAuditPath}) records consequential changes so results stay fair and accountable:

- role changes, account deletions and data downloads
- XP adjustments
- progression rule changes
- courses created and activities published, unpublished or archived

Filter it by record type, and choose **Details** on a row to see exactly what changed. XP rewards themselves are recorded in each student's own ledger (their Chronicle), not here.`,
    },
    {
        slug: 'security-and-rate-limits',
        title: 'Security and rate limits',
        summary: 'How the Academy protects accounts and students’ data, and the limits that stop misuse.',
        topic: 'admin-ops',
        audiences: ['admin'],
        body: `## How data is protected

- The browser never talks to the database directly. Every request goes through the Academy's server, which checks who you are and what your role allows.
- Scores, XP, answer keys and eligibility are decided on the server, never trusted from the browser. Answer keys and rubrics are never sent to students.
- Homework uploads and lesson images are private to the course.
- Videos load only after a student presses play, and YouTube uses its privacy-enhanced player.
- Leaderboards are off by default and show only weekly XP.

## Rate limits

Limits stop guessing and misuse. They apply across the whole site:

| Action | Limit |
| --- | --- |
| Sign-in | 20 per 5 min per device, 8 per 5 min per account |
| Sign-up | 6 per hour per device |
| Password and confirmation emails | 6 per 15 min per device, 3 per 15 min per address |
| Hand-ins | 30 per minute per student |
| Secret phrases | 10 per minute per student |
| AI drafts | 10 per hour and 40 per day per teacher |
| Data downloads | 5 per hour per person |

Someone who hits a limit sees a message telling them how long to wait. Devices and emails are stored only as fingerprints.

## Errors

Unexpected errors show a short **reference code**. If someone quotes one, find the details in your hosting logs. See [Setup and operations](${getHelpArticlePath('setup-and-operations')}).`,
    },
    {
        slug: 'setup-and-operations',
        title: 'Setup and operations',
        summary: 'Environment settings, database migrations, switching on AI drafts, and error alerts.',
        topic: 'admin-ops',
        audiences: ['admin'],
        popular: true,
        body: `These tasks are for whoever hosts the Academy (usually on Vercel with Supabase). Full details are in \`docs/OPERATIONS.md\` in the project.

## Environment variables

Set these in the hosting dashboard, then redeploy:

| Variable | Needed | What it does |
| --- | --- | --- |
| \`SUPABASE_URL\` | Yes | Your Supabase project address |
| \`SUPABASE_PUBLISHABLE_KEY\` | Yes | Used for signed-in sessions |
| \`SUPABASE_SECRET_KEY\` | Yes | Server only. Never share or commit it |
| \`ANTHROPIC_API_KEY\` | No | Switches on **Draft with AI** for teachers |
| \`AI_DRAFT_MODEL\` | No | Changes the drafting model |
| \`AI_DRAFTS\` | No | Set to \`off\` to disable drafting even with a key |
| \`ERROR_WEBHOOK_URL\` | No | Sends a short alert for each unexpected error to Slack, Discord or similar |

## Database migrations

Run every file in \`supabase/migrations\` in name order, once each, in the Supabase SQL editor. Never edit one that's already been run. Back up the database first.

## AI drafts

Add \`ANTHROPIC_API_KEY\` and redeploy. Teachers then see **Draft with AI**. Drafts must be reviewed before publishing, only lesson text is sent (never student data), and every request is logged and rate-limited.

## Error alerts

Each unexpected error is logged with a reference code users can quote. Set \`ERROR_WEBHOOK_URL\` to also get an alert. Alerts never include names, emails or what someone typed.

See also [Backups and restore](${getHelpArticlePath('backups-and-restore')}).`,
    },
    {
        slug: 'backups-and-restore',
        title: 'Backups and restore',
        summary: 'What to back up (database, files, settings), how often, and how to restore.',
        topic: 'admin-ops',
        audiences: ['admin'],
        body: `## What to back up

1. **The database.** Supabase takes daily backups on paid plans. On the free plan, take your own with \`supabase db dump\` or \`pg_dump\`. Do it before each term and before running new migrations.
2. **Files.** Homework uploads live in the private \`submissions\` bucket and lesson images in \`lesson-media\`. Database backups don't include files, so copy the buckets too.
3. **Settings.** Keep a private copy of the environment variables and the email templates.

## Restore

1. Create or choose the target Supabase project.
2. Restore the database dump (or use the dashboard's restore for managed backups).
3. Copy the storage buckets back.
4. Point the environment variables at the restored project and redeploy.
5. Check sign-in, a lesson, a quiz hand-in and a homework download.

> [!TIP]
> Practise a restore once a term on a spare project, so you know it works before you need it.`,
    },
]
