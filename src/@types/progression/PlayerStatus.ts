import type { LevelProgress, MasteryStats, ProgressionSettings, Rank, RankTrial, XpLedgerEntry } from './Progression'
import type { PlayerClass, SubjectPath } from '@/@types/subjects/Subject'
import type { Quest } from '@/@types/activities/Activity'

/** Everything the student dashboard ("Status Window") shows, in one request */
export interface PlayerStatus {
    player: { id: string; displayName: string }
    progress: LevelProgress
    rank: Rank
    trial: RankTrial | null
    mastery: MasteryStats
    playerClass: PlayerClass
    paths: SubjectPath[]
    recentRewards: XpLedgerEntry[]
    /** The next thing to do: an in-progress quest, else the earliest-due available one */
    recommended: Quest | null
    activeCourses: {
        id: string
        title: string
        subjectTheme: string
        subjectName: string
        completed: number
        total: number
    }[]
    settings: ProgressionSettings
}
