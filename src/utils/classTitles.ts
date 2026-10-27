import type { ClassTitle, PlayerClass } from '@/@types/subjects/Subject'

/*
 * Player classes. A student's class comes from the subjects they study: each subject has a ladder of
 * titles (Numeral Initiate → … → Advanced Mathematician → Sage of Numbers) unlocked by that subject's
 * path level AND mastery (average best score in its graded assessments). Cross-subject titles
 * (Polymath) need several subjects at a bar. The student may equip any unlocked title; otherwise the
 * best title from their strongest subject is shown.
 */

export interface PathStanding {
    subjectId: string
    level: number
    mastery: number
}

const meets = (title: ClassTitle, path: PathStanding) =>
    path.level >= title.minSubjectLevel && path.mastery >= title.minMastery

/** The highest-tier title unlocked in one subject, or null */
export const getSubjectTitle = (path: PathStanding, titles: ClassTitle[]) =>
    titles.filter((t) => t.subjectId === path.subjectId && meets(t, path)).sort((a, b) => b.tier - a.tier)[0] ?? null

/** The next title in a subject's ladder (what to work toward), or null at the top */
export const getNextSubjectTitle = (path: PathStanding, titles: ClassTitle[]) =>
    titles.filter((t) => t.subjectId === path.subjectId && !meets(t, path)).sort((a, b) => a.tier - b.tier)[0] ?? null

export const getUnlockedTitles = (paths: PathStanding[], titles: ClassTitle[]): ClassTitle[] => {
    const subjectTitles = titles.filter(
        (t) => t.subjectId !== null && paths.some((p) => p.subjectId === t.subjectId && meets(t, p)),
    )
    const hybridTitles = titles.filter(
        (t) => t.subjectId === null && paths.filter((p) => meets(t, p)).length >= t.minSubjectCount,
    )
    return [...hybridTitles.sort((a, b) => b.tier - a.tier), ...subjectTitles.sort((a, b) => b.tier - a.tier)]
}

/**
 * The title to display: the equipped one while it is still unlocked; otherwise the best hybrid title,
 * otherwise the highest-tier title of the strongest subject (by level, then mastery).
 */
export const getPlayerClass = (
    paths: PathStanding[],
    titles: ClassTitle[],
    equippedTitleId: string | null,
): PlayerClass => {
    const unlocked = getUnlockedTitles(paths, titles)
    const equipped = equippedTitleId ? unlocked.find((t) => t.id === equippedTitleId) : undefined
    if (equipped) return { displayed: equipped, equippedTitleId, unlocked }

    const hybrid = unlocked.find((t) => t.subjectId === null)
    if (hybrid) return { displayed: hybrid, equippedTitleId: null, unlocked }

    const strongest = [...paths].sort((a, b) => b.level - a.level || b.mastery - a.mastery)[0]
    return { displayed: strongest ? getSubjectTitle(strongest, titles) : null, equippedTitleId: null, unlocked }
}

/** Shown before a student has earned XP in any subject */
export const UNCLASSED_TITLE = 'Awakened Novice'
