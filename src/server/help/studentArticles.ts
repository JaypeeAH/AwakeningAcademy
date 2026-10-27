import 'server-only'
import {
    achievementsPath,
    codexPath,
    coursesPath,
    historyPath,
    homePath,
    inventoryPath,
    profilePath,
    questsPath,
    getHelpArticlePath,
} from '@/configs/app.config'
import type { HelpArticle } from '@/@types/help/Help'

/** Help for students. Wording is for learners: short sentences, the real button and page names. */
export const studentArticles: HelpArticle[] = [
    {
        slug: 'welcome-to-the-academy',
        title: 'Welcome to The Awakening Academy',
        summary: 'What the Academy is, how learning turns into XP, and where everything lives in the side menu.',
        topic: 'student-start',
        audiences: ['student'],
        popular: true,
        body: `The Awakening Academy is where your teachers put lessons, quizzes and homework. Everything you finish earns **XP** (experience points), which raises your **level** and, together with your results, your **rank**.

## Your side menu

| Page | What it's for |
| --- | --- |
| [Dashboard](${homePath}) | Your status, your next quest, your learning streak and recent rewards |
| [Quest Board](${questsPath}) | Every lesson, quiz and exam from all your courses in one place |
| [Courses](${coursesPath}) | The courses you've joined, plus each course's guild and leaderboard |
| [Player Profile](${profilePath}) | Your subjects, titles and privacy settings |
| [Chronicle](${historyPath}) | Every bit of XP you've earned, your promotions and your teachers' comments |
| [Inventory & Skills](${inventoryPath}) | Items you've found and skills you've unlocked |
| [Codex](${codexPath}) | Secrets you've discovered, and clues to the ones still hidden |
| [Achievements](${achievementsPath}) | Milestones you've reached |

## Your first three steps

1. **Join a course** with the code your teacher gives you. See [Join a course](${getHelpArticlePath('join-a-course')}).
2. Open the **Quest Board** and start the first quest that says it's available.
3. Finish it and watch your XP go up on the Dashboard.

> [!TIP]
> Learning matters more than XP. Your teachers see your scores and your work; XP and ranks are there to make the journey more fun.`,
    },
    {
        slug: 'join-a-course',
        title: 'Join a course',
        summary: 'Use your teacher’s join code or class link to add a course, and what to do if the code doesn’t work.',
        topic: 'student-start',
        audiences: ['student'],
        popular: true,
        body: `Your teacher shares a course with you in one of three ways.

## With a class link

Open the link your teacher sent.

- **New to the Academy?** The sign-up page opens with the code already filled in. Create your account and you join the course in one step.
- **Already have an account?** Sign in and the course is added for you.

## With a join code

1. Go to [Courses](${coursesPath}).
2. Choose **Join a course**.
3. Type the code exactly as your teacher wrote it and choose **Join**.

The course's published quests appear on your [Quest Board](${questsPath}) straight away.

## Your teacher adds you

Teachers can also add you by your sign-in email. The course simply appears in your list.

> [!NOTE]
> If a code says it isn't valid, check for mix-ups like **0** and **O**. Teachers can make a new code at any time, which stops the old one working, so ask your teacher for the latest one.`,
    },
    {
        slug: 'dashboard-and-quest-board',
        title: 'Your Dashboard and the Quest Board',
        summary: 'Read your status window, find your next quest, and understand what each quest state means.',
        topic: 'student-start',
        audiences: ['student'],
        body: `## The Dashboard

Your [Dashboard](${homePath}) is the first page you see after signing in. It shows:

- your **status window**: level, XP to the next level and your rank
- your **next quest**, so you can carry on with one click
- your **learning streak** for the last two weeks
- your progress in each course and your class title
- **recent rewards** from your Chronicle

## The Quest Board

The [Quest Board](${questsPath}) lists every published lesson, quiz, exam and homework from all your courses. Filter it by state or by course, or search by name.

| State | What it means |
| --- | --- |
| Available | Ready to start |
| In progress | You've started an attempt. Open it to carry on where you left off |
| Locked | Finish the quest it names first (your teacher set it as a prerequisite) |
| Upcoming | It opens on the date shown |
| In review | You've handed it in and your teacher is marking it |
| Completed | Done. You can often replay it for practice |

> [!TIP]
> Due dates are shown on each quest card. Work that is overdue is flagged for your teacher, so start early.`,
    },
    {
        slug: 'lessons-quizzes-exams-homework',
        title: 'Lessons, quizzes, exams and homework',
        summary:
            'How each kind of quest works: attempts, saving, time limits, due dates and when you see your answers.',
        topic: 'student-quests',
        audiences: ['student'],
        popular: true,
        body: `## Lessons

Read the lesson, watch any videos, then choose **Complete lesson** at the bottom. You earn the lesson's XP once. Videos only start loading when you press play.

## Quizzes and exams

| Kind | What to expect |
| --- | --- |
| Practice quiz | Low stakes. Usually unlimited tries, answers shown, and it doesn't count toward your rank |
| Quiz | A graded check that counts toward your mastery and rank |
| Exam | A formal test. Few attempts, maybe a time limit, and answers are often hidden |
| Boss battle | A big graded challenge in phases. See [Boss battles and team quests](${getHelpArticlePath('boss-battles-and-team-quests')}) |

While you answer:

- **Your answers save as you go.** The line under the timer says *All answers saved*. If it says *Not saved — check your connection*, don't close the page until it saves.
- **You can leave and come back.** Open the quest again to resume the same attempt.
- **Timed attempts** count down on the screen. When time runs out, your attempt is handed in with the answers you've saved.
- **Attempts are limited** on some quests. The quest card shows how many you have left.

You earn the quest's XP the first time you **pass** (reach the passing score). A very high score can also earn a one-time **high-score bonus**.

## When you see the answers

Your teacher chooses one of these for each quiz:

- **Straight away:** you see what was right after you hand in.
- **After the due date:** answers appear once the due date has passed.
- **Score only:** you see your score but not the answers.

## Homework

Homework can ask for written answers and file uploads. After you hand it in, it shows **In review** until your teacher marks it. You get a notification with your score, their comments and your XP when they do. Read their comments any time in the [Chronicle](${historyPath}) under **Feedback**.`,
    },
    {
        slug: 'boss-battles-and-team-quests',
        title: 'Boss battles and team quests',
        summary: 'Fight a boss in phases, and complete team quests together with your guild.',
        topic: 'student-quests',
        audiences: ['student'],
        body: `## Boss battles

A boss battle is a big graded challenge split into **phases**, for example "Fractions", "Decimals" and "Final form".

- You see the boss and the current phase as you answer.
- The boss's **HP bar** appears only after you hand in. It drops with your score, so it never gives away which answers were right.
- Boss battles give a lot of XP and count toward your rank, like quizzes and exams.
- Skills and Easter Bunny skips can't be used in boss battles.

## Team quests

A team quest is a goal for your whole **guild**. Your teacher picks some activities and decides how many guild members must finish them: everyone, or at least a set number.

1. Open the team quest to see who in your guild has finished and how many are needed.
2. Finish the activities yourself (graded ones must be passed).
3. When your guild reaches the goal, **every member** gets the team quest's XP once.

Not in a guild yet? See [Guilds and leaderboards](${getHelpArticlePath('guilds-and-leaderboards')}).`,
    },
    {
        slug: 'xp-levels-and-ranks',
        title: 'XP, levels and ranks',
        summary: 'Where XP comes from, how levels work, and what it takes to be promoted from F-Rank to SSS.',
        topic: 'student-progress',
        audiences: ['student'],
        popular: true,
        body: `## Earning XP

You earn XP for:

- completing lessons
- passing quizzes, exams, homework and boss battles (the first time you pass)
- a very high score (a one-time high-score bonus)
- learning-streak milestones, achievements, secrets and team quests

Every reward is recorded once. Refreshing the page or clicking twice never pays twice. See every entry in the [Chronicle](${historyPath}) under **XP ledger**.

## Levels

Your total XP decides your **level**. Each level needs a little more XP than the one before. Your status window shows how far you are from the next level.

## Ranks

Ranks go from **F-Rank** up to **SSS-Rank**. A promotion needs more than XP. Your **Promotion trial** panel lists what the next rank asks for, such as:

- reaching a certain level
- an average score on graded assessments (quizzes, exams, homework and boss battles)
- passing a number of graded assessments
- completing a number of lessons

When every requirement is met, you're promoted automatically. Your promotions are listed in the Chronicle under **Promotions**.

> [!NOTE]
> Practice quizzes are for practice: they give XP but don't count toward your average score or your rank.`,
    },
    {
        slug: 'class-titles-and-subject-paths',
        title: 'Class titles and subject paths',
        summary: 'How studying a subject grows your class, and how to choose the title others see.',
        topic: 'student-progress',
        audiences: ['student'],
        body: `Every course belongs to a subject, such as Mathematics or Science. Earning XP in a course starts your **path** in that subject.

## Climbing a path

Each subject has a ladder of **titles**, for example Apprentice Mathematician, then Advanced Mathematician. Higher titles ask for two things:

- a **subject level**, from the XP you've earned in that subject
- **mastery**, your average best score on that subject's graded work

So a title like "Advanced Mathematician" really means you've done well in maths, not just spent time there.

## Choosing your title

1. Open your [Player Profile](${profilePath}).
2. Under **Choose your title**, pick any title you've unlocked.
3. Choose **Use strongest** to go back to showing your best one automatically.

**Your subjects** on the same page shows each path and what the next title needs.`,
    },
    {
        slug: 'learning-streaks',
        title: 'Learning streaks',
        summary:
            'Keep a streak by learning on consecutive days, earn milestone XP, and protect a streak with Second Chance.',
        topic: 'student-progress',
        audiences: ['student'],
        body: `Your **learning streak** counts the days in a row on which you completed a lesson or handed in work. You'll find it on your [Dashboard](${homePath}).

- Days follow your school's time zone, so "today" means today at school.
- The panel shows the last two weeks: filled days are days you learned.
- Reaching a **milestone** (for example 3, 7 or 14 days in a row) gives XP. Each milestone pays once.

## Missed a day?

If you missed **yesterday** but learned the day before, you may be able to save your streak:

1. On the Dashboard, choose **Protect your streak**.
2. Confirm **Use Second Chance**.

This uses one charge of the **Second Chance** skill to fill the missed day, so your streak carries on. The button only appears when you've unlocked Second Chance, it has a charge, and there's a day it can fill. Charges recharge over time.

> [!TIP]
> Learn something today after protecting your streak, or it will still break tomorrow.`,
    },
    {
        slug: 'items-skills-and-the-easter-bunny',
        title: 'Items, skills and the Easter Bunny',
        summary:
            'What’s in your inventory, how skills unlock and recharge, and how to spend an Easter Bunny to skip a question.',
        topic: 'student-rewards',
        audiences: ['student'],
        body: `Open [Inventory & Skills](${inventoryPath}) to see what you have.

## Items

Items mostly come from **secrets** your teachers hide. Your bag shows each item and how many you hold, and the item history shows where each one came from.

## The Easter Bunny

The Easter Bunny is a rare item. In a quiz that allows it:

1. On the question, choose **Easter Bunny** in the bar of skills and items. The number shows how many you have.
2. Read what it does and confirm.

The question is marked **skipped**. It doesn't count for or against you: it's left out of your score. Each Easter Bunny can be spent once. Skips never work on exams, homework or boss battles.

## Skills

Skills unlock as you level up, rank up and find secrets. Each has charges that recharge over time.

| Skill | What it does |
| --- | --- |
| Insight | In a practice quiz, removes one wrong option |
| Knowledge Echo | Points you back to a lesson you've completed that relates to the quiz |
| Time Dilation | Adds a few minutes to a timed practice attempt, once per attempt |
| Second Chance | One extra attempt on a practice quiz when you've used them all, or protects your streak |
| Overdrive | Arm it before a quiz you haven't completed for bonus XP when you first pass |
| Dungeon Sense | Reveals the clue to one undiscovered secret in a course |
| Guild Leader | Lets you found a guild, when your teacher allows it |

Use skills from the bar above the questions in a quiz. Your teacher decides which quests allow skills, and they never work on exams, homework or boss battles.`,
    },
    {
        slug: 'secrets-and-the-codex',
        title: 'Secrets and the Codex',
        summary:
            'Hunt for secrets your teachers hide in lessons, speak secret phrases, and track your finds in the Codex.',
        topic: 'student-rewards',
        audiences: ['student'],
        body: `Your teachers can hide **secrets** in their courses. Finding one shows a **Secret discovered!** message with a reward, such as XP or an item.

## Ways to find secrets

- **Hidden objects:** look for a faint ✦ in a lesson and click it.
- **Hidden sections:** some secrets appear when you read far enough into a lesson.
- **Secret phrases:** type a phrase into **Speak a secret phrase** in your [Codex](${codexPath}). Capital letters, spaces and punctuation don't matter.
- **Doing well:** some secrets appear when you finish quests in a certain order, reach a score, keep a streak, collect a set of items, or reach a goal with your classmates.

## The Codex

The [Codex](${codexPath}) lists every secret you've found. Secrets you haven't found show as **???**, sometimes with a clue from your teacher. Each secret can be found once.

> [!TIP]
> The **Dungeon Sense** skill reveals the clue to one hidden secret.`,
    },
    {
        slug: 'achievements',
        title: 'Achievements',
        summary: 'Milestones that unlock by themselves as you learn, including hidden ones.',
        topic: 'student-rewards',
        audiences: ['student'],
        body: `[Achievements](${achievementsPath}) are milestones you earn automatically, for example:

- completing your first lesson
- a perfect score on graded work
- beating a boss
- a long learning streak
- finishing a team quest or discovering secrets

You don't need to claim them. When you earn one you see a short celebration, and some give XP. Each achievement is earned once.

Some achievements are **hidden** until you earn them, so keep exploring. The Achievements page shows how far along you are with the ones you can see.`,
    },
    {
        slug: 'guilds-and-leaderboards',
        title: 'Guilds and leaderboards',
        summary:
            'Join a guild in a course, work on team quests together, and decide whether you appear on leaderboards.',
        topic: 'student-social',
        audiences: ['student'],
        popular: true,
        body: `## Guilds

A guild is a small team inside one course. Open the course from [Courses](${coursesPath}) and choose the **Guild** tab.

- **Joining:** your teacher may put you in a guild, or you can ask to join an open one. Your teacher approves each request.
- **One guild per course:** you can be in one guild in each course. You can leave from the Guild tab.
- **Founding a guild:** if your teacher allows it and you've unlocked the **Guild Leader** skill, choose **Found a guild** under **Start your own guild**. Your teacher approves it first.

Guilds work together on **team quests**. See [Boss battles and team quests](${getHelpArticlePath('boss-battles-and-team-quests')}).

## Leaderboards

Leaderboards are **off** unless your teacher turns them on for a course. Find one on the course's **Leaderboard** tab.

- It shows only the **XP earned in that course this week**. It never shows scores or answers.
- Weeks start on Monday.
- Your teacher chooses whether it shows initials or display names.
- Guild totals are shown too.

## Staying off leaderboards

1. Open your [Player Profile](${profilePath}).
2. Under **Leaderboards**, turn off **Show me on leaderboards**.

You'll be hidden from every leaderboard, and you can still see your own XP.`,
    },
    {
        slug: 'your-profile-and-data',
        title: 'Your profile and your data',
        summary:
            'Change your display name, download a copy of your data, and how to ask for your account to be deleted.',
        topic: 'student-start',
        audiences: ['student'],
        body: `Everything about your account is on your [Player Profile](${profilePath}).

## Your display name

Your display name is what teachers and classmates see. Change it at the top of your profile. Pick something your teacher will recognise.

## Downloading your data

Under **Your data**, choose **Download my data**. You get a file with everything the Academy stores about you: your profile, progress, answers, rewards and more.

## Deleting your account

You can't delete your own account. Ask your teacher or school administrator. They can delete it, along with your XP, answers, uploads and rewards. This can't be undone.

## What we keep

The Academy stores only your display name, your sign-in email and your learning. It never asks for photos, birthdays, addresses or phone numbers. Read more in the **Privacy Policy**, linked at the bottom of every page.`,
    },
]
