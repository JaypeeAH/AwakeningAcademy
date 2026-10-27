'use client'

import CourseManageView from './manage/CourseManageView'
import StudentCourseView from './StudentCourseView'
import Loading from '@/components/shared/Loading'
import ErrorState from '@/components/shared/ErrorState'
import { useCourseStore } from '@/stores/GameStores'
import { getCoursePath } from '@/configs/app.config'
import useRecordRecentItem from '@/utils/hooks/useRecordRecentItem'

interface CourseClientPageProps {
    courseId: string
}

/** Teachers (and admins) manage the course; enrolled students play it. */
export default function CourseClientPage({ courseId }: CourseClientPageProps) {
    const detail = useCourseStore(courseId, (s) => s.data)
    const error = useCourseStore(courseId, (s) => s.error)
    const refresh = useCourseStore(courseId, (s) => s.refresh)

    useRecordRecentItem(
        detail
            ? {
                  id: courseId,
                  kind: 'course',
                  title: detail.course.title,
                  subtitle: detail.course.subject.name,
                  href: getCoursePath(courseId),
              }
            : null,
    )

    if (!detail) {
        return error ? (
            <ErrorState message={error} onRetry={() => void refresh()} />
        ) : (
            <Loading loading message="Opening the course…" />
        )
    }
    return detail.course.canManage ? (
        <CourseManageView courseId={courseId} />
    ) : (
        <StudentCourseView courseId={courseId} />
    )
}
