import {
    achievementsPath,
    adminAchievementsPath,
    adminAuditPath,
    adminItemsPath,
    codexPath,
    inventoryPath,
    adminProgressionPath,
    adminUsersPath,
    analyticsPath,
    coursesPath,
    gradingPath,
    helpPath,
    historyPath,
    homePath,
    profilePath,
    questsPath,
} from './app.config'
import { NAV_ITEM_TYPE_ITEM, NAV_ITEM_TYPE_TITLE } from '@/constants/navigation.constant'
import type { NavigationTree } from '@/@types/navigation'
import type { Permission } from '@/@types/auth/Roles'
import type { NavigationIconKey } from './icons.config'

const item = (
    key: string,
    path: string,
    title: string,
    icon: NavigationIconKey,
    authority: Permission[] = [],
): NavigationTree => ({
    key,
    path,
    title,
    icon,
    type: NAV_ITEM_TYPE_ITEM,
    authority,
    subMenu: [],
})

const section = (
    key: string,
    title: string,
    subMenu: NavigationTree[],
    authority: Permission[] = [],
): NavigationTree => ({
    key,
    path: '',
    title,
    icon: 'dashboard',
    type: NAV_ITEM_TYPE_TITLE,
    authority,
    subMenu,
})

/** Side navigation. `useNavigation` hides items the user lacks permission for, and empty sections. */
const navigationConfig: NavigationTree[] = [
    section('workspace', 'Academy', [
        item('home', homePath, 'Dashboard', 'dashboard'),
        item('quests', questsPath, 'Quest Board', 'quests', ['play']),
        item('courses', coursesPath, 'Courses', 'courses', ['play', 'courses.manage']),
        item('grading', gradingPath, 'Grading', 'grading', ['results.view']),
        item('analytics', analyticsPath, 'Analytics', 'analytics', ['results.view']),
        item('profile', profilePath, 'Player Profile', 'profile', ['play']),
        item('history', historyPath, 'Chronicle', 'history', ['play']),
        item('inventory', inventoryPath, 'Inventory & Skills', 'inventory', ['play']),
        item('codex', codexPath, 'Codex', 'codex', ['play']),
        item('achievements', achievementsPath, 'Achievements', 'achievements', ['play']),
        item('help', helpPath, 'Help Center', 'help'),
    ]),
    section('admin', 'Administration', [
        item('users', adminUsersPath, 'Users & roles', 'users', ['users.manage']),
        item('progression', adminProgressionPath, 'Progression rules', 'progression', ['progression.manage']),
        item('items', adminItemsPath, 'Items & skills', 'items', ['progression.manage']),
        item('admin-achievements', adminAchievementsPath, 'Achievements', 'achievements', ['progression.manage']),
        item('audit', adminAuditPath, 'Audit log', 'audit', ['audit.view']),
    ]),
]

export default navigationConfig
