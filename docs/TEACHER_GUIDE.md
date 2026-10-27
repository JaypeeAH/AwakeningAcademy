# Teacher guide

How teachers build courses and quests, mark work, and, from Phase 3, hide secrets such as the Easter
Bunny. No coding is needed for any of it.

## 1. Set up a course

1. Ask your administrator to switch your account to **Teacher**. Sign up like anyone else first; they
   change your role under **Administration → Users & roles**.
2. Go to **Courses → New course**. Give it a title and pick its **subject**. The subject decides which
   class path students grow, e.g. Mathematics → Apprentice Mathematician → Advanced Mathematician.
3. Add **modules** (chapters) on the course's **Content** tab, then **publish** the course.
4. Invite students with **Copy class link**. New students sign up and join in one step; students who
   already have an account join straight away. You can also share the **join code**, or add students
   by email on the **Roster** tab.

## 2. Add lessons and activities (the Quest Builder)

On the **Content** tab choose **New activity** and pick a kind:

| Kind | Use it for | Marked by |
|---|---|---|
| Lesson | Reading, images, videos, callouts and tables (see "Write a lesson" below) | Completing it |
| Practice quiz | Low-stakes practice: unlimited tries, answers shown, doesn't count toward rank | Automatically |
| Quiz | Graded checks that count toward mastery and rank | Automatically |
| Exam | Formal tests: limited attempts, optional time limit, answers usually hidden | Automatically, plus you for essays |
| Homework | Written answers and file uploads | You |
| Boss battle | A big multi-topic challenge in phases. High XP, counts toward rank | Automatically, plus you for essays |
| Team quest | A guild goal: done when enough members of a guild finish the activities you choose | Automatically |

Each activity has its own settings:

- **XP.** You choose an amount within the range your administrator allows.
- **Scheduling:** difficulty, estimated time, opening and due dates.
- **Attempts:** the attempt limit, the passing score, and an optional **time limit** for timed exams.
- **Prerequisites:** e.g. "finish the lesson before the quiz".
- **Feedback:** what students see after handing in. Choose answers straight away, answers after the
  due date, or the score only.

**Question types:**
- Multiple choice
- Multiple select
- True/false
- Short answer, where numbers match by value (0.5 = .5)
- **Essay** and **file upload**, which you mark. Give these a **rubric**.

**Question bank:** **Save to bank** keeps a good question for reuse. **Add from bank** copies it into
another activity; editing the copy never changes old results.

### Write a lesson

The lesson editor works like a word processor: what you see is what students get.

- **Text style:** the first menu switches between normal text, title, heading and subheading. Then use
  bold, italic, links, lists, quotes and code. **Ctrl+B**, **Ctrl+I**, **Ctrl+Z** (undo) and **Ctrl+S**
  (save) work as usual.
- **Insert** adds the richer parts:
    - **Image:** upload one (PNG, JPEG, GIF or WebP, up to 5 MB), reuse one from this course, or link to
      one.
        - You can also **paste or drag** an image straight into the lesson.
        - Each image has boxes for a short description (read to students who use screen readers) and an
          optional caption.
        - Uploaded images are private to the course's teachers and students.
    - **Video:** a YouTube or Vimeo link (videos aren't uploaded).
        - Students see a play button, and nothing loads from YouTube or Vimeo until they press it.
        - YouTube uses its privacy-enhanced player.
        - A link with a start time (…?t=90) starts the video there.
    - **Tip, Note, Important or Warning box:** with words selected, they go into the box. Otherwise a new
      box appears below. Change a box's type from its label, or remove it with the bin.
    - **Table:** click a cell to type, and press Tab to move to the next one. While you're in a table, a
      **Table** menu adds or removes rows and columns.
    - **Divider line.**
    - **Secrets:** this lesson's hidden objects and sections (create them in the **Secrets** tab first).
- **Views:**
    - **Preview** shows the lesson exactly as students see it.
    - **Full screen** gives you more room.
    - **Markdown** shows the same lesson as plain text, for anyone who prefers typing formatting. Both
      views edit the same lesson.
- **Reading time:** shown under the editor.

The **checklist** on the right lists anything a student would trip over. **Publish** stays locked until
the checklist is clear. **Student preview** shows exactly what students will see.

## 3. Mark work and follow progress

- **Grading** (side menu) lists work waiting for you, oldest first. Give points per answer, add
  comments, and save.
  - The student gets their score, your comments and their XP at that moment, with a notification.
  - You can re-grade later. The score updates, but XP is never paid twice or taken away.
- An activity's **Results** page shows each student's attempts and the questions the class finds
  hardest. Skipped answers are counted separately and never as correct.
- The course **Progress** tab is a gradebook. It flags students who may need support, based on scores
  and overdue work, not XP.

## 4. Secrets, skills and the Easter Bunny

Easter eggs are **data you create** in your course. No code changes are needed.

### Hide a secret

Open your course and choose the **Secrets** tab, then **New secret**. Fill in:

- **Name** and **rarity.**
- **Clue** (optional). Students see it in their Codex before they find the secret. Turn off **Show clue** to
  keep it a total mystery.
- **What students read when they find it** (Markdown). Use it for lore, a fun fact, or a well-done message.
- **Rewards:**
    - XP, within the range your administrator set for secrets.
    - Items. An **Easter Bunny** reward is always exactly one charge.
- **How it's found (the trigger):**

| Trigger | How a student finds it |
|---|---|
| Hidden object | Clicks a faint ✦ you placed in a lesson |
| Lesson section | Scrolls far enough in a lesson to reach an invisible marker |
| Secret phrase | Types the phrase in their Codex. Case, spacing and punctuation don't matter. Only a fingerprint of the phrase is stored, so not even you can read it back. |
| Activity sequence | Completes the chosen activities in order. A graded step must be passed. |
| Score milestone | Scores at least X% on one activity, or on several graded activities |
| Learning streak | Learns on N days in a row |
| Item set | Holds the chosen items at the same time. They aren't used up. |
| Cross-course | Completes activities from two or more of your courses |
| Class goal | Completes an activity once at least N classmates have too. Everyone who helped gets it. |

For a **hidden object** or **lesson section**, saving shows a short snippet such as `[✦](secret:Ab12Cd34Ef56Gh78)`.
Paste it into the lesson's content wherever you want it hidden, then save the lesson. The marker only
works in that lesson, and only for enrolled students.

Each secret can be found **once per student**. Turning a secret off hides it from Codexes that haven't found it
yet. Deleting it removes it everywhere, but XP already earned stays.

### What students see

- A **"Secret discovered!"** moment with your text and the rewards.
- A **Codex** listing what they've found. Secrets they haven't found appear as **???**, with your clue if you
  showed it.

### The Easter Bunny

The Easter Bunny is a rare item that students earn from secrets.

- In a quiz that allows it, a student can spend one to **skip a question**. They see what it does and confirm
  first.
- The question is recorded as **skipped**. It never counts as correct and is left out of the total, so it
  doesn't count for or against them.
- You choose where skips are allowed with **Allow Easter Bunny skips** in the Quest Builder's settings. It is on
  by default for practice quizzes only.
- Skips are **never** allowed on exams, homework or boss battles, whatever the setting says.
- Each charge can only be spent once, even with double clicks or two open tabs.
- You can't mark a skipped question.

### Skills

Students unlock skills as they level up, rank up and find secrets. **Allow skills** in the Quest Builder
controls them per activity. It is on by default for practice quizzes and quizzes. Skills never work on exams,
homework or boss battles.

| Skill | What it does |
|---|---|
| Insight | Practice quizzes only: removes one wrong option (never leaves fewer than two) |
| Knowledge Echo | Points the student back to a lesson they've completed that relates to the quiz |
| Time Dilation | Adds a few minutes to a timed practice attempt, once per attempt |
| Second Chance | Practice quizzes with an attempt limit: one extra attempt, once every attempt is used |
| Overdrive | Practice quizzes and quizzes: armed before a quest the student hasn't completed. Pays bonus XP with the first pass. |
| Dungeon Sense | Reveals the clue to one undiscovered secret in a course |
| Guild Leader | Passive, for team quests (Phase 4) |

Administrators can rename and tune items and skills under **Administration → Items & skills**: unlock
requirements, charges, recharge time, minutes and bonus.

## 5. Boss battles, guilds, team quests and leaderboards

### Boss battles

A boss battle is a graded challenge split into **phases** (up to five), such as "Fractions", "Decimals"
and "Final form".

1. Name the boss and its phases in the builder's **Boss** card.
2. Put each question in a phase.

Students see the boss and its current phase while they answer. The boss's **HP bar** appears only
after they hand in, and it falls with their score, so it never hints at which answers were right.
Boss battles use the boss-battle XP range and count toward rank, like quizzes and exams.

### Guilds

Guilds are small teams inside a course. Set them up in your course's **Guilds** tab:

- **Create guilds:** give each a name, motto, emblem and size.
- **Add students:** add them yourself, or let them ask to join an open guild. You approve each
  request.
- **Leaders:** make one member the leader.
- **Student-founded guilds:** switch on "Let Guild Leaders found guilds". Students who have unlocked
  the Guild Leader skill can then found a guild, which you approve.
- **One guild each:** a student can be in one guild per course.

### Team quests

A team quest is a guild goal.

1. Choose the activities it covers.
2. Choose whether **everyone** in the guild must finish them, or **at least N members**. Graded
   activities must be passed.
3. When a guild gets there, **every member** gets the quest's XP once and sees a "your guild finished it"
   moment.

### Leaderboards

Leaderboards are **off** by default. You can turn them on per course in the **Guilds** tab, showing
**initials only** or **display names**.

- **What's shown:** only **XP earned in your course this week**, never scores or answers.
- **Weeks:** they start on Monday, in the time zone your administrator sets.
- **Hiding:** a student can hide themselves from every leaderboard in their profile.
- **Guilds:** the leaderboard also shows guild totals.

### Streaks and achievements

- **Streaks:** a student keeps a **learning streak** by completing a lesson or handing in work on
  consecutive days.
    - Streak milestones (for example 3, 7 and 14 days) give XP once each.
    - A student with **Second Chance** can use it to protect their streak after missing one day.
- **Achievements:** students earn them for things like their first lesson, a flawless score, beating a
  boss, a 14-day streak or finishing a team quest. Administrators manage the list under
  **Administration → Achievements**. Some can be hidden until they're earned.

Phase 5 adds AI-assisted drafting, deeper analytics and hardening. See [ROADMAP.md](ROADMAP.md).
