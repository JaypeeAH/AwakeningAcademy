import type { Activity } from './Activity'
import type { KeyedQuestion } from './Question'
import type { XpRule } from '@/@types/progression/Progression'
import type { CourseModule } from '@/@types/courses/Course'
import type { ActivityKind } from './ActivityKindOptions'

/** Everything the Quest Builder needs to edit one activity */
export interface ActivityEditorData {
    activity: Activity
    questions: KeyedQuestion[]
    course: { id: string; title: string }
    modules: CourseModule[]
    /** Other activities in the course (prerequisite picker) */
    siblings: { id: string; title: string; kind: ActivityKind }[]
    /** The XP range the administrator allows for this kind */
    xpRule: XpRule | null
    /** Graded attempts so far — questions students answered can't be removed */
    attemptCount: number
}
