import { Suspense, cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Loading from '@/components/shared/Loading'
import { CourseSWRProvider } from '@/components/courses/CourseSWRProviders'
import CourseClientPage from '@/components/courses/details/CourseClientPage'
import { getCourse } from '@/server/actions/courses'
import { requireUser } from '@/server/actions/auth'
import { isNotFound } from '@/server/utils/errors'

interface CoursePageProps {
    params: Promise<{ courseId: string }>
}

const UUID = /^[0-9a-f-]{36}$/i

// Shared by generateMetadata and the page within one request
const loadCourse = cache(async (courseId: string) => {
    if (!UUID.test(courseId)) notFound()
    try {
        return await getCourse(await requireUser(), courseId)
    } catch (error) {
        if (isNotFound(error)) notFound()
        throw error
    }
})

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
    const { course } = await loadCourse((await params).courseId)
    return { title: course.title }
}

const PageProvider = async ({ params }: CoursePageProps) => {
    const { courseId } = await params
    const course = await loadCourse(courseId)
    return (
        <CourseSWRProvider courseId={courseId} course={course}>
            <CourseClientPage courseId={courseId} />
        </CourseSWRProvider>
    )
}

/** One course: teachers manage it (content, roster, progress); students see its quests. */
export default function CoursePage(props: CoursePageProps) {
    return (
        <Suspense fallback={<Loading loading message="Opening the course…" />}>
            <PageProvider {...props} />
        </Suspense>
    )
}
