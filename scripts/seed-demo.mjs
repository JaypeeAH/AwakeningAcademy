// Demo data for trying the teacher analytics locally. DEV ONLY — never part of the migrations.
//
//   ALLOW_DEMO_SEED=true node --env-file=.env.local scripts/seed-demo.mjs --yes      create
//   ALLOW_DEMO_SEED=true node --env-file=.env.local scripts/seed-demo.mjs --clean    remove it all
//
// Creates a "ZZ Demo" course with a teacher and 12 students (all zz-demo-…@example.com, pre-confirmed,
// no emails sent), a lesson, a quiz and an exam whose questions are linked to learning objectives,
// and attempts with a realistic spread of scores, skips and retries. Everything it creates is labelled
// so --clean removes exactly that and nothing else.
import { randomUUID } from 'node:crypto'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY
const args = new Set(process.argv.slice(2))

function refuse(message) {
    console.error(`✋ ${message}`)
    process.exit(1)
}
if (process.env.NODE_ENV === 'production') refuse('Refusing to seed with NODE_ENV=production.')
if (process.env.ALLOW_DEMO_SEED !== 'true')
    refuse('Set ALLOW_DEMO_SEED=true to confirm this database may receive demo data.')
if (!args.has('--yes') && !args.has('--clean')) refuse('Pass --yes to create demo data, or --clean to remove it.')
if (!url || !key) refuse('SUPABASE_URL and SUPABASE_SECRET_KEY are required (use --env-file=.env.local).')

const COURSE_TITLE = 'ZZ Demo: Fractions & Decimals'
const EMAIL = (who) => `zz-demo-${who}@example.com`

async function call(path, init = {}) {
    const response = await fetch(`${url}${path}`, {
        ...init,
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
            ...init.headers,
        },
    })
    const text = await response.text()
    const body = text ? JSON.parse(text) : null
    if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${text}`)
    return body
}
const rpc = (name, params) => call(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(params) })
const insert = (table, rows) => call(`/rest/v1/${table}`, { method: 'POST', body: JSON.stringify(rows) })

async function demoUsers() {
    const found = []
    for (let page = 1; page < 20; page++) {
        const { users } = await call(`/auth/v1/admin/users?page=${page}&per_page=200`)
        found.push(...users.filter((u) => /^zz-demo-.*@example\.com$/.test(u.email ?? '')))
        if (users.length < 200) break
    }
    return found
}

async function clean() {
    const courses = await call(`/rest/v1/courses?title=eq.${encodeURIComponent(COURSE_TITLE)}&select=id`)
    for (const c of courses) await call(`/rest/v1/courses?id=eq.${c.id}`, { method: 'DELETE' })
    const users = await demoUsers()
    for (const u of users) await call(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' })
    console.log(`🧹 Removed ${courses.length} demo course(s) and ${users.length} demo account(s).`)
}

if (args.has('--clean')) {
    await clean()
    process.exit(0)
}

if ((await call(`/rest/v1/courses?title=eq.${encodeURIComponent(COURSE_TITLE)}&select=id`)).length) {
    refuse('Demo data already exists. Run with --clean first.')
}

// ── People ──
const password = `Demo-${randomUUID().slice(0, 8)}!`
async function createUser(who, name) {
    const user = await call('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
            email: EMAIL(who),
            password,
            email_confirm: true,
            user_metadata: { display_name: name },
        }),
    })
    return user.id
}
const NAMES = [
    'Ava Stone',
    'Ben Cruz',
    'Cleo Park',
    'Dev Rao',
    'Eli Moss',
    'Fay Lin',
    'Gus Hart',
    'Hana Ito',
    'Ivo Bell',
    'Jade Roy',
    'Kai Dunn',
    'Lena Fox',
]
const teacherId = await createUser('teacher', 'ZZ Demo Teacher')
await call(`/rest/v1/profiles?id=eq.${teacherId}`, { method: 'PATCH', body: JSON.stringify({ role: 'teacher' }) })
const studentIds = []
for (const [i, name] of NAMES.entries()) studentIds.push(await createUser(`student-${i + 1}`, `ZZ ${name}`))

// ── Course ──
const [math] = await call(`/rest/v1/subjects?slug=eq.mathematics&select=id`)
const [course] = await insert('courses', {
    subject_id: math.id,
    title: COURSE_TITLE,
    description: 'Demo data for trying analytics.',
    join_code: `ZZ${randomUUID().slice(0, 6).toUpperCase()}`,
    status: 'published',
    created_by: teacherId,
})
await insert('course_teachers', { course_id: course.id, teacher_id: teacherId })
await insert(
    'course_enrollments',
    studentIds.map((student_id) => ({ course_id: course.id, student_id })),
)
const [moduleRow] = await insert('modules', { course_id: course.id, title: 'Unit 1: Parts of a whole', position: 0 })

const OBJECTIVES = ['Compare fractions', 'Add fractions', 'Convert fractions to decimals']
async function activity(kind, title, extra = {}) {
    const [row] = await insert('activities', {
        course_id: course.id,
        module_id: moduleRow.id,
        kind,
        title,
        status: 'published',
        published_at: new Date().toISOString(),
        objectives: OBJECTIVES,
        xp_reward: kind === 'lesson' ? 20 : kind === 'exam' ? 100 : 30,
        passing_score: kind === 'lesson' ? 0 : 60,
        created_by: teacherId,
        ...extra,
    })
    return row
}
const lesson = await activity('lesson', 'What is a fraction?', {
    body: '## Fractions\n\nA fraction is part of a whole.',
})
const quiz = await activity('quiz', 'Fractions check', { max_attempts: 3 })
const exam = await activity('exam', 'Unit 1 exam', {
    max_attempts: 1,
    due_at: new Date(Date.now() - 3 * 24 * 3600_000).toISOString(),
    feedback_mode: 'score_only',
})

/** A true/false question for an objective; difficulty = how often students get it wrong */
function question(prompt, objective, difficulty) {
    const yes = randomUUID()
    const no = randomUUID()
    return {
        input: {
            id: randomUUID(),
            kind: 'true_false',
            prompt,
            points: 1,
            objective,
            options: [
                { id: yes, label: 'True' },
                { id: no, label: 'False' },
            ],
            key: { correctOptionIds: [yes], acceptedAnswers: [], caseSensitive: false, explanation: '', rubric: '' },
        },
        right: yes,
        wrong: no,
        difficulty,
    }
}
const quizQuestions = [
    question('1/2 is bigger than 1/3.', OBJECTIVES[0], 0.15),
    question('3/4 is bigger than 4/5.', OBJECTIVES[0], 0.55),
    question('1/4 + 1/4 = 1/2.', OBJECTIVES[1], 0.2),
    question('1/3 + 1/2 = 2/5.', OBJECTIVES[1], 0.65),
    question('0.5 = 1/2.', OBJECTIVES[2], 0.1),
]
const examQuestions = [
    question('2/3 is bigger than 3/5.', OBJECTIVES[0], 0.45),
    question('2/5 + 1/5 = 3/5.', OBJECTIVES[1], 0.25),
    question('0.75 = 3/4.', OBJECTIVES[2], 0.35),
    question('1/8 = 0.18.', OBJECTIVES[2], 0.6),
]
await rpc('save_activity_content', {
    p_activity_id: quiz.id,
    p_questions: quizQuestions.map((q) => q.input),
    p_prerequisite_ids: [],
})
await rpc('save_activity_content', {
    p_activity_id: exam.id,
    p_questions: examQuestions.map((q) => q.input),
    p_prerequisite_ids: [],
})

// ── Work ──
let seed = 42
const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31

async function attempt(studentId, activityRow, questions, skill) {
    const started = await rpc('start_attempt', { p_student_id: studentId, p_activity_id: activityRow.id })
    const responses = questions.map((q) => {
        const correct = random() > q.difficulty - skill
        return {
            questionId: q.input.id,
            selectedOptionIds: [correct ? q.right : q.wrong],
            textAnswer: null,
            outcome: correct ? 'correct' : 'incorrect',
            pointsAwarded: correct ? 1 : 0,
        }
    })
    const score = responses.reduce((s, r) => s + r.pointsAwarded, 0)
    const percent = Math.round((score / questions.length) * 1000) / 10
    const passed = percent >= activityRow.passing_score
    const awards = passed
        ? [
              {
                  amount: activityRow.xp_reward,
                  source: activityRow.kind === 'exam' ? 'exam_completion' : 'quiz_completion',
                  idempotencyKey: `complete:${activityRow.id}:${studentId}`,
                  reason: `Passed “${activityRow.title}”`,
              },
          ]
        : []
    await rpc('finalize_attempt', {
        p_attempt_id: started.id,
        p_student_id: studentId,
        p_responses: responses,
        p_score: score,
        p_max_score: questions.length,
        p_percent: percent,
        p_passed: passed,
        p_awards: awards,
        p_status: 'graded',
    })
    return passed
}

for (const [i, studentId] of studentIds.entries()) {
    const skill = (i % 4) * 0.12 - 0.1 // a spread of strong and struggling students
    if (i < 10) {
        await rpc('complete_lesson', {
            p_student_id: studentId,
            p_activity_id: lesson.id,
            p_awards: [
                {
                    amount: 20,
                    source: 'lesson_completion',
                    idempotencyKey: `complete:${lesson.id}:${studentId}`,
                    reason: `Completed “${lesson.title}”`,
                },
            ],
        })
    }
    if (i < 11) {
        // Some students retry the quiz until they pass (up to 3 attempts)
        for (let tries = 0; tries < 3; tries++)
            if (await attempt(studentId, quiz, quizQuestions, skill + tries * 0.15)) break
    }
    // Two students miss the exam deadline
    if (i < 10) await attempt(studentId, exam, examQuestions, skill)
}

console.log(`✅ Demo course "${COURSE_TITLE}" created with ${studentIds.length} students.`)
console.log(`   Sign in as ${EMAIL('teacher')} with password ${password} and open Analytics.`)
console.log('   Remove it all later with --clean.')
