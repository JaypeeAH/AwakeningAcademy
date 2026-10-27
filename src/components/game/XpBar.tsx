import classNames from '@/utils/classNames'
import type { ReactNode } from 'react'

interface XpBarProps {
    value: number
    max: number
    /** Visible label above the bar (left) */
    label?: ReactNode
    /** Visible text above the bar (right); defaults to "value / max XP" */
    valueText?: ReactNode
    tone?: 'primary' | 'gold'
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const HEIGHTS = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' }

/** Accessible progress bar with the "system" glow. The fill eases in (instantly under reduced motion). */
export default function XpBar({ value, max, label, valueText, tone = 'primary', size = 'md', className }: XpBarProps) {
    const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 100
    const text = valueText ?? `${value.toLocaleString()} / ${max.toLocaleString()} XP`
    return (
        <div className={className}>
            {(label || text) && (
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">{label}</span>
                    <span className="tabular-nums text-gray-500 dark:text-gray-400">{text}</span>
                </div>
            )}
            <div
                className={classNames('xp-bar', HEIGHTS[size])}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={max}
                aria-valuenow={value}
                aria-valuetext={typeof text === 'string' ? text : `${Math.round(percent)}%`}
            >
                <div
                    className={classNames('xp-bar-fill', tone === 'gold' && 'xp-bar-fill-gold')}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    )
}
