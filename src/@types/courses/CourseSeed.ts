import type { SampleActivity } from './SampleCourse'

/*
 * Full courses installed with a generated SQL seed (`npm run db:course-seed`), for a named teacher. Unlike
 * sample courses (one module, added from the app), these have several units and belong to a real teacher
 * account. Activities use the same shape as sample activities, so the same Quest Builder conversion applies.
 */

export interface CourseSeedModule {
    title: string
    description: string
    /** Activity keys are unique across the whole course (prerequisites may point into earlier modules) */
    activities: SampleActivity[]
}

export interface CourseSeedDefinition {
    /** Stable id: the seed's course/module/activity ids are derived from it, so a second run is skipped */
    id: string
    /** subjects.slug */
    subjectSlug: string
    title: string
    description: string
    /** The teacher (or administrator) who owns the course; their account must exist before the seed runs */
    ownerEmail: string
    /** Students join with it (the teacher can reset it on the course page) */
    joinCode: string
    modules: CourseSeedModule[]
}
