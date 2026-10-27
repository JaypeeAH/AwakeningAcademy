import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { unwrap } from '@/server/data/supabase/errors'
import { isSubjectTheme } from '@/@types/subjects/SubjectOptions'
import { GRADED_KINDS } from '@/@types/activities/ActivityKindOptions'
import { getNextSubjectTitle, getPlayerClass, getSubjectTitle } from '@/utils/classTitles'
import type { Tables } from '@/@types/supabase/database.types'
import type { ClassTitle, PlayerClass, Subject, SubjectMeta, SubjectPath } from '@/@types/subjects/Subject'

export const mapSubjectMeta = (row: Pick<Tables<'subjects'>, 'id' | 'slug' | 'name' | 'theme'>): SubjectMeta => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    theme: isSubjectTheme(row.theme) ? row.theme : 'arcane',
})

const mapSubject = (row: Tables<'subjects'>): Subject => ({
    ...mapSubjectMeta(row),
    description: row.description,
    sortOrder: row.sort_order,
})

const mapClassTitle = (row: Tables<'class_titles'>): ClassTitle => ({
    id: row.id,
    subjectId: row.subject_id,
    tier: row.tier,
    title: row.title,
    description: row.description,
    minSubjectLevel: row.min_subject_level,
    minMastery: Number(row.min_mastery),
    minSubjectCount: row.min_subject_count,
})

export async function getSubjects(): Promise<Subject[]> {
    const rows = unwrap(await supabaseAdmin().from('subjects').select('*').order('sort_order'), 'load subjects')
    return rows.map(mapSubject)
}

export async function getClassTitles(): Promise<ClassTitle[]> {
    const rows = unwrap(
        await supabaseAdmin().from('class_titles').select('*').order('subject_id').order('tier'),
        'load class titles',
    )
    return rows.map(mapClassTitle)
}

/**
 * The student's path in every subject they've earned XP in: level, mastery (average best score on
 * graded assessments in that subject's courses) and current/next class title.
 */
export async function getSubjectPaths(studentId: string, titles?: ClassTitle[]): Promise<SubjectPath[]> {
    const db = supabaseAdmin()
    const [progressResult, completionsResult, subjects, allTitles] = await Promise.all([
        db.from('student_subject_progress').select('subject_id, xp, level').eq('student_id', studentId),
        db
            .from('activity_completions')
            .select('best_percent, kind, course:courses(subject_id)')
            .eq('student_id', studentId)
            .in('kind', GRADED_KINDS),
        getSubjects(),
        titles ? Promise.resolve(titles) : getClassTitles(),
    ])
    const progress = unwrap(progressResult, 'load subject progress')
    const completions = unwrap(completionsResult, 'load mastery')

    return progress
        .map((p): SubjectPath | null => {
            const subject = subjects.find((s) => s.id === p.subject_id)
            if (!subject) return null
            const scores = completions
                .filter((c) => c.course?.subject_id === p.subject_id && c.best_percent !== null)
                .map((c) => Number(c.best_percent))
            const mastery = scores.length
                ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
                : 0
            const standing = { subjectId: p.subject_id, level: p.level, mastery }
            return {
                subject: mapSubjectMeta(subject),
                xp: Number(p.xp),
                level: p.level,
                mastery,
                gradedCount: scores.length,
                title: getSubjectTitle(standing, allTitles),
                nextTitle: getNextSubjectTitle(standing, allTitles),
            }
        })
        .filter((p): p is SubjectPath => p !== null)
        .sort((a, b) => b.level - a.level || b.xp - a.xp)
}

export async function getStudentClass(
    studentId: string,
    equippedTitleId: string | null,
): Promise<{ playerClass: PlayerClass; paths: SubjectPath[] }> {
    const titles = await getClassTitles()
    const paths = await getSubjectPaths(studentId, titles)
    const playerClass = getPlayerClass(
        paths.map((p) => ({ subjectId: p.subject.id, level: p.level, mastery: p.mastery })),
        titles,
        equippedTitleId,
    )
    return { playerClass, paths }
}
