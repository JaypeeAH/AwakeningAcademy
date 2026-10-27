import type { ActivityKind, PublishStatus } from './ActivityKindOptions'
import type { TeamConfig, TeamQuestStatus } from '@/@types/game/Guilds'
import type { BossConfig } from '@/utils/boss'
import type { QuestSkills } from '@/@types/game/Inventory'
import type { SubjectMeta } from '@/@types/subjects/Subject'
import type { Attempt } from '@/@types/attempts/Attempt'
import type { FeedbackMode } from '@/utils/feedback'

/** List shape — enough for quest cards, course content lists and the builder's outline */
export interface ActivitySummary {
    id: string
    courseId: string
    moduleId: string | null
    kind: ActivityKind
    title: string
    summary: string
    difficulty: number
    xpReward: number
    estimatedMinutes: number | null
    opensAt: Date | null
    dueAt: Date | null
    maxAttempts: number | null
    /** Timed attempts: minutes from starting (null = untimed) */
    timeLimitMinutes: number | null
    passingScore: number
    status: PublishStatus
    position: number
    questionCount: number
    prerequisiteIds: string[]
    publishedAt: Date | null
}

export interface Activity extends ActivitySummary {
    body: string
    objectives: string[]
    /** When students may see answers (see utils/feedback) */
    feedbackMode: FeedbackMode
    /** Students may use skills here (never on formal assessments) */
    allowSkills: boolean
    /** Students may spend an Easter Bunny to skip a question (never on formal assessments) */
    allowBunnySkips: boolean
    xpRepeatable: boolean
    /** Boss battles: the boss and its phases */
    boss: BossConfig | null
    /** Team quests: what the guild must complete */
    teamConfig: TeamConfig | null
    createdAt: Date
    updatedAt: Date
}

export type QuestState = 'locked' | 'upcoming' | 'available' | 'in_progress' | 'in_review' | 'completed'

/** An activity as the student sees it on the Quest Board / course page */
export interface Quest extends ActivitySummary {
    course: { id: string; title: string; subject: SubjectMeta }
    moduleTitle: string | null
    state: QuestState
    /** Why it's locked/upcoming, in student-friendly words */
    stateReason: string | null
    bestPercent: number | null
    passed: boolean
    attemptsUsed: number
    /** null = unlimited */
    attemptsLeft: number | null
    completedAt: Date | null
}

/** The Learning Dungeon for one activity (student view — never includes answer keys) */
export interface ActivityPlayView {
    activity: Activity
    quest: Quest
    /** The student's own attempts, newest first */
    attempts: Attempt[]
    /** Overdrive / Second Chance on the briefing */
    skills: QuestSkills
    /** Team quests: the student's guild and how far each member has got */
    team: TeamQuestStatus | null
}

/** Teacher view of one activity's outcomes */
export interface ActivityResults {
    activity: Activity
    course: { id: string; title: string }
    students: ActivityStudentResult[]
    questions: QuestionStat[]
    summary: {
        enrolled: number
        completed: number
        passed: number
        averageBest: number | null
        /** Attempts waiting for this teacher to grade */
        awaitingReview: number
    }
}

export interface ActivityStudentResult {
    studentId: string
    displayName: string
    attempts: {
        id: string
        attemptNo: number
        status: string
        percent: number | null
        passed: boolean | null
        submittedAt: Date | null
    }[]
    bestPercent: number | null
    passed: boolean
    completedAt: Date | null
}

export interface QuestionStat {
    questionId: string
    prompt: string
    position: number
    correct: number
    partial: number
    incorrect: number
    skipped: number
    pending: number
    /** correct ÷ answered, 0–100 (null when nobody answered yet) */
    correctRate: number | null
}
