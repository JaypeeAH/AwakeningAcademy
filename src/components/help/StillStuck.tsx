import navigationIcon from '@/configs/icons.config'
import classNames from '@/utils/classNames'
import type { Role } from '@/@types/auth/Roles'

const NEXT_STEP: Record<Role, string> = {
    student:
        'Ask your teacher. They can see your courses and quests, check your work and fix most problems. For a problem with your account, they can pass it on to your school’s administrator.',
    teacher:
        'Contact your school’s administrator. They manage accounts and roles, the school-wide XP and rank rules, and settings such as AI drafting.',
    admin: 'Check the audit log and your hosting logs (search for the reference code in an error message), and see docs/OPERATIONS.md in the project for setup, backups and troubleshooting.',
}

/** The end of every Help Center page: who to ask next, for this role */
export default function StillStuck({ role, className }: { role: Role; className?: string }) {
    return (
        <section
            aria-labelledby="still-stuck"
            className={classNames(
                'flex flex-col items-start gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:flex-row sm:items-center dark:border-gray-700 dark:bg-gray-900',
                className,
            )}
        >
            <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-2xl text-primary"
                aria-hidden
            >
                {navigationIcon.help}
            </span>
            <div>
                <h2 id="still-stuck" className="text-base font-semibold">
                    Still stuck?
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{NEXT_STEP[role]}</p>
            </div>
        </section>
    )
}
