/**
 * Plain-language reasons a student may need support, for teacher reports. Based on learning signals
 * (scores, missed work) — never on XP or rank, which measure effort and engagement, not understanding.
 */
export function getSupportReasons({
    averageScore,
    overdue,
    failedAssessments,
}: {
    averageScore: number | null
    overdue: number
    failedAssessments: number
}): string[] {
    const reasons: string[] = []
    if (averageScore !== null && averageScore < 60) reasons.push(`Averaging ${averageScore}% on graded work`)
    if (overdue > 0) reasons.push(`${overdue} overdue ${overdue === 1 ? 'activity' : 'activities'}`)
    if (failedAssessments >= 2) reasons.push(`Not yet passed ${failedAssessments} assessments`)
    return reasons
}
