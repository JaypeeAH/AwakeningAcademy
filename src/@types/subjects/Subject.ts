import type { SubjectTheme } from './SubjectOptions'

export interface Subject {
    id: string
    slug: string
    name: string
    description: string
    theme: SubjectTheme
    sortOrder: number
}

/** Embedded on courses and paths */
export type SubjectMeta = Pick<Subject, 'id' | 'slug' | 'name' | 'theme'>

/**
 * A class title ("Advanced Mathematician"). subjectId null = a cross-subject title (Polymath) that needs
 * `minSubjectCount` subjects at the level/mastery bar.
 */
export interface ClassTitle {
    id: string
    subjectId: string | null
    tier: number
    title: string
    description: string
    minSubjectLevel: number
    minMastery: number
    minSubjectCount: number
}

/** A student's standing in one subject */
export interface SubjectPath {
    subject: SubjectMeta
    xp: number
    level: number
    /** Average best score in this subject's graded assessments (0 when none yet) */
    mastery: number
    gradedCount: number
    title: ClassTitle | null
    nextTitle: ClassTitle | null
}

/** The student's class: the title on display plus every title they have unlocked */
export interface PlayerClass {
    displayed: ClassTitle | null
    equippedTitleId: string | null
    unlocked: ClassTitle[]
}
