'use client'

import { useId } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import classNames from '@/utils/classNames'

export interface MarkState {
    /** Text so the field can be blank (not yet marked) */
    points: string
    feedback: string
    /** Auto-graded questions: the teacher chose to override the score */
    adjust: boolean
}

interface GradeQuestionPanelProps {
    maxPoints: number
    /** Essays / uploads: must be marked by the teacher */
    manual: boolean
    /** The score the auto-grader gave (auto-graded questions) */
    autoPoints: number
    mark: MarkState
    onChange: (mark: MarkState) => void
    error?: string | null
}

/** Points and a comment for one answer. Auto-graded answers keep their score unless "Adjust" is turned on. */
export default function GradeQuestionPanel({
    maxPoints,
    manual,
    autoPoints,
    mark,
    onChange,
    error,
}: GradeQuestionPanelProps) {
    const id = useId()
    const editable = manual || mark.adjust
    const half = Math.round((maxPoints / 2) * 2) / 2

    return (
        <div
            className={classNames(
                'mt-3 rounded-2xl border p-4',
                manual && mark.points === ''
                    ? 'border-info bg-info-subtle'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900',
            )}
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="sm:w-64">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                        <label
                            htmlFor={`${id}-points`}
                            className="text-sm font-semibold text-gray-700 dark:text-gray-200"
                        >
                            {manual ? 'Points' : 'Auto-graded'}
                            {manual && <span className="text-error"> *</span>}
                        </label>
                        {!manual && (
                            <label className="flex items-center gap-2 text-xs text-gray-500">
                                Adjust
                                <Switcher
                                    checked={mark.adjust}
                                    onChange={(adjust) =>
                                        onChange({ ...mark, adjust, points: adjust ? mark.points : String(autoPoints) })
                                    }
                                />
                            </label>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            id={`${id}-points`}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={maxPoints}
                            step={0.5}
                            size="sm"
                            className="w-24"
                            value={mark.points}
                            disabled={!editable}
                            invalid={!!error}
                            placeholder="—"
                            onChange={(e) => onChange({ ...mark, points: e.target.value })}
                            aria-describedby={`${id}-max`}
                        />
                        <span id={`${id}-max`} className="text-sm text-gray-500">
                            / {maxPoints}
                        </span>
                    </div>
                    {editable && (
                        <div className="mt-2 flex gap-1.5" role="group" aria-label="Quick marks">
                            {[
                                { label: '0', value: 0 },
                                ...(maxPoints > 1 ? [{ label: 'Half', value: half }] : []),
                                { label: 'Full', value: maxPoints },
                            ].map((quick) => (
                                <Button
                                    key={quick.label}
                                    size="xs"
                                    active={mark.points !== '' && Number(mark.points) === quick.value}
                                    onClick={() => onChange({ ...mark, points: String(quick.value) })}
                                    aria-label={`${quick.label} marks (${quick.value})`}
                                >
                                    {quick.label}
                                </Button>
                            ))}
                        </div>
                    )}
                    {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
                </div>
                <div className="flex-1">
                    <label
                        htmlFor={`${id}-comment`}
                        className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200"
                    >
                        Comment for the student <span className="font-normal text-gray-500">(optional)</span>
                    </label>
                    <Input
                        id={`${id}-comment`}
                        textArea
                        rows={3}
                        maxLength={5000}
                        value={mark.feedback}
                        onChange={(e) => onChange({ ...mark, feedback: e.target.value })}
                        placeholder="What went well, and one thing to work on"
                    />
                </div>
            </div>
        </div>
    )
}
