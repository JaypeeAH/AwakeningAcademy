/**
 * Every icon in the app, by meaning. Components import from here — never from react-icons directly —
 * so the icon language stays consistent and can be swapped in one place.
 */
import type { ReactNode } from 'react'
import {
    TbAdjustmentsHorizontal,
    TbAlertTriangle,
    TbArrowDown,
    TbArrowRight,
    TbArrowUp,
    TbArrowsMaximize,
    TbArrowsMinimize,
    TbAward,
    TbBackpack,
    TbChartBar,
    TbBell,
    TbBold,
    TbBolt,
    TbBook,
    TbBook2,
    TbBuildingCastle,
    TbBulb,
    TbCalendar,
    TbChalkboard,
    TbCheck,
    TbChecklist,
    TbChevronDown,
    TbChevronLeft,
    TbChevronRight,
    TbChevronUp,
    TbCircleCheck,
    TbClipboardList,
    TbClock,
    TbCode,
    TbCompass,
    TbCopy,
    TbCpu,
    TbCrown,
    TbDatabase,
    TbDeviceFloppy,
    TbDiamond,
    TbEgg,
    TbEye,
    TbEyeOff,
    TbFeather,
    TbFileText,
    TbFilter,
    TbFlame,
    TbFlask,
    TbGhost2,
    TbGripVertical,
    TbH2,
    TbH3,
    TbHeartbeat,
    TbHistory,
    TbHourglass,
    TbHourglassHigh,
    TbInfoCircle,
    TbInfoSquareRounded,
    TbItalic,
    TbKey,
    TbLanguage,
    TbLayoutDashboard,
    TbLeaf,
    TbLifebuoy,
    TbLink,
    TbList,
    TbListCheck,
    TbListNumbers,
    TbLock,
    TbLogin,
    TbLogout,
    TbMail,
    TbMap2,
    TbMathFunction,
    TbMedal,
    TbMessage,
    TbMoon,
    TbNotebook,
    TbPalette,
    TbPencil,
    TbPhoto,
    TbPlayerPlay,
    TbPlus,
    TbQuote,
    TbRadar,
    TbRefresh,
    TbRepeat,
    TbRocket,
    TbRoute,
    TbScript,
    TbSearch,
    TbSend,
    TbSeparatorHorizontal,
    TbShield,
    TbShieldLock,
    TbSkull,
    TbSparkles,
    TbStairsUp,
    TbStar,
    TbSun,
    TbSwords,
    TbTable,
    TbTarget,
    TbTrash,
    TbTrophy,
    TbUpload,
    TbUserCog,
    TbUserPlus,
    TbUsers,
    TbUsersGroup,
    TbVideo,
    TbWand,
    TbWaveSine,
    TbX,
} from 'react-icons/tb'

// ── Actions ──
export const AddIcon = TbPlus
export const EditIcon = TbPencil
export const DeleteIcon = TbTrash
export const SaveIcon = TbDeviceFloppy
export const CopyIcon = TbCopy
export const RefreshIcon = TbRefresh
export const PreviewIcon = TbEye
export const ShowPasswordIcon = TbEye
export const HidePasswordIcon = TbEyeOff
export const EmailIcon = TbMail
export const PasswordIcon = TbKey
export const LinkIcon = TbLink
export const UploadIcon = TbUpload
export const FileIcon = TbFileText
export const FeedbackIcon = TbMessage
export const TimerIcon = TbHourglassHigh
export const GradingIcon = TbChecklist
export const SubmitIcon = TbSend
export const StartIcon = TbPlayerPlay
export const CloseIcon = TbX
export const CheckIcon = TbCheck
export const SearchIcon = TbSearch
export const FilterIcon = TbFilter
export const DragIcon = TbGripVertical
export const MoveUpIcon = TbArrowUp
export const MoveDownIcon = TbArrowDown
export const NextIcon = TbChevronRight
export const PrevIcon = TbChevronLeft
export const ExpandIcon = TbChevronDown
export const CollapseIcon = TbChevronUp
export const ForwardIcon = TbArrowRight
export const SignInIcon = TbLogin
export const SignOutIcon = TbLogout
export const AddUserIcon = TbUserPlus

// ── Status ──
export const SuccessIcon = TbCircleCheck
export const ApproveIcon = TbCircleCheck
export const WarningIcon = TbAlertTriangle
export const InfoIcon = TbInfoCircle
export const LockedIcon = TbLock
export const ClockIcon = TbClock
export const CalendarIcon = TbCalendar
export const DurationIcon = TbHourglass

// ── Game ──
export const XpIcon = TbBolt
export const LevelIcon = TbStairsUp
export const RankIcon = TbCrown
export const StreakIcon = TbFlame
export const AchievementIcon = TbAward
export const MedalIcon = TbMedal
export const DifficultyIcon = TbStar
export const TrialIcon = TbTarget
export const SparkleIcon = TbSparkles
export const ClassIcon = TbSwords
export const NotificationIcon = TbBell
export const DarkModeIcon = TbMoon
export const LightModeIcon = TbSun

// ── People & admin ──
export const StudentsIcon = TbUsers
export const RolesIcon = TbUserCog
export const SettingsIcon = TbAdjustmentsHorizontal
export const AuditIcon = TbShieldLock

// ── Skills, items & secrets ──
export const SkillIcon = TbWand
export const ItemIcon = TbDiamond
export const InsightIcon = TbBulb
export const EchoIcon = TbBook2
export const SecondChanceIcon = TbRepeat
export const OverdriveIcon = TbRocket
export const SenseIcon = TbRadar

// ── Lesson editor toolbar ──
export const HeadingIcon = TbH2
export const SubheadingIcon = TbH3
export const BoldIcon = TbBold
export const ItalicIcon = TbItalic
export const LinkInsertIcon = TbLink
export const BulletListIcon = TbList
export const NumberedListIcon = TbListNumbers
export const QuoteIcon = TbQuote
export const CalloutIcon = TbInfoSquareRounded
export const CodeIcon = TbCode
export const TableIcon = TbTable
export const DividerIcon = TbSeparatorHorizontal
export const ImageIcon = TbPhoto
export const VideoIcon = TbVideo
export const FullScreenIcon = TbArrowsMaximize
export const ExitFullScreenIcon = TbArrowsMinimize

// ── Question bank ──
export const BankIcon = TbDatabase

const navigationIcon = {
    dashboard: <TbLayoutDashboard />,
    quests: <TbMap2 />,
    courses: <TbBuildingCastle />,
    teaching: <TbChalkboard />,
    profile: <TbSwords />,
    history: <TbHistory />,
    users: <TbUserCog />,
    progression: <TbTrophy />,
    audit: <TbShieldLock />,
    recent: <TbCompass />,
    inventory: <TbBackpack />,
    analytics: <TbChartBar />,
    codex: <TbBook2 />,
    skills: <TbWand />,
    items: <TbDiamond />,
    achievements: <TbAward />,
    leaderboard: <TbTrophy />,
    guilds: <TbUsersGroup />,
    streak: <TbFlame />,
    help: <TbLifebuoy />,
    // Activity kinds
    lesson: <TbBook />,
    practice: <TbFeather />,
    quiz: <TbListCheck />,
    exam: <TbScript />,
    homework: <TbNotebook />,
    boss: <TbSkull />,
    team: <TbUsersGroup />,
    secret: <TbGhost2 />,
    easter: <TbEgg />,
    route: <TbRoute />,
    clipboard: <TbClipboardList />,
    bank: <TbDatabase />,
    grading: <TbChecklist />,
    // Subjects (SubjectOptions.subjectThemeIcon)
    subjectMath: <TbMathFunction />,
    subjectScience: <TbFlask />,
    subjectEnglish: <TbFeather />,
    subjectHistory: <TbScript />,
    subjectTechnology: <TbCpu />,
    subjectArts: <TbPalette />,
    subjectLanguages: <TbLanguage />,
    subjectHealth: <TbHeartbeat />,
} satisfies Record<string, ReactNode>

export type NavigationIconKey = keyof typeof navigationIcon

/** Guild emblems (GUILD_EMBLEMS) */
export const guildEmblemIcon: Record<string, ReactNode> = {
    shield: <TbShield />,
    flame: <TbFlame />,
    star: <TbStar />,
    moon: <TbMoon />,
    leaf: <TbLeaf />,
    wave: <TbWaveSine />,
    bolt: <TbBolt />,
    crown: <TbCrown />,
}

export default navigationIcon as Record<NavigationIconKey, ReactNode>
