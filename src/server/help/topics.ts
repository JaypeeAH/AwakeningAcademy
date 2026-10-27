import 'server-only'
import type { HelpTopic } from '@/@types/help/Help'

/** Topics in the order they appear. Administrators see the teacher topics too. */
export const helpTopics: HelpTopic[] = [
    // ── Students ──
    {
        key: 'student-start',
        title: 'Getting started',
        description: 'Joining a course, finding your way around, and your account.',
        icon: 'route',
        audiences: ['student'],
    },
    {
        key: 'student-quests',
        title: 'Lessons & quests',
        description: 'Lessons, quizzes, exams, homework, boss battles and team quests.',
        icon: 'quests',
        audiences: ['student'],
    },
    {
        key: 'student-progress',
        title: 'XP, levels & ranks',
        description: 'How you level up, climb ranks, grow your class and keep a streak.',
        icon: 'progression',
        audiences: ['student'],
    },
    {
        key: 'student-rewards',
        title: 'Items, skills & secrets',
        description: 'Your inventory, skills, the Easter Bunny, the Codex and achievements.',
        icon: 'codex',
        audiences: ['student'],
    },
    {
        key: 'student-social',
        title: 'Guilds & leaderboards',
        description: 'Teaming up with classmates, and who sees your XP.',
        icon: 'guilds',
        audiences: ['student'],
    },
    // ── Teachers (and administrators) ──
    {
        key: 'teach-start',
        title: 'Getting started',
        description: 'Create a course, invite your class, or explore a sample course.',
        icon: 'teaching',
        audiences: ['teacher', 'admin'],
    },
    {
        key: 'teach-build',
        title: 'Building content',
        description: 'Activities, the lesson editor, quizzes, exams and AI drafts.',
        icon: 'lesson',
        audiences: ['teacher', 'admin'],
    },
    {
        key: 'teach-results',
        title: 'Grading & insights',
        description: 'Mark work, give feedback, and follow how your class is learning.',
        icon: 'analytics',
        audiences: ['teacher', 'admin'],
    },
    {
        key: 'teach-game',
        title: 'Game features',
        description: 'Boss battles, team quests, guilds, leaderboards and secrets.',
        icon: 'boss',
        audiences: ['teacher', 'admin'],
    },
    // ── Administrators ──
    {
        key: 'admin-people',
        title: 'People & privacy',
        description: 'Roles, XP corrections, data downloads and account deletion.',
        icon: 'users',
        audiences: ['admin'],
    },
    {
        key: 'admin-rules',
        title: 'Rules & rewards',
        description: 'Levels, ranks, XP ranges, streaks, items, skills and achievements.',
        icon: 'progression',
        audiences: ['admin'],
    },
    {
        key: 'admin-ops',
        title: 'Running the Academy',
        description: 'The audit log, security, setup, error alerts and backups.',
        icon: 'audit',
        audiences: ['admin'],
    },
]
