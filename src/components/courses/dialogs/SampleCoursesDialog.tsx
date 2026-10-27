'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import Loading from '@/components/shared/Loading'
import ErrorState from '@/components/shared/ErrorState'
import { SubjectTag } from '@/components/game/GameTags'
import navigationIcon, { AddIcon, ImageIcon, VideoIcon } from '@/configs/icons.config'
import { getCoursePath } from '@/configs/app.config'
import { SWR_ONCE_ONLY } from '@/configs/swr.config'
import { apiAddSampleCourse, useSWRSampleCourses } from '@/services/courses'
import { useSWRSubjects } from '@/services/misc'
import { useCoursesStore } from '@/stores/GameStores'
import { tryGetErrorMessage } from '@/utils/errors'
import type { SampleCourseSummary } from '@/@types/courses/SampleCourse'
import type { Subject } from '@/@types/subjects/Subject'

interface SampleCoursesDialogProps {
    isOpen: boolean
    onClose: () => void
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

function SampleCard({
    sample,
    subject,
    busy,
    disabled,
    onAdd,
}: {
    sample: SampleCourseSummary
    subject: Subject | undefined
    busy: boolean
    disabled: boolean
    onAdd: () => void
}) {
    const contents = [
        plural(sample.lessonCount, 'lesson'),
        plural(sample.quizCount, 'quiz', 'quizzes'),
        sample.bossCount ? plural(sample.bossCount, 'boss battle') : null,
    ].filter(Boolean)
    return (
        <li
            className={`subject-theme-${subject?.theme ?? 'arcane'} subject-bar rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800`}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    {subject && <SubjectTag subject={subject} className="mb-2" />}
                    <h6 className="font-semibold">{sample.title.replace(/^Sample:\s*/, '')}</h6>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{sample.tagline}</p>
                </div>
                <Button size="sm" variant="solid" icon={<AddIcon />} loading={busy} disabled={disabled} onClick={onAdd}>
                    Add to my courses
                </Button>
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1">
                    <span aria-hidden>{navigationIcon.lesson}</span>
                    {contents.join(' · ')} ({plural(sample.questionCount, 'question')})
                </span>
                <span className="inline-flex items-center gap-1">
                    <ImageIcon aria-hidden /> {plural(sample.imageCount, 'picture')}
                </span>
                <span className="inline-flex items-center gap-1">
                    <VideoIcon aria-hidden /> {plural(sample.videoCount, 'video')}
                </span>
            </p>
            <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-primary">What’s inside</summary>
                <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-gray-600 dark:text-gray-300">
                    {sample.activityTitles.map((title) => (
                        <li key={title}>{title}</li>
                    ))}
                </ol>
            </details>
        </li>
    )
}

/**
 * Ready-made courses a teacher can add to see the academy in action: illustrated lessons with videos,
 * a quiz (and in maths a boss battle). Each add is a published copy with its own join code.
 */
export default function SampleCoursesDialog({ isOpen, onClose }: SampleCoursesDialogProps) {
    const router = useRouter()
    const refresh = useCoursesStore((s) => s.refresh)
    const samples = useSWRSampleCourses(isOpen, SWR_ONCE_ONLY)
    const { data: subjects } = useSWRSubjects(SWR_ONCE_ONLY)
    const [adding, setAdding] = useState<string | null>(null)

    const add = async (sample: SampleCourseSummary) => {
        setAdding(sample.id)
        try {
            const { courseId, title } = await apiAddSampleCourse(sample.id)
            toastSuccess(`“${title}” is in your courses. Share its join code to let students try it.`)
            void refresh()
            onClose()
            router.push(getCoursePath(courseId))
        } catch (error) {
            toastError('Couldn’t add the sample course.', error)
        } finally {
            setAdding(null)
        }
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            onRequestClose={adding ? undefined : onClose}
            closable={!adding}
            width={680}
        >
            <h5 className="mb-1">Add a sample course</h5>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Each sample is a complete course with illustrated lessons, a video and a quiz. It’s added to your
                courses as your own published copy with its own join code — change or delete anything.
            </p>
            {samples.data ? (
                <ul className="space-y-3" aria-busy={!!adding}>
                    {samples.data.map((sample) => (
                        <SampleCard
                            key={sample.id}
                            sample={sample}
                            subject={subjects?.find((s) => s.slug === sample.subjectSlug)}
                            busy={adding === sample.id}
                            disabled={!!adding && adding !== sample.id}
                            onAdd={() => void add(sample)}
                        />
                    ))}
                </ul>
            ) : samples.error ? (
                <ErrorState message={tryGetErrorMessage(samples.error)} onRetry={() => void samples.mutate()} />
            ) : (
                <Loading loading message="Loading samples…" className="min-h-40" />
            )}
            {adding && (
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400" role="status">
                    Building the course and publishing its activities — this takes a few seconds…
                </p>
            )}
            <div className="mt-6 flex justify-end">
                <Button onClick={onClose} disabled={!!adding}>
                    Close
                </Button>
            </div>
        </Dialog>
    )
}
