import type { ReactNode } from 'react'
import navigationIcon, { type NavigationIconKey } from '@/configs/icons.config'

/** Icons an achievement can use (stored by key). 'achievement' is the default award. */
export const ACHIEVEMENT_ICONS: { value: string; label: string; key: NavigationIconKey }[] = [
    { value: 'achievement', label: 'Award', key: 'achievements' },
    { value: 'progression', label: 'Trophy', key: 'progression' },
    { value: 'lesson', label: 'Book', key: 'lesson' },
    { value: 'quiz', label: 'Checklist', key: 'quiz' },
    { value: 'exam', label: 'Scroll', key: 'exam' },
    { value: 'homework', label: 'Notebook', key: 'homework' },
    { value: 'boss', label: 'Skull', key: 'boss' },
    { value: 'team', label: 'Team', key: 'team' },
    { value: 'streak', label: 'Flame', key: 'streak' },
    { value: 'easter', label: 'Egg', key: 'easter' },
    { value: 'secret', label: 'Ghost', key: 'secret' },
    { value: 'skills', label: 'Wand', key: 'skills' },
    { value: 'quests', label: 'Map', key: 'quests' },
    { value: 'codex', label: 'Codex', key: 'codex' },
]

/** The icon for a stored key (unknown keys fall back to the award) */
export const achievementIcon = (icon: string): ReactNode =>
    navigationIcon[ACHIEVEMENT_ICONS.find((i) => i.value === icon)?.key ?? 'achievements'] ??
    navigationIcon.achievements
