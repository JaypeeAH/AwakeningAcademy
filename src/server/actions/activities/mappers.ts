import 'server-only'
import { parseTeamConfig } from '@/utils/teamQuests'
import { parseBossConfig } from '@/utils/boss'
import type { Tables } from '@/@types/supabase/database.types'
import type { Activity, ActivitySummary } from '@/@types/activities/Activity'
import type { AttemptFile, KeyedQuestion, Question } from '@/@types/activities/Question'
import type { Attempt, ResponseRecord } from '@/@types/attempts/Attempt'

const toDate = (value: string | null) => (value ? new Date(value) : null)

export const mapActivitySummary = (
    row: Tables<'activities'>,
    questionCount: number,
    prerequisiteIds: string[],
): ActivitySummary => ({
    id: row.id,
    courseId: row.course_id,
    moduleId: row.module_id,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    difficulty: row.difficulty,
    xpReward: row.xp_reward,
    estimatedMinutes: row.estimated_minutes,
    opensAt: toDate(row.opens_at),
    dueAt: toDate(row.due_at),
    maxAttempts: row.max_attempts,
    timeLimitMinutes: row.time_limit_minutes,
    passingScore: row.passing_score,
    status: row.status,
    position: row.position,
    questionCount,
    prerequisiteIds,
    publishedAt: toDate(row.published_at),
})

export const mapActivity = (row: Tables<'activities'>, questionCount: number, prerequisiteIds: string[]): Activity => ({
    ...mapActivitySummary(row, questionCount, prerequisiteIds),
    body: row.body,
    objectives: row.objectives,
    feedbackMode: row.feedback_mode,
    allowSkills: row.allow_skills,
    allowBunnySkips: row.allow_bunny_skips,
    xpRepeatable: row.xp_repeatable,
    boss: row.kind === 'boss_battle' ? parseBossConfig(row.boss) : null,
    teamConfig: row.kind === 'team_quest' ? parseTeamConfig(row.team_config) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
})

type QuestionRow = Tables<'questions'> & {
    options: Tables<'question_options'>[]
    key?: Tables<'question_keys'> | null
}

/** Student-safe: prompt and options only */
export const mapQuestion = (row: QuestionRow): Question => ({
    id: row.id,
    kind: row.kind,
    prompt: row.prompt,
    points: row.points,
    position: row.position,
    phase: row.phase,
    objective: row.objective,
    options: [...row.options]
        .sort((a, b) => a.position - b.position)
        .map((o) => ({ id: o.id, label: o.label, position: o.position })),
})

export const mapKeyedQuestion = (row: QuestionRow): KeyedQuestion => ({
    ...mapQuestion(row),
    aiDraft: row.ai_draft,
    key: {
        correctOptionIds: row.key?.correct_option_ids ?? [],
        acceptedAnswers: row.key?.accepted_answers ?? [],
        caseSensitive: row.key?.case_sensitive ?? false,
        explanation: row.key?.explanation ?? '',
        rubric: row.key?.rubric ?? '',
    },
})

export const mapAttempt = (row: Tables<'attempts'>): Attempt => ({
    id: row.id,
    activityId: row.activity_id,
    studentId: row.student_id,
    attemptNo: row.attempt_no,
    status: row.status,
    startedAt: new Date(row.started_at),
    submittedAt: toDate(row.submitted_at),
    score: row.score === null ? null : Number(row.score),
    maxScore: row.max_score === null ? null : Number(row.max_score),
    percent: row.percent === null ? null : Number(row.percent),
    passed: row.passed,
    expiresAt: toDate(row.expires_at),
    gradedAt: toDate(row.graded_at),
    feedback: row.feedback,
})

export const mapAttemptFile = (row: Tables<'attempt_files'>): AttemptFile => ({
    id: row.id,
    questionId: row.question_id,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    createdAt: new Date(row.created_at),
})

export const mapResponse = (row: Tables<'attempt_responses'>): ResponseRecord => ({
    questionId: row.question_id,
    selectedOptionIds: row.selected_option_ids,
    textAnswer: row.text_answer,
    outcome: row.outcome,
    pointsAwarded: Number(row.points_awarded),
    feedback: row.feedback,
})

/** Question select for students (no key) and teachers/grading (with key) */
export const QUESTION_SELECT = '*, options:question_options(*)'
export const KEYED_QUESTION_SELECT = '*, options:question_options(*), key:question_keys(*)'
