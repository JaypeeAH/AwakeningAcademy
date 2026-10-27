import type {
    IncompleteItem,
    MissedQuestion,
    ObjectivePerformance,
    OverdueItem,
    RetryStat,
    ScoreBucket,
} from '@/@types/reports/Analytics'
import type { XpSource } from '@/@types/progression/Progression'

/*
 * Teacher analytics, pure and tested. Learning signals (scores, objectives, missed questions, overdue
 * work) come first; XP is engagement and shown apart. Answers skipped with an Easter Bunny and answers
 * still awaiting marking never count as wrong.
 */

export const UNTAGGED_OBJECTIVE = 'Not linked to an objective'

const round1 = (n: number) => Math.round(n * 10) / 10

/** Ten buckets: 0–9, 10–19 … 90–100 */
export function scoreDistribution(percents: number[]): ScoreBucket[] {
    const buckets = Array.from({ length: 10 }, (_, i) => ({
        label: i === 9 ? '90–100%' : `${i * 10}–${i * 10 + 9}%`,
        from: i * 10,
        to: i === 9 ? 100 : i * 10 + 9,
        count: 0,
    }))
    for (const p of percents) {
        if (!Number.isFinite(p)) continue
        buckets[Math.min(9, Math.max(0, Math.floor(p / 10)))].count++
    }
    return buckets
}

export interface ResponseFact {
    questionId: string
    activityId: string
    objective: string
    outcome: string
    pointsAwarded: number
    maxPoints: number
}

const isMarked = (outcome: string) => outcome !== 'skipped' && outcome !== 'pending_review'

/** Points earned vs possible per learning objective (weakest first) */
export function objectivePerformance(responses: ResponseFact[]): ObjectivePerformance[] {
    const map = new Map<string, { earned: number; possible: number; responses: number }>()
    for (const r of responses) {
        if (!isMarked(r.outcome) || r.maxPoints <= 0) continue
        const key = r.objective.trim() || UNTAGGED_OBJECTIVE
        const entry = map.get(key) ?? { earned: 0, possible: 0, responses: 0 }
        entry.earned += Math.max(0, Math.min(r.pointsAwarded, r.maxPoints))
        entry.possible += r.maxPoints
        entry.responses++
        map.set(key, entry)
    }
    return [...map.entries()]
        .map(([objective, e]) => ({ objective, ...e, percent: round1((e.earned / e.possible) * 100) }))
        .sort((a, b) => a.percent - b.percent || b.responses - a.responses)
}

/** Questions the class gets wrong most often (needs a few answers to be meaningful) */
export function missedQuestions(
    responses: ResponseFact[],
    questions: Map<string, { prompt: string; activityId: string; activityTitle: string }>,
    { minAnswered = 3, limit = 10 } = {},
): MissedQuestion[] {
    const map = new Map<string, { answered: number; incorrect: number; partial: number; skipped: number }>()
    for (const r of responses) {
        const entry = map.get(r.questionId) ?? { answered: 0, incorrect: 0, partial: 0, skipped: 0 }
        if (r.outcome === 'skipped') entry.skipped++
        else if (r.outcome !== 'pending_review') {
            entry.answered++
            if (r.outcome === 'incorrect') entry.incorrect++
            if (r.outcome === 'partial') entry.partial++
        }
        map.set(r.questionId, entry)
    }
    return [...map.entries()]
        .filter(([, e]) => e.answered >= minAnswered && e.incorrect + e.partial > 0)
        .flatMap(([questionId, e]) => {
            const q = questions.get(questionId)
            if (!q) return []
            return [
                {
                    questionId,
                    activityId: q.activityId,
                    activityTitle: q.activityTitle,
                    prompt: q.prompt,
                    ...e,
                    // A partly right answer counts half
                    incorrectRate: round1(((e.incorrect + e.partial / 2) / e.answered) * 100),
                },
            ]
        })
        .sort((a, b) => b.incorrectRate - a.incorrectRate || b.answered - a.answered)
        .slice(0, limit)
}

export interface WorkActivity {
    id: string
    title: string
    dueAt: Date | null
    /** Graded work must be passed to count as done */
    graded: boolean
}

export interface CompletionFact {
    studentId: string
    activityId: string
    passed: boolean
}

/** Who hasn't finished what: overdue (past the due date) and overall completion per activity */
export function workStatus(
    activities: WorkActivity[],
    students: { id: string; displayName: string }[],
    completions: CompletionFact[],
    now: Date,
): { overdue: OverdueItem[]; incomplete: IncompleteItem[] } {
    const done = (studentId: string, a: WorkActivity) =>
        completions.some((c) => c.studentId === studentId && c.activityId === a.id && (!a.graded || c.passed))
    const overdue: OverdueItem[] = []
    const incomplete: IncompleteItem[] = []
    for (const a of activities) {
        const missing = students.filter((s) => !done(s.id, a))
        if (a.dueAt && a.dueAt < now && missing.length) {
            overdue.push({ activityId: a.id, title: a.title, dueAt: a.dueAt, students: missing })
        }
        if (missing.length) {
            incomplete.push({
                activityId: a.id,
                title: a.title,
                dueAt: a.dueAt,
                completed: students.length - missing.length,
                total: students.length,
            })
        }
    }
    overdue.sort((x, y) => x.dueAt.getTime() - y.dueAt.getTime())
    incomplete.sort((x, y) => x.completed / Math.max(x.total, 1) - y.completed / Math.max(y.total, 1))
    return { overdue, incomplete }
}

/** Attempts per student on each activity (only activities someone retried) */
export function retryStats(
    attempts: { studentId: string; activityId: string }[],
    titles: Map<string, string>,
): RetryStat[] {
    const perActivity = new Map<string, Map<string, number>>()
    for (const a of attempts) {
        const students = perActivity.get(a.activityId) ?? new Map<string, number>()
        students.set(a.studentId, (students.get(a.studentId) ?? 0) + 1)
        perActivity.set(a.activityId, students)
    }
    return [...perActivity.entries()]
        .map(([activityId, students]) => {
            const counts = [...students.values()]
            const total = counts.reduce((s, c) => s + c, 0)
            return {
                activityId,
                title: titles.get(activityId) ?? 'Activity',
                students: counts.length,
                attempts: total,
                averageAttempts: round1(total / counts.length),
                maxAttempts: Math.max(...counts),
            }
        })
        .filter((r) => r.maxAttempts > 1)
        .sort((a, b) => b.averageAttempts - a.averageAttempts)
}

/** XP for finishing learning work, as opposed to bonuses */
export const ACADEMIC_XP_SOURCES: XpSource[] = [
    'lesson_completion',
    'quiz_completion',
    'exam_completion',
    'homework_completion',
    'boss_battle',
]

export function xpBreakdown(ledger: { source: XpSource; amount: number }[]) {
    let academic = 0
    let adjustments = 0
    const bonus = new Map<XpSource, number>()
    for (const row of ledger) {
        if (row.source === 'manual_adjustment') adjustments += row.amount
        else if (ACADEMIC_XP_SOURCES.includes(row.source)) academic += row.amount
        else bonus.set(row.source, (bonus.get(row.source) ?? 0) + row.amount)
    }
    const bonusList = [...bonus.entries()]
        .map(([source, amount]) => ({ source, amount }))
        .sort((a, b) => b.amount - a.amount)
    return { academic, bonus: bonusList, bonusTotal: bonusList.reduce((s, b) => s + b.amount, 0), adjustments }
}
