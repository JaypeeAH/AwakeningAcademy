'use client'

import { Controller, useFormContext } from 'react-hook-form'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import { FormItem } from '@/components/ui/Form'
import NumberInput from './NumberInput'
import { DifficultyIcon } from '@/configs/icons.config'
import {
    DIFFICULTY_LABELS,
    activityKindLabel,
    isAssessment,
    type ActivityKind,
} from '@/@types/activities/ActivityKindOptions'
import classNames from '@/utils/classNames'
import { FORMAL_KINDS } from '@/utils/skills'
import { feedbackModeDescription, feedbackModeLabel, type FeedbackMode } from '@/utils/feedback'
import type { ActivityFormData } from '@/@types/activities/forms/ActivityFormData'
import type { ActivityEditorData } from '@/@types/activities/ActivityEditor'

interface ActivitySettingsFieldsProps {
    kind: ActivityKind
    xpRule: ActivityEditorData['xpRule']
    siblings: ActivityEditorData['siblings']
}

const FEEDBACK_MODES: FeedbackMode[] = ['immediate', 'after_due', 'score_only']

/** Rewards, scheduling, attempts, time limit, feedback and prerequisites */
export default function ActivitySettingsFields({ kind, xpRule, siblings }: ActivitySettingsFieldsProps) {
    const {
        control,
        formState: { errors },
    } = useFormContext<ActivityFormData>()
    const assessment = isAssessment(kind)
    // Never on exams, homework or boss battles (the server enforces this too); lessons have nothing to skip
    const powersAllowed = assessment && !FORMAL_KINDS.includes(kind)
    const prerequisiteOptions = siblings.map((s) => ({
        value: s.id,
        label: `${s.title} (${activityKindLabel[s.kind]})`,
    }))

    return (
        <>
            <FormItem label="Difficulty">
                <Controller
                    name="difficulty"
                    control={control}
                    render={({ field }) => (
                        <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Difficulty">
                            {DIFFICULTY_LABELS.map((label, i) => (
                                <button
                                    key={label}
                                    type="button"
                                    role="radio"
                                    aria-checked={field.value === i + 1}
                                    aria-label={`${i + 1} — ${label}`}
                                    title={label}
                                    onClick={() => field.onChange(i + 1)}
                                    className="rounded p-0.5 text-xl"
                                >
                                    <DifficultyIcon
                                        className={classNames(
                                            i < field.value
                                                ? 'fill-current text-gold'
                                                : 'text-gray-300 dark:text-gray-600',
                                        )}
                                    />
                                </button>
                            ))}
                            <span className="ml-2 text-sm text-gray-500">{DIFFICULTY_LABELS[field.value - 1]}</span>
                        </div>
                    )}
                />
            </FormItem>

            <FormItem
                label="XP reward"
                htmlFor="activity-xp"
                invalid={!!errors.xpReward}
                errorMessage={errors.xpReward?.message}
            >
                <Controller
                    name="xpReward"
                    control={control}
                    render={({ field }) => (
                        <NumberInput
                            id="activity-xp"
                            min={xpRule?.minXp ?? 0}
                            max={xpRule?.maxXp}
                            value={field.value}
                            onChange={(v) => field.onChange(v ?? 0)}
                            onBlur={field.onBlur}
                            invalid={!!errors.xpReward}
                        />
                    )}
                />
                {xpRule && (
                    <p className="mt-1 text-xs text-gray-500">
                        Your administrator allows {xpRule.minXp}–{xpRule.maxXp} XP.
                    </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                    {kind === 'team_quest'
                        ? 'Every member of the guild earns this once, when their guild completes the team goal.'
                        : assessment
                          ? 'Earned once, the first time a student passes (unless XP is repeatable below). Scores of 90%+ also earn a high-score bonus.'
                          : 'Earned once, the first time the student completes the lesson.'}
                </p>
            </FormItem>

            <FormItem
                label="Estimated minutes"
                htmlFor="activity-minutes"
                invalid={!!errors.estimatedMinutes}
                errorMessage={errors.estimatedMinutes?.message}
            >
                <Controller
                    name="estimatedMinutes"
                    control={control}
                    render={({ field }) => (
                        <NumberInput
                            id="activity-minutes"
                            min={1}
                            max={600}
                            placeholder="Optional"
                            value={field.value}
                            onChange={field.onChange}
                        />
                    )}
                />
            </FormItem>

            <div className="grid gap-x-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <FormItem label="Opens" htmlFor="activity-opens">
                    <Controller
                        name="opensAt"
                        control={control}
                        render={({ field }) => <Input id="activity-opens" type="datetime-local" {...field} />}
                    />
                </FormItem>
                <FormItem
                    label="Due"
                    htmlFor="activity-due"
                    invalid={!!errors.dueAt}
                    errorMessage={errors.dueAt?.message}
                >
                    <Controller
                        name="dueAt"
                        control={control}
                        render={({ field }) => (
                            <Input id="activity-due" type="datetime-local" invalid={!!errors.dueAt} {...field} />
                        )}
                    />
                </FormItem>
            </div>
            <p className="-mt-2 mb-4 text-xs text-gray-500">
                Leave blank for always open / no deadline. Students can still finish after the due date; you’ll see it
                as overdue.
            </p>

            {assessment && (
                <div className="grid gap-x-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <FormItem
                        label="Max attempts"
                        htmlFor="activity-attempts"
                        invalid={!!errors.maxAttempts}
                        errorMessage={errors.maxAttempts?.message}
                    >
                        <Controller
                            name="maxAttempts"
                            control={control}
                            render={({ field }) => (
                                <NumberInput
                                    id="activity-attempts"
                                    min={1}
                                    max={100}
                                    placeholder="Unlimited"
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="Passing score (%)"
                        htmlFor="activity-passing"
                        invalid={!!errors.passingScore}
                        errorMessage={errors.passingScore?.message}
                    >
                        <Controller
                            name="passingScore"
                            control={control}
                            render={({ field }) => (
                                <NumberInput
                                    id="activity-passing"
                                    min={0}
                                    max={100}
                                    value={field.value}
                                    onChange={(v) => field.onChange(v ?? 0)}
                                />
                            )}
                        />
                    </FormItem>
                </div>
            )}

            {assessment && (
                <FormItem
                    label="Time limit (minutes)"
                    htmlFor="activity-time-limit"
                    invalid={!!errors.timeLimitMinutes}
                    errorMessage={errors.timeLimitMinutes?.message}
                >
                    <Controller
                        name="timeLimitMinutes"
                        control={control}
                        render={({ field }) => (
                            <NumberInput
                                id="activity-time-limit"
                                min={1}
                                max={600}
                                placeholder="Untimed"
                                value={field.value}
                                onChange={field.onChange}
                                invalid={!!errors.timeLimitMinutes}
                            />
                        )}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Leave blank for untimed. The server keeps time. Answers autosave; if time runs out, what was
                        saved is handed in.
                    </p>
                </FormItem>
            )}

            {assessment && (
                <Controller
                    name="feedbackMode"
                    control={control}
                    render={({ field }) => (
                        <fieldset className="mb-4">
                            <legend className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                When students see the answers
                            </legend>
                            <div className="space-y-2">
                                {FEEDBACK_MODES.map((mode) => (
                                    <label
                                        key={mode}
                                        className={classNames(
                                            'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                                            field.value === mode
                                                ? 'border-primary bg-primary-subtle'
                                                : 'border-gray-200 hover:border-primary dark:border-gray-700',
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="activity-feedback-mode"
                                            className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
                                            checked={field.value === mode}
                                            onChange={() => field.onChange(mode)}
                                        />
                                        <span>
                                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                {feedbackModeLabel[mode]}
                                            </span>
                                            <span className="block text-xs text-gray-500">
                                                {feedbackModeDescription[mode]}
                                            </span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                            <p className="mt-2 text-xs text-gray-500">
                                Your comments on marked work are always shown to the student.
                            </p>
                        </fieldset>
                    )}
                />
            )}
            {assessment && (
                <Controller
                    name="xpRepeatable"
                    control={control}
                    render={({ field }) => (
                        <label className="mb-4 flex items-start gap-3 text-sm">
                            <Switcher checked={field.value} onChange={field.onChange} />
                            <span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">Repeatable XP</span>
                                <span className="block text-xs text-gray-500">
                                    Award XP on every passing attempt (for drills). Off: XP once.
                                </span>
                            </span>
                        </label>
                    )}
                />
            )}

            {powersAllowed && (
                <fieldset className="mb-4 space-y-3">
                    <legend className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Skills & Easter Bunnies
                    </legend>
                    <Controller
                        name="allowSkills"
                        control={control}
                        render={({ field }) => (
                            <label className="flex items-start gap-3 text-sm">
                                <Switcher checked={field.value} onChange={field.onChange} />
                                <span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">Allow skills</span>
                                    <span className="block text-xs text-gray-500">
                                        Students can use unlocked skills such as Insight (removes one wrong option) or
                                        Knowledge Echo (points back to a lesson).
                                    </span>
                                </span>
                            </label>
                        )}
                    />
                    <Controller
                        name="allowBunnySkips"
                        control={control}
                        render={({ field }) => (
                            <label className="flex items-start gap-3 text-sm">
                                <Switcher checked={field.value} onChange={field.onChange} />
                                <span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        Allow Easter Bunny skips
                                    </span>
                                    <span className="block text-xs text-gray-500">
                                        Students can spend an Easter Bunny to skip a question. It’s recorded as skipped,
                                        never correct.
                                    </span>
                                </span>
                            </label>
                        )}
                    />
                </fieldset>
            )}

            <FormItem label="Prerequisites" htmlFor="activity-prerequisites">
                <Controller
                    name="prerequisiteIds"
                    control={control}
                    render={({ field }) => (
                        <Select
                            inputId="activity-prerequisites"
                            isMulti
                            options={prerequisiteOptions}
                            value={prerequisiteOptions.filter((o) => field.value.includes(o.value))}
                            onChange={(options) => field.onChange(options.map((o) => o.value))}
                            placeholder={prerequisiteOptions.length ? 'None' : 'No other activities in this course yet'}
                            isDisabled={!prerequisiteOptions.length}
                        />
                    )}
                />
                <p className="mt-1 text-xs text-gray-500">Locked until these are completed (assessments: passed).</p>
            </FormItem>
        </>
    )
}
