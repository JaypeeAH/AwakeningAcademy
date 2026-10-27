import 'server-only'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { unwrapMaybe } from '@/server/data/supabase/errors'
import { recordAudit } from '@/server/actions/audit'
import { createCourse, createModule, updateCourse } from '@/server/actions/courses'
import { createActivity, saveActivity, setActivityStatus } from '@/server/actions/activities'
import { SAMPLE_COURSES, findSampleCourse } from '@/configs/sampleCourses'
import { sampleActivityToSaveInput, summarizeSampleCourse } from '@/utils/sampleCourses'
import { DataError, NotFoundError } from '@/@types/errors'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type { ActivitySummary } from '@/@types/activities/Activity'
import type { SampleCourseAdded, SampleCourseSummary } from '@/@types/courses/SampleCourse'

export function getSampleCourses(): SampleCourseSummary[] {
    return SAMPLE_COURSES.map(summarizeSampleCourse)
}

/**
 * Adds a copy of a sample course to the user's courses, built through the same actions as the Quest
 * Builder (so it passes every save and publish check), then publishes it so students can join with
 * its code. If any step fails the half-made course is removed.
 */
export async function addSampleCourse(user: SessionUser, sampleId: string): Promise<SampleCourseAdded> {
    const sample = findSampleCourse(sampleId)
    if (!sample) throw new NotFoundError('That sample course doesn’t exist.', 'SAMPLE_NOT_FOUND')
    const subject = unwrapMaybe(
        await supabaseAdmin().from('subjects').select('id').eq('slug', sample.subjectSlug).maybeSingle(),
        'find the subject',
    )
    if (!subject) {
        throw new DataError(
            'This sample’s subject has been removed, so it can’t be added. Ask your administrator.',
            'INVALID_SUBJECT',
        )
    }

    const { course } = await createCourse(user, {
        title: sample.title,
        description: sample.description,
        subjectId: subject.id,
    })
    try {
        const courseModule = await createModule(user, course.id, sample.module)
        const created = new Map<string, ActivitySummary>()
        for (const activity of sample.activities) {
            created.set(
                activity.key,
                await createActivity(user, course.id, {
                    kind: activity.kind,
                    title: activity.title,
                    moduleId: courseModule.id,
                }),
            )
        }
        for (const activity of sample.activities) {
            const row = created.get(activity.key)!
            await saveActivity(
                user,
                row.id,
                sampleActivityToSaveInput(activity, {
                    // The XP the new activity started with: the administrator's default for its kind
                    xpReward: row.xpReward,
                    moduleId: courseModule.id,
                    prerequisiteIds: (activity.requires ?? []).map((key) => created.get(key)!.id),
                    newId: randomUUID,
                }),
            )
            await setActivityStatus(user, row.id, 'published')
        }
        await updateCourse(user, course.id, { status: 'published' })
    } catch (error) {
        const { error: cleanupError } = await supabaseAdmin().from('courses').delete().eq('id', course.id)
        if (cleanupError) console.error('[samples] Couldn’t remove a half-made sample course', course.id, cleanupError)
        throw error
    }

    await recordAudit(user.id, 'course.sample_added', 'course', course.id, { sample: sample.id, title: sample.title })
    return { courseId: course.id, title: course.title }
}
