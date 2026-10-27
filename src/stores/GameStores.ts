import { create } from 'zustand'
import { createKeyedResourceStore, createResourceStore, resourceSlice, type ResourceState } from './createResourceStore'
import type { PlayerStatus } from '@/@types/progression/PlayerStatus'
import type { Quest, QuestState, ActivityPlayView, ActivityResults } from '@/@types/activities/Activity'
import type { Course } from '@/@types/courses/Course'
import type { CourseDetail } from '@/services/courses'
import type { CourseActivities } from '@/services/activities'
import type { RosterStudent } from '@/@types/courses/Course'
import type { CourseProgressReport, TeacherOverview, AdminOverview } from '@/@types/reports/Reports'
import type { ActivityEditorData } from '@/@types/activities/ActivityEditor'
import type { NotificationFeed } from '@/@types/notifications/Notification'
import type { PlayerProfile } from '@/services/users'
import type { ProgressionConfig } from '@/services/progression'
import type { AttemptForGrading, GradingQueue } from '@/@types/grading/Grading'
import type { Inventory, ItemDefinition, SkillBook, SkillDefinition } from '@/@types/game/Inventory'
import type { Codex, EasterEgg } from '@/@types/game/Secrets'
import type { AchievementBook, AchievementDefinition } from '@/@types/game/Achievements'
import type { CourseGuilds, Leaderboard } from '@/@types/game/Guilds'
import type { StreakStatus } from '@/@types/progression/Streak'

/* Resource stores (filled by *SWRProviders through useSyncResource). */

/** The student dashboard ("status window") */
export const usePlayerStatusStore = createResourceStore<PlayerStatus>()

export const useProfileStore = createResourceStore<PlayerProfile>()

export const useNotificationsStore = createResourceStore<NotificationFeed>()

export const useCoursesStore = createResourceStore<Course[]>()

export const useTeacherOverviewStore = createResourceStore<TeacherOverview>()

export const useAdminOverviewStore = createResourceStore<AdminOverview>()

export const useProgressionConfigStore = createResourceStore<ProgressionConfig>()

/** The teacher's grading queue */
export const useGradingQueueStore = createResourceStore<GradingQueue>()

/** The student's inventory, skill book and Codex */
export const useInventoryStore = createResourceStore<Inventory>()
export const useSkillBookStore = createResourceStore<SkillBook>()
export const useCodexStore = createResourceStore<Codex>()

/** Phase 4: the student's streak and achievements; admin achievement definitions */
export const useStreakStore = createResourceStore<StreakStatus>()
export const useAchievementsStore = createResourceStore<AchievementBook>()
export const useAchievementDefinitionsStore = createResourceStore<AchievementDefinition[]>()

/** Item and skill catalogues (items: teachers and admins; skills: admins) */
export const useItemDefinitionsStore = createResourceStore<ItemDefinition[]>()
export const useSkillDefinitionsStore = createResourceStore<SkillDefinition[]>()

/** Per course id */
export const { useKeyedStore: useCourseStore, getState: getCourseState } = createKeyedResourceStore<CourseDetail>()
export const { useKeyedStore: useCourseActivitiesStore, getState: getCourseActivitiesState } =
    createKeyedResourceStore<CourseActivities>()
export const { useKeyedStore: useRosterStore, getState: getRosterState } = createKeyedResourceStore<RosterStudent[]>()
export const { useKeyedStore: useCourseProgressStore } = createKeyedResourceStore<CourseProgressReport>()
export const { useKeyedStore: useCourseSecretsStore, getState: getCourseSecretsState } =
    createKeyedResourceStore<EasterEgg[]>()
export const { useKeyedStore: useCourseGuildsStore, getState: getCourseGuildsState } =
    createKeyedResourceStore<CourseGuilds>()
export const { useKeyedStore: useLeaderboardStore } = createKeyedResourceStore<Leaderboard>()

/** Per activity id */
export const { useKeyedStore: useActivityEditorStore, getState: getActivityEditorState } =
    createKeyedResourceStore<ActivityEditorData>()
export const { useKeyedStore: useActivityResultsStore } = createKeyedResourceStore<ActivityResults>()
export const { useKeyedStore: usePlayViewStore, getState: getPlayViewState } =
    createKeyedResourceStore<ActivityPlayView>()

/** Per attempt id (the grader) */
export const { useKeyedStore: useGradingAttemptStore, getState: getGradingAttemptState } =
    createKeyedResourceStore<AttemptForGrading>()

// ── Quest board: data + filters ───────────────────────────────────────────────────────────────────

export type QuestFilterState = QuestState | 'all' | 'open'

export interface QuestFilter {
    courseId: string | null
    state: QuestFilterState
    query: string
}

interface QuestBoardState extends ResourceState<Quest[]> {
    filter: QuestFilter
    setFilter: (filter: Partial<QuestFilter>) => void
    resetFilter: () => void
}

const DEFAULT_QUEST_FILTER: QuestFilter = { courseId: null, state: 'open', query: '' }

export const useQuestBoardStore = create<QuestBoardState>()((set) => ({
    ...resourceSlice<Quest[], QuestBoardState>(set),
    filter: DEFAULT_QUEST_FILTER,
    setFilter: (filter) => set((state) => ({ filter: { ...state.filter, ...filter } })),
    resetFilter: () => set({ filter: DEFAULT_QUEST_FILTER }),
}))

const STATE_ORDER: Record<QuestState, number> = {
    in_progress: 0,
    available: 1,
    in_review: 2,
    upcoming: 3,
    locked: 4,
    completed: 5,
}

/** Filtered + sorted quests. Builds a new array — call inside useMemo, never as a store selector. */
export function getVisibleQuests(quests: Quest[] | undefined, filter: QuestFilter): Quest[] {
    const q = filter.query.trim().toLowerCase()
    return (quests ?? [])
        .filter((quest) => !filter.courseId || quest.course.id === filter.courseId)
        .filter((quest) =>
            filter.state === 'all'
                ? true
                : filter.state === 'open'
                  ? quest.state === 'available' || quest.state === 'in_progress'
                  : quest.state === filter.state,
        )
        .filter(
            (quest) =>
                !q ||
                [quest.title, quest.summary, quest.course.title, quest.moduleTitle ?? ''].some((v) =>
                    v.toLowerCase().includes(q),
                ),
        )
        .sort(
            (a, b) =>
                STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
                (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity) ||
                a.course.title.localeCompare(b.course.title) ||
                a.position - b.position,
        )
}
