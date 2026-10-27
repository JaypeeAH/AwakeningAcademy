import type { BossConfig } from '@/utils/boss'

/*
 * Sample courses: ready-made courses (lessons with pictures and videos, a quiz, sometimes a boss battle)
 * a teacher can add to their own courses to see the academy in action. The definitions live in
 * configs/sampleCourses; adding one builds a real course through the normal Quest Builder actions.
 */

export type SampleActivityKind = 'lesson' | 'quiz' | 'boss_battle'
export type SampleQuestionKind = 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer'

export interface SampleQuestion {
    kind: SampleQuestionKind
    prompt: string
    points?: number
    /** Boss battles: the phase (1-based) */
    phase?: number
    /** One of the activity's objectives */
    objective: string
    /** Choice questions: the options, with the right one(s) marked */
    options?: { label: string; correct?: boolean }[]
    /** Short answers: the answers accepted (case-insensitive) */
    acceptedAnswers?: string[]
    explanation: string
}

export interface SampleActivity {
    /** Local name, used for prerequisites within the sample */
    key: string
    kind: SampleActivityKind
    title: string
    summary: string
    /** Lesson content (Markdown) */
    body?: string
    objectives: string[]
    difficulty: number
    estimatedMinutes: number
    questions?: SampleQuestion[]
    boss?: BossConfig
    /** Keys of the activities to finish first */
    requires?: string[]
}

export interface SampleCourseDefinition {
    /** Stable id used in the API (`/api/courses/samples/<id>`) */
    id: string
    /** subjects.slug */
    subjectSlug: string
    title: string
    description: string
    /** One line for the picker: what students will learn */
    tagline: string
    module: { title: string; description: string }
    activities: SampleActivity[]
}

/** What the "Add a sample course" picker shows */
export interface SampleCourseSummary {
    id: string
    subjectSlug: string
    title: string
    description: string
    tagline: string
    lessonCount: number
    quizCount: number
    bossCount: number
    questionCount: number
    imageCount: number
    videoCount: number
    activityTitles: string[]
}

export interface SampleCourseAdded {
    courseId: string
    title: string
}
