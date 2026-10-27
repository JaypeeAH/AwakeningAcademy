import 'server-only'
import {
    adminProgressionPath,
    adminUsersPath,
    historyPath,
    homePath,
    profilePath,
    questsPath,
    getHelpArticlePath,
} from '@/configs/app.config'
import type { HelpFaq } from '@/@types/help/Help'

export const helpFaqs: HelpFaq[] = [
    // ── Students ──
    {
        question: 'I lost my streak. Can I get it back?',
        answer: `If you missed only **yesterday** and you've unlocked **Second Chance** with a charge left, choose **Protect your streak** on your [Dashboard](${homePath}). Otherwise the streak starts again from your next learning day. Your best streak and any milestone XP you've already earned are kept. See [Learning streaks](${getHelpArticlePath('learning-streaks')}).`,
        topic: 'student-progress',
        audiences: ['student'],
    },
    {
        question: 'Why can’t I start this quest?',
        answer: `The quest card on the [Quest Board](${questsPath}) says why:

- **Locked:** finish the quest it names first.
- **Upcoming:** it opens on the date shown.
- **In review:** your teacher is marking your last attempt.
- **No attempts left:** you've used every attempt.

If none of these apply, ask your teacher.`,
        topic: 'student-quests',
        audiences: ['student'],
    },
    {
        question: 'My XP didn’t go up after a quiz.',
        answer: `Quizzes, exams and boss battles pay XP the first time you **pass** (reach the passing score). Retaking a quest you've already passed doesn't pay again, unless your teacher allows it. Homework XP arrives when your teacher marks it. Every reward you've had is listed in the [Chronicle](${historyPath}) under **XP ledger**.`,
        topic: 'student-progress',
        audiences: ['student'],
    },
    {
        question: 'I closed the page in the middle of a quiz. Did I lose my answers?',
        answer: `No. Answers save as you go. Open the quest again from the [Quest Board](${questsPath}) and you carry on in the same attempt. On a timed quiz the clock keeps running while you're away, and when it runs out your saved answers are handed in.`,
        topic: 'student-quests',
        audiences: ['student'],
    },
    {
        question: 'I levelled up. Why wasn’t I promoted?',
        answer: `A new rank needs more than a level. It also asks for an average score, graded work passed and lessons completed. Your **Promotion trial** panel shows each requirement and which ones you've met. See [XP, levels and ranks](${getHelpArticlePath('xp-levels-and-ranks')}).`,
        topic: 'student-progress',
        audiences: ['student'],
    },
    {
        question: 'Can my classmates see my scores?',
        answer: `No. Only you and your teachers see your scores and answers. Leaderboards, when a teacher turns them on, show only XP earned that week. To stay off them, turn off **Show me on leaderboards** in your [Player Profile](${profilePath}).`,
        topic: 'student-social',
        audiences: ['student'],
    },
    {
        question: 'Where do I find my teacher’s comments?',
        answer: `You get a notification when your work is marked. Read every comment in the [Chronicle](${historyPath}) under **Feedback**.`,
        topic: 'student-quests',
        audiences: ['student'],
    },
    {
        question: 'I forgot my password.',
        answer: `On the sign-in page choose **Forgot your password?** and enter your email. You'll get a link to choose a new one.`,
        topic: 'student-start',
        audiences: ['student'],
    },
    // ── Teachers ──
    {
        question: 'Why can’t I publish my activity?',
        answer: `**Publish** stays locked until the **Publish checklist** beside the builder is clear. It lists each problem, such as a question with no right answer or an XP amount outside your school's range. Any question marked **AI draft** must also be reviewed first.`,
        topic: 'teach-build',
        audiences: ['teacher', 'admin'],
    },
    {
        question: 'A student can’t see my lesson.',
        answer: `Check that:

1. the **course** is published (see its header)
2. the **activity** is published
3. the student is on the course's **Roster** tab
4. its opening date has passed

If it has a prerequisite, the student sees it as **Locked** until they finish that first.`,
        topic: 'teach-build',
        audiences: ['teacher', 'admin'],
    },
    {
        question: 'Can I reuse a quiz or a question?',
        answer: `Reuse questions with the question bank: **Save to bank** on a good question, then **Add from bank** in any activity in the same course. Editing a copy never changes earlier results. Within an activity, the duplicate button on a question makes a copy to edit.`,
        topic: 'teach-build',
        audiences: ['teacher', 'admin'],
    },
    {
        question: 'Can I change a question after students have answered it?',
        answer: `Yes, you can edit its wording, options and answer. You can't delete a question students have already answered. If an activity needs a big change, archive it and create a new one; archiving keeps students' results.`,
        topic: 'teach-build',
        audiences: ['teacher', 'admin'],
    },
    {
        question: 'I forgot my password.',
        answer: `On the sign-in page choose **Forgot your password?** and enter your email. You'll get a link to choose a new one. Your role and courses stay as they were.`,
        topic: 'teach-start',
        audiences: ['teacher', 'admin'],
    },
    {
        question: 'How do I stop an old join code from working?',
        answer: `Choose **Reset code** in the course header. The old code stops working straight away. Students already in the course stay in it.`,
        topic: 'teach-start',
        audiences: ['teacher', 'admin'],
    },
    {
        question: 'Can students see the answer key?',
        answer: `Never before they hand in. Afterwards it depends on the activity's **feedback** setting: answers straight away, answers after the due date, or the score only. Rubrics are never shown to students.`,
        topic: 'teach-build',
        audiences: ['teacher', 'admin'],
    },
    {
        question: '“Draft with AI” says it isn’t set up.',
        answer: `AI drafting has to be switched on by your administrator. Until then you can write questions yourself or reuse them from the question bank. See [Draft questions with AI](${getHelpArticlePath('draft-questions-with-ai')}).`,
        topic: 'teach-build',
        audiences: ['teacher'],
    },
    {
        question: 'A student says their XP is wrong.',
        answer: `XP is never paid twice and never taken away by re-grading. Check the student's attempts on the activity's **Results** page: XP is paid when they pass. If something really went wrong, your school administrator can correct a student's XP, and the change is recorded.`,
        topic: 'teach-results',
        audiences: ['teacher'],
    },
    // ── Administrators ──
    {
        question: 'How do I make someone a teacher?',
        answer: `They sign up like anyone else. Then open [Users & roles](${adminUsersPath}), choose **Teacher** in their row and confirm.`,
        topic: 'admin-people',
        audiences: ['admin'],
    },
    {
        question: 'A student was given the wrong XP.',
        answer: `In [Users & roles](${adminUsersPath}), choose **Adjust XP** in their row. Enter the amount (negative to remove) and a reason the student will see. It's recorded in the audit log.`,
        topic: 'admin-people',
        audiences: ['admin'],
    },
    {
        question: 'I changed the level formula and students’ levels changed.',
        answer: `That's expected. Saving a new formula recalculates every student's level from the XP they already have, so some go up or down. Ranks already earned are kept. See [Progression rules](${getHelpArticlePath('progression-rules')}).`,
        topic: 'admin-rules',
        audiences: ['admin'],
    },
    {
        question: 'How do I switch on AI question drafts?',
        answer: `Add \`ANTHROPIC_API_KEY\` to the hosting environment variables and redeploy. See [Setup and operations](${getHelpArticlePath('setup-and-operations')}).`,
        topic: 'admin-ops',
        audiences: ['admin'],
    },
    {
        question: 'A family asked us to delete a student’s data.',
        answer: `Download their data first if your school needs a copy, then delete the account from [Users & roles](${adminUsersPath}). This can't be undone. See [Privacy requests](${getHelpArticlePath('privacy-requests')}).`,
        topic: 'admin-people',
        audiences: ['admin'],
    },
    {
        question: 'Someone gave me an error reference code.',
        answer: `Search your hosting logs (for example Vercel → Logs) for that code. Each unexpected error is logged once with its reference, the page and the error message.`,
        topic: 'admin-ops',
        audiences: ['admin'],
    },
    {
        question: 'People see “Too many tries in a short time”.',
        answer: `That's a rate limit protecting sign-in and other actions. The message says how long to wait. See [Security and rate limits](${getHelpArticlePath('security-and-rate-limits')}).`,
        topic: 'admin-ops',
        audiences: ['admin'],
    },
    {
        question: 'Can I change how much XP an activity can give?',
        answer: `Yes. In [Progression rules](${adminProgressionPath}), set the minimum, default and maximum for each kind of activity under **XP rewards**. Teachers choose amounts within that range.`,
        topic: 'admin-rules',
        audiences: ['admin'],
    },
]
