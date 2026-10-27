import type { NavigationIconKey } from '@/configs/icons.config'

/** Subject colour themes (stored on `subjects.theme`); CSS for `subject-theme-*` in game/_system.css */
export const SUBJECT_THEMES = ['arcane', 'verdant', 'ember', 'amber', 'storm', 'rose', 'tide', 'vigor'] as const
export type SubjectTheme = (typeof SUBJECT_THEMES)[number]

export const isSubjectTheme = (value: string): value is SubjectTheme =>
    (SUBJECT_THEMES as readonly string[]).includes(value)

export const subjectThemeIcon: Record<SubjectTheme, NavigationIconKey> = {
    arcane: 'subjectMath',
    verdant: 'subjectScience',
    ember: 'subjectEnglish',
    amber: 'subjectHistory',
    storm: 'subjectTechnology',
    rose: 'subjectArts',
    tide: 'subjectLanguages',
    vigor: 'subjectHealth',
}

export const subjectTagClass = (theme: SubjectTheme) => `subject-tag subject-theme-${theme}`
