'use client'

import { useId } from 'react'
import { getRankTone, type RankTone } from '@/@types/progression/RankOptions'
import classNames from '@/utils/classNames'

interface RankEmblemProps {
    code: string
    size?: number
    className?: string
    /** Accessible name; defaults to "<code>-Rank" */
    label?: string
}

const TIER: Record<RankTone, number> = {
    iron: 1,
    jade: 2,
    tide: 3,
    azure: 4,
    violet: 5,
    crimson: 6,
    gold: 7,
    radiant: 8,
    prismatic: 9,
}

/**
 * Original rank crest: a hexagonal seal that gains ornaments as ranks rise — wings from C, a crown from
 * S, a second crown and halo at SSS. Colours come from `rank-tone-*` (assets/styles/game/_ranks.css).
 */
export default function RankEmblem({ code, size = 64, className, label }: RankEmblemProps) {
    const id = useId().replace(/:/g, '')
    const tone = getRankTone(code)
    const tier = TIER[tone]
    const fontSize = code.length >= 3 ? 20 : code.length === 2 ? 26 : 34

    return (
        <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            role="img"
            aria-label={label ?? `${code}-Rank`}
            className={classNames('rank-emblem', `rank-tone-${tone}`, className)}
        >
            <defs>
                <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--rank-a)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--rank-b)" stopOpacity="0.12" />
                </linearGradient>
                <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--rank-a)" />
                    <stop offset="50%" stopColor="var(--rank-c)" />
                    <stop offset="100%" stopColor="var(--rank-b)" />
                </linearGradient>
            </defs>

            {tier >= 9 && (
                <circle
                    cx="50"
                    cy="52"
                    r="47"
                    fill="none"
                    stroke={`url(#${id}-stroke)`}
                    strokeWidth="1"
                    strokeDasharray="2 4"
                />
            )}

            {/* Wings (C and above) */}
            {tier >= 4 && (
                <g fill="none" stroke={`url(#${id}-stroke)`} strokeWidth="2.5" strokeLinejoin="round" opacity="0.9">
                    <path d="M18 40 L4 46 L16 52 L6 60 L20 62" />
                    <path d="M82 40 L96 46 L84 52 L94 60 L80 62" />
                </g>
            )}

            {/* Crown (S and above; double at SSS) */}
            {tier >= 7 && (
                <path
                    d="M34 18 L38 8 L44 15 L50 4 L56 15 L62 8 L66 18 Z"
                    fill={`url(#${id}-fill)`}
                    stroke={`url(#${id}-stroke)`}
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
            )}
            {tier >= 9 && (
                <path d="M40 2 L44 -3 L50 1 L56 -3 L60 2" fill="none" stroke={`url(#${id}-stroke)`} strokeWidth="1.5" />
            )}

            {/* Seal */}
            <path
                d="M50 14 L82 32 L82 70 L50 88 L18 70 L18 32 Z"
                fill={`url(#${id}-fill)`}
                stroke={`url(#${id}-stroke)`}
                strokeWidth="3"
                strokeLinejoin="round"
            />
            <path
                d="M50 22 L75 36 L75 66 L50 80 L25 66 L25 36 Z"
                fill="none"
                stroke="var(--rank-a)"
                strokeOpacity={tier >= 2 ? 0.6 : 0.3}
                strokeWidth="1.25"
            />
            {tier >= 5 && (
                <g fill="var(--rank-c)">
                    <circle cx="50" cy="26" r="2" />
                    <circle cx="50" cy="76" r="2" />
                </g>
            )}

            <text
                x="50"
                y="52"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize}
                fontWeight={700}
                fill="var(--rank-text)"
                className="font-display"
            >
                {code}
            </text>
        </svg>
    )
}
