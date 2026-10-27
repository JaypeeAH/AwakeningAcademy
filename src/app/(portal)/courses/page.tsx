import { Suspense } from 'react'
import type { Metadata } from 'next'
import Loading from '@/components/shared/Loading'
import { CoursesSWRProvider } from '@/components/courses/CourseSWRProviders'
import CoursesClientPage from '@/components/courses/CoursesClientPage'

export const metadata: Metadata = { title: 'Courses' }

export default function CoursesPage() {
    return (
        <CoursesSWRProvider>
            <Suspense fallback={<Loading loading message="Loading courses…" />}>
                <CoursesClientPage />
            </Suspense>
        </CoursesSWRProvider>
    )
}
