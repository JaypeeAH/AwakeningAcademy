import 'server-only'
import { analyticsPath, coursesPath, getHelpArticlePath, gradingPath } from '@/configs/app.config'
import type { HelpArticle } from '@/@types/help/Help'

/** Help for teachers. Administrators see these too, because they can open and manage any course. */
export const teacherArticles: HelpArticle[] = [
    {
        slug: 'create-a-course',
        title: 'Create a course and invite your class',
        summary: 'Set up a course, add modules, publish it, and share the class link or join code with students.',
        topic: 'teach-start',
        audiences: ['teacher', 'admin'],
        popular: true,
        body: `## Before you start

Everyone signs up as a student. Ask your school administrator to switch your account to **Teacher**.

## Create the course

1. Go to [Courses](${coursesPath}) and choose **New course**.
2. Give it a title and pick its **subject**. The subject decides which class path students grow, for example Mathematics leads to Apprentice Mathematician, then Advanced Mathematician.
3. Choose **Create course**.

## Add structure and publish

1. On the **Content** tab, choose **New module** for each chapter or unit.
2. Add lessons and quizzes with **New activity**. See [Modules and activities](${getHelpArticlePath('modules-and-activities')}).
3. **Publish** the course from its header when you're ready. Students only see published courses and published activities.

## Invite students

The course header shows the **join code** and three buttons:

- **Copy class link:** new students sign up and join in one step; students with an account join straight away.
- **Copy code:** students enter it under **Courses → Join a course**.
- **Reset code:** makes a new code. The old one stops working, which is useful if a code was shared too widely.

You can also add a student by their sign-in email on the **Roster** tab, with **Add student**.

> [!TIP]
> Want to see a finished course first? [Try a sample course](${getHelpArticlePath('try-a-sample-course')}).`,
    },
    {
        slug: 'try-a-sample-course',
        title: 'Try a sample course',
        summary:
            'Add a ready-made Mathematics, Biology, Solar System or Ancient Egypt course to explore every feature.',
        topic: 'teach-start',
        audiences: ['teacher', 'admin'],
        popular: true,
        body: `Sample courses show what a finished course looks like: lessons with images, videos and tip boxes, and a quiz with answer keys and learning objectives. The Mathematics sample also has a boss battle.

1. Go to [Courses](${coursesPath}) and choose **Add a sample course**.
2. Pick a sample: **Mathematics**, **Biology**, **Solar System** or **Ancient Egypt**.
3. Choose **Add to my courses**. It takes a few seconds, then the new course opens. You're its teacher, and it's already published.

The sample is your own copy, so change anything you like:

- Open a lesson in the Quest Builder to see how images, videos and tip boxes are built.
- Open the quiz to see question types, answer keys and objectives.
- Use **Student preview** to see exactly what students get.

To try it with students, share its join code like any other course. See [Create a course and invite your class](${getHelpArticlePath('create-a-course')}).

> [!NOTE]
> Images and videos in the samples are linked from public sources and credited in each caption. Check that your school allows YouTube before you use the videos in class.`,
    },
    {
        slug: 'modules-and-activities',
        title: 'Modules and activities',
        summary:
            'The kinds of activity you can create, their settings, and how publishing, archiving and deleting work.',
        topic: 'teach-build',
        audiences: ['teacher', 'admin'],
        body: `On a course's **Content** tab, choose **New activity**, pick a kind and choose **Create & open builder**. The Quest Builder opens.

## Kinds of activity

| Kind | Use it for | Marked by |
| --- | --- | --- |
| Lesson | Reading, images, videos, tip boxes and tables | Completing it |
| Practice quiz | Low-stakes practice: unlimited tries, answers shown, doesn't count toward rank | Automatically |
| Quiz | Graded checks that count toward mastery and rank | Automatically |
| Exam | Formal tests: limited attempts, optional time limit, answers usually hidden | Automatically, plus you for essays |
| Homework | Written answers and file uploads | You |
| Boss battle | A big multi-topic challenge in phases | Automatically, plus you for essays |
| Team quest | A guild goal over activities you choose | Automatically |

## Settings

In **Details** and the settings beside it you choose:

- **XP**, within the range your administrator allows
- difficulty, estimated time, and **opening** and **due** dates
- the **attempt limit**, **passing score** and an optional **time limit**
- **prerequisites**, such as "finish the lesson before the quiz"
- **feedback**: answers straight away, answers after the due date, or the score only
- whether **skills** and **Easter Bunny skips** are allowed (never on exams, homework or boss battles)

## Publishing

- **Publish** stays locked until the **Publish checklist** is clear.
- **Unpublish (back to draft)** hides an activity again; **Archive** retires it but keeps students' results.
- **Delete** only works before any student has started an activity. After that, archive it instead.
- Reorder activities with the arrows on the Content tab.`,
    },
    {
        slug: 'write-a-lesson',
        title: 'Write a lesson',
        summary:
            'Use the visual lesson editor to add headings, images, YouTube or Vimeo videos, tip boxes, tables and secrets.',
        topic: 'teach-build',
        audiences: ['teacher', 'admin'],
        popular: true,
        body: `The lesson editor works like a word processor: what you see is what students get.

## Text

- The first menu switches between normal text, title, heading and subheading.
- Use the toolbar for bold, italic, links, lists, quotes and code.
- **Ctrl+B**, **Ctrl+I**, **Ctrl+Z** (undo) and **Ctrl+S** (save) work as usual.

## The Insert menu

- **Image:** upload one (PNG, JPEG, GIF or WebP, up to 5 MB), reuse one from this course, or link to one on the web. You can also paste or drag an image into the lesson. Give each image a short description for students who use screen readers, and an optional caption. Uploaded images are private to the course.
- **Video:** paste a YouTube or Vimeo link. Videos aren't uploaded. Students see a play button, and nothing loads from YouTube or Vimeo until they press it. A link with a start time (…?t=90) starts there.
- **Tip, Note, Important or Warning box:** with words selected, they go into the box; otherwise a new box appears below. Change a box's type from its label, or remove it with the bin.
- **Table:** click a cell to type and press Tab to move on. A **Table** menu adds or removes rows and columns.
- **Divider line.**
- **Secrets:** place this lesson's hidden objects and sections. Create them in the course's **Secrets** tab first. See [Secrets and the Easter Bunny](${getHelpArticlePath('secrets-and-easter-eggs')}).

## Views

- **Preview** shows the lesson exactly as students see it.
- **Full screen** gives you more room.
- **Markdown** shows the same lesson as plain text, for anyone who prefers typing formatting.

The reading time under the editor helps you judge the length.

> [!TIP]
> Short lessons with one idea each, followed by a quick practice quiz, work better than one long lesson.`,
    },
    {
        slug: 'build-quizzes-and-exams',
        title: 'Build quizzes and exams',
        summary:
            'Question types, answer keys and rubrics, learning objectives, the question bank and the publish checklist.',
        topic: 'teach-build',
        audiences: ['teacher', 'admin'],
        body: `## Question types

| Type | How it's marked |
| --- | --- |
| Multiple choice | Automatically: one right option |
| Multiple select | Automatically: every right option |
| True/false | Automatically |
| Short answer | Automatically against your accepted answers. Numbers match by value, so 0.5 = .5 |
| Essay | By you, with your rubric |
| File upload | By you, with your rubric |

For each question set the points, the right answers and an optional **explanation** students see when answers are shown. Give essays and uploads a **rubric**. Answer keys and rubrics are never shown to students.

## Learning objectives

Add the activity's learning objectives in **Details**, then link each question to the objective it checks. [Analytics](${analyticsPath}) uses these links to show which objectives your class has mastered.

## The question bank

- **Save to bank** keeps a good question for reuse.
- **Add from bank** copies it into another activity. Editing the copy never changes earlier results.
- Manage saved questions on the course's **Question bank** tab.

## Before you publish

- The **Publish checklist** lists anything a student would trip over, such as a question with no right answer. **Publish** stays locked until it's clear.
- **Student preview** shows exactly what students will see.

Want a head start? See [Draft questions with AI](${getHelpArticlePath('draft-questions-with-ai')}).`,
    },
    {
        slug: 'draft-questions-with-ai',
        title: 'Draft questions with AI',
        summary: 'Turn a lesson or pasted text into draft questions, then review each one before you can publish.',
        topic: 'teach-build',
        audiences: ['teacher', 'admin'],
        body: `**Draft with AI** writes first drafts of questions from your own material. It's a starting point: you check every question before students see it.

> [!NOTE]
> Your administrator has to switch AI drafting on. If the dialog says it isn't set up, ask them.

## Draft questions

1. In an assessment's questions, choose **Draft with AI**.
2. Pick one of the course's lessons, or paste text.
3. Choose how many questions (up to 10), which types, a difficulty and the objectives to cover.
4. The drafts are added to the activity, each marked **AI draft**.

## Review them

For each draft, check the question, the answers and the explanation. Edit anything that's wrong, then choose **Mark as reviewed**. Delete any you don't want.

- Nothing is saved until you choose **Save**.
- The activity can't be published while any draft is unreviewed.

## Good to know

- The AI only sees the lesson or text you give it, never anything about your students.
- Each teacher can make a limited number of drafting requests per hour and per day.
- Drafts can be wrong. You are the author of every question you publish.`,
    },
    {
        slug: 'grade-work',
        title: 'Grade work and give feedback',
        summary: 'Mark essays and uploads from the marking queue, add comments, and re-grade without double-paying XP.',
        topic: 'teach-results',
        audiences: ['teacher', 'admin'],
        popular: true,
        body: `Essays and file uploads wait for you in [Grading](${gradingPath}), oldest first. Everything else is marked automatically.

## Mark an attempt

1. Open [Grading](${gradingPath}) and choose an attempt from the **Marking queue**.
2. For each answer, give points (up to the question's maximum) and, if you like, a comment. Use the rubric you wrote as a guide.
3. Add overall feedback for the student.
4. Choose **Save marks**.

The student gets a notification with their score, your comments and any XP they've earned. They can read your comments again in their Chronicle.

## Changing a grade

Open the attempt again, change the marks and choose **Update marks**. The score updates, but XP is never paid twice or taken away.

> [!NOTE]
> Questions a student skipped with the Easter Bunny show as skipped and can't be marked. They don't count for or against the student.`,
    },
    {
        slug: 'results-progress-and-analytics',
        title: 'Results, progress and analytics',
        summary: 'See each activity’s results, the course gradebook, and analytics by learning objective.',
        topic: 'teach-results',
        audiences: ['teacher', 'admin'],
        body: `Three places show how your class is doing. All of them lead with learning (scores, objectives, finished work) and keep XP separate.

## An activity's results

On the **Content** tab, choose **Results** beside a quiz, exam or homework. You see each student's attempts and the questions the class finds hardest. Skipped answers are counted separately and never as correct.

## The Progress tab

A course's **Progress** tab is your gradebook. It flags students who may need support, based on scores and overdue work, not on XP.

## Analytics

[Analytics](${analyticsPath}) goes deeper into one course. Filter by module, student and dates to see:

- **Score distribution** across graded work
- **Performance by learning objective**, weakest first (link questions to objectives to use this)
- **Most-missed questions**
- **Overdue** and **Not finished yet** work, with names
- **Retries**

Under **Engagement**, it also shows questions skipped with the Easter Bunny and the XP earned in the course.`,
    },
    {
        slug: 'boss-battles-and-team-quests-setup',
        title: 'Set up boss battles and team quests',
        summary: 'Split a boss battle into phases, and create team quests that guilds complete together.',
        topic: 'teach-game',
        audiences: ['teacher', 'admin'],
        body: `## Boss battles

A boss battle is a graded challenge in up to five **phases**, for example "Fractions", "Decimals" and "Final form".

1. Create a **Boss battle** activity.
2. Name the boss and its phases in the builder's **Boss** card.
3. Put each question in a phase.

Students see the boss and its current phase while they answer. The boss's HP bar appears only after they hand in and falls with their score, so it never hints at which answers were right. Boss battles count toward rank, and skills and Easter Bunny skips never work on them.

## Team quests

A team quest is a goal for a guild. Set up guilds first (see [Set up guilds and leaderboards](${getHelpArticlePath('guilds-and-leaderboards-for-teachers')})).

1. Create a **Team quest** activity.
2. Choose the activities it covers.
3. Choose whether **everyone** in the guild must finish them, or **at least** a number of members. Graded activities must be passed.

When a guild gets there, every member gets the quest's XP once and sees a celebration.`,
    },
    {
        slug: 'guilds-and-leaderboards-for-teachers',
        title: 'Set up guilds and leaderboards',
        summary: 'Create guilds, approve join requests, choose leaders, and decide whether a course has a leaderboard.',
        topic: 'teach-game',
        audiences: ['teacher', 'admin'],
        body: `Manage both on a course's **Guilds** tab.

## Guilds

- **Create guilds:** give each a name, motto, emblem and size.
- **Add students** yourself, or let them ask to join an open guild. You approve each request.
- **Leaders:** make one member the leader.
- **Student-founded guilds:** switch on "Let Guild Leaders found guilds". Students who have unlocked the Guild Leader skill can then found a guild, which you approve.
- A student can be in one guild per course.

## Leaderboards

Leaderboards are **off** by default. Turn one on per course and choose **initials only** or **display names**.

- It shows only **XP earned in your course this week**, never scores or answers.
- Weeks start on Monday, in your school's time zone.
- It also shows guild totals.
- Students can hide themselves from every leaderboard in their profile.

> [!TIP]
> For younger classes, initials only (or no leaderboard) is the kinder choice. Guild totals encourage teamwork without singling anyone out.`,
    },
    {
        slug: 'secrets-and-easter-eggs',
        title: 'Secrets and the Easter Bunny',
        summary:
            'Hide secrets in your course with clues, rewards and triggers, and control where Easter Bunny skips work.',
        topic: 'teach-game',
        audiences: ['teacher', 'admin'],
        body: `Secrets are surprises you hide in your course. No code is needed.

## Hide a secret

On the course's **Secrets** tab choose **New secret** and fill in:

- **Name** and **rarity**
- **Clue** (optional): shown in students' Codex before they find it. Turn off **Show clue** to keep it a mystery.
- **What students read when they find it**: lore, a fun fact, or a well-done message
- **Rewards:** XP within your administrator's range, and items. An Easter Bunny reward is always exactly one charge.
- **How it's found** (the trigger)

| Trigger | How a student finds it |
| --- | --- |
| Hidden object | Clicks a faint ✦ you placed in a lesson |
| Lesson section | Scrolls far enough in a lesson to reach an invisible marker |
| Secret phrase | Types the phrase in their Codex. Only a fingerprint is stored, so not even you can read it back |
| Activity sequence | Completes the chosen activities in order |
| Score milestone | Scores at least a percentage on one or several graded activities |
| Learning streak | Learns on a number of days in a row |
| Item set | Holds the chosen items at the same time |
| Cross-course | Completes activities from two or more of your courses |
| Class goal | Completes an activity once enough classmates have too |

For a hidden object or lesson section, place it in the lesson with **Insert → Secrets** in the lesson editor.

Each secret can be found once per student. Turning a secret off hides it from students who haven't found it; deleting it removes it, but XP already earned stays.

## The Easter Bunny

Students earn Easter Bunnies from secrets and spend one to skip a question. The question is recorded as **skipped**: it's never correct and it's left out of the total.

- Choose where skips are allowed with **Allow Easter Bunny skips** in the Quest Builder. It's on by default for practice quizzes only.
- Skips never work on exams, homework or boss battles, whatever the setting says.

## Skills

**Allow skills** controls skills per activity; it's on by default for practice quizzes and quizzes. Skills such as Insight (removes one wrong option in practice quizzes) never work on exams, homework or boss battles.`,
    },
]
