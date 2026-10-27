'use client'

import { motion, useReducedMotion } from 'framer-motion'
import navigationIcon from '@/configs/icons.config'
import { bossHpLeft, type BossConfig } from '@/utils/boss'
import classNames from '@/utils/classNames'

/*
 * Boss battle presentation. The boss's HP comes only from the server-graded score and is shown after
 * hand-in — never during the attempt, where it would reveal which answers are right.
 */

/** Briefing: the boss and its phases */
export function BossBriefing({ boss }: { boss: BossConfig }) {
    return (
        <div className="boss-briefing mb-4 rounded-2xl border border-error/30 bg-error-subtle p-4">
            <div className="flex items-center gap-3">
                <span className="text-3xl text-error" aria-hidden>
                    {navigationIcon.boss}
                </span>
                <div>
                    <div className="system-eyebrow text-error">Boss battle</div>
                    <p className="font-display text-xl font-semibold text-gray-900 dark:text-gray-50">{boss.name}</p>
                </div>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Fight through every phase, then hand in. Your score decides how much damage you deal.
            </p>
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                {boss.phases.map((title, i) => (
                    <li key={i} className="rounded-lg bg-white/70 px-3 py-2 text-sm dark:bg-gray-900/60">
                        <span className="font-semibold text-error">Phase {i + 1}</span> · {title}
                    </li>
                ))}
            </ol>
        </div>
    )
}

/** During the attempt: the boss and the current phase (no HP — that would give answers away) */
export function BossPhaseHeader({ boss, phase }: { boss: BossConfig; phase: number }) {
    const title = boss.phases[phase - 1] ?? `Phase ${phase}`
    return (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-error/30 bg-error-subtle px-4 py-3">
            <span className="text-2xl text-error" aria-hidden>
                {navigationIcon.boss}
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900 dark:text-gray-50">{boss.name}</p>
                <p className="text-sm text-error" aria-live="polite">
                    Phase {phase} of {boss.phases.length}: {title}
                </p>
            </div>
        </div>
    )
}

/** After hand-in: the boss's HP, from the graded score */
export function BossHpBar({ boss, percent, passed }: { boss: BossConfig; percent: number | null; passed: boolean }) {
    const reduceMotion = useReducedMotion()
    const hp = bossHpLeft(percent)
    return (
        <div className="rounded-2xl border border-error/30 bg-error-subtle p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-50">
                    <span className="text-xl text-error" aria-hidden>
                        {navigationIcon.boss}
                    </span>
                    {boss.name}
                </span>
                <span className={classNames('font-display font-bold', passed ? 'text-success' : 'text-error')}>
                    {passed ? 'Defeated!' : `${hp}% HP left`}
                </span>
            </div>
            <div
                className="h-3 overflow-hidden rounded-full bg-white/70 dark:bg-gray-900/60"
                role="meter"
                aria-label={`${boss.name}’s HP`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={hp}
            >
                <motion.div
                    className="h-full rounded-full bg-error"
                    {...(reduceMotion
                        ? { style: { width: `${hp}%` } }
                        : {
                              initial: { width: '100%' },
                              animate: { width: `${hp}%` },
                              transition: { duration: 1.2, ease: 'easeOut' as const, delay: 0.3 },
                          })}
                />
            </div>
            {!passed && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                    Your score sets the damage. Review the phases below and challenge it again.
                </p>
            )}
        </div>
    )
}
