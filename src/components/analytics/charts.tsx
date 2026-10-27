'use client'

import { useState, type ReactNode } from 'react'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import classNames from '@/utils/classNames'
import type { ScoreBucket } from '@/@types/reports/Analytics'

/*
 * Small, dependency-free charts for teacher analytics. Each is one series in one hue (no legend needed —
 * the title names it), thin marks with 4px rounded data-ends, hairline gridlines, a hover/focus tooltip,
 * and a table view so no value is reachable only by hovering.
 */

const { THead, TBody, Tr, Th, Td } = Table

/** Clean upper bound for a count axis: 1, 2, 5, 10, 20, 50… */
function niceMax(value: number) {
    if (value <= 1) return 1
    const magnitude = 10 ** Math.floor(Math.log10(value))
    const step = [1, 2, 5, 10].find((s) => s * magnitude >= value) ?? 10
    return step * magnitude
}

function TableToggle({ showTable, onToggle }: { showTable: boolean; onToggle: () => void }) {
    return (
        <Button size="xs" variant="plain" onClick={onToggle} aria-pressed={showTable}>
            {showTable ? 'Show chart' : 'Show as table'}
        </Button>
    )
}

/** Columns of graded attempts per 10-point score band */
export function ScoreHistogram({ buckets }: { buckets: ScoreBucket[] }) {
    const [active, setActive] = useState<number | null>(null)
    const [showTable, setShowTable] = useState(false)
    const total = buckets.reduce((s, b) => s + b.count, 0)
    const top = niceMax(Math.max(...buckets.map((b) => b.count)))
    const ticks = [top, top / 2, 0]

    return (
        <div>
            <div className="mb-2 flex justify-end">
                <TableToggle showTable={showTable} onToggle={() => setShowTable((v) => !v)} />
            </div>
            {showTable ? (
                <Table compact>
                    <THead>
                        <Tr>
                            <Th>Score</Th>
                            <Th className="text-right">Attempts</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {buckets.map((b) => (
                            <Tr key={b.label}>
                                <Td>{b.label}</Td>
                                <Td className="text-right tabular-nums">{b.count}</Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
            ) : (
                <div className="flex gap-2" role="img" aria-label={`Score distribution of ${total} graded attempts`}>
                    {/* Y axis */}
                    <div
                        className="flex h-44 flex-col justify-between pb-6 text-right text-xs text-gray-500 tabular-nums"
                        aria-hidden
                    >
                        {ticks.map((t) => (
                            <span
                                key={t}
                                className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0"
                            >
                                {Number.isInteger(t) ? t : ''}
                            </span>
                        ))}
                    </div>
                    <div className="relative flex-1">
                        {/* Hairline gridlines */}
                        <div
                            className="pointer-events-none absolute inset-x-0 top-0 h-38 border-t border-gray-100 dark:border-gray-700"
                            aria-hidden
                        />
                        <div
                            className="pointer-events-none absolute inset-x-0 top-19 h-px bg-gray-100 dark:bg-gray-700"
                            aria-hidden
                        />
                        <div className="flex h-44 items-end gap-0.5 pb-6">
                            {buckets.map((b, i) => (
                                <div
                                    key={b.label}
                                    className="relative flex h-full flex-1 flex-col items-center justify-end"
                                >
                                    <button
                                        type="button"
                                        className="group flex h-full w-full items-end justify-center outline-none"
                                        onMouseEnter={() => setActive(i)}
                                        onMouseLeave={() => setActive(null)}
                                        onFocus={() => setActive(i)}
                                        onBlur={() => setActive(null)}
                                        aria-label={`${b.label}: ${b.count} ${b.count === 1 ? 'attempt' : 'attempts'}`}
                                    >
                                        <span
                                            className={classNames(
                                                'block w-full max-w-6 rounded-t-[4px] bg-primary transition-opacity group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2',
                                                active !== null && active !== i && 'opacity-50',
                                            )}
                                            style={{ height: `${(b.count / top) * 100}%`, minHeight: b.count ? 2 : 0 }}
                                        />
                                    </button>
                                    <span
                                        className="absolute -bottom-5 text-[10px] text-gray-500 tabular-nums"
                                        aria-hidden
                                    >
                                        {b.from}
                                    </span>
                                    {active === i && (
                                        <div
                                            className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-md dark:border-gray-700 dark:bg-gray-900"
                                            role="tooltip"
                                        >
                                            <strong className="text-gray-900 dark:text-gray-50">{b.count}</strong>{' '}
                                            <span className="text-gray-500">
                                                {b.count === 1 ? 'attempt' : 'attempts'} · {b.label}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="-mt-6 h-px bg-gray-200 dark:bg-gray-600" aria-hidden />
                    </div>
                </div>
            )}
        </div>
    )
}

export interface BarRow {
    key: string
    label: ReactNode
    /** Plain text for screen readers and the table */
    name: string
    value: number
    /** Shown at the bar's tip */
    valueLabel: string
    /** Extra detail in the tooltip and table */
    detail?: string
}

/**
 * Horizontal bars, one row each, value at the tip. `max` fixes the scale (100 for percentages);
 * `muted` draws secondary (engagement) data in a recessive gray.
 */
export function BarList({
    rows,
    max,
    muted,
    caption,
}: {
    rows: BarRow[]
    max?: number
    muted?: boolean
    caption: string
}) {
    const [showTable, setShowTable] = useState(false)
    const scale = max ?? Math.max(1, ...rows.map((r) => r.value))
    return (
        <div>
            <div className="mb-2 flex justify-end">
                <TableToggle showTable={showTable} onToggle={() => setShowTable((v) => !v)} />
            </div>
            {showTable ? (
                <Table compact>
                    <caption className="sr-only">{caption}</caption>
                    <TBody>
                        {rows.map((r) => (
                            <Tr key={r.key}>
                                <Td>{r.name}</Td>
                                <Td className="text-right tabular-nums">{r.valueLabel}</Td>
                                {rows.some((x) => x.detail) && <Td className="text-gray-500">{r.detail}</Td>}
                            </Tr>
                        ))}
                    </TBody>
                </Table>
            ) : (
                <ul className="space-y-3" aria-label={caption}>
                    {rows.map((r) => (
                        <li
                            key={r.key}
                            title={r.detail ? `${r.name}: ${r.valueLabel} · ${r.detail}` : `${r.name}: ${r.valueLabel}`}
                        >
                            <div className="mb-1 text-sm text-gray-700 dark:text-gray-200">{r.label}</div>
                            <div className="flex items-center gap-3">
                                <div className="h-3 flex-1" aria-hidden>
                                    <div
                                        className={classNames(
                                            'h-full rounded-r-[4px]',
                                            muted ? 'bg-gray-400 dark:bg-gray-500' : 'bg-primary',
                                        )}
                                        style={{
                                            width: `${Math.max(0, Math.min(100, (r.value / scale) * 100))}%`,
                                            minWidth: r.value ? 2 : 0,
                                        }}
                                    />
                                </div>
                                <span className="w-28 shrink-0 text-right text-sm tabular-nums text-gray-900 dark:text-gray-50">
                                    {r.valueLabel}
                                    {r.detail && <span className="block text-xs text-gray-500">{r.detail}</span>}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
