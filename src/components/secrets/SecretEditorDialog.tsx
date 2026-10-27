'use client'

import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import { Form, FormItem } from '@/components/ui/Form'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import EggTriggerFields from './EggTriggerFields'
import EggRewardsFields from './EggRewardsFields'
import { SecretFormSchema, emptySecretForm, secretToForm, toSaveEggInput, type SecretFormData } from './secretForm'
import { apiCreateSecret, apiUpdateSecret } from '@/services/game'
import { RARITIES, rarityLabel, type ItemDefinition } from '@/@types/game/Inventory'
import { eggTriggerHelp, eggTriggerLabel, type EasterEgg, type EggTrigger } from '@/@types/game/Secrets'
import type { ActivitySummary } from '@/@types/activities/Activity'

const FORM_ID = 'secret-form'

const TRIGGER_OPTIONS = (Object.keys(eggTriggerLabel) as EggTrigger[]).map((value) => ({
    value,
    label: eggTriggerLabel[value],
}))
const RARITY_OPTIONS = RARITIES.map((value) => ({ value, label: rarityLabel[value] }))

interface SecretEditorDialogProps {
    courseId: string
    /** Edit this secret; null creates one */
    secret: EasterEgg | null
    isOpen: boolean
    activities: ActivitySummary[]
    items: ItemDefinition[]
    onClose: () => void
    onSaved: (secret: EasterEgg, created: boolean) => void
}

/** Create or edit an Easter egg: what students see, how it's found, and what it gives */
export default function SecretEditorDialog({
    courseId,
    secret,
    isOpen,
    activities,
    items,
    onClose,
    onSaved,
}: SecretEditorDialogProps) {
    const form = useForm<SecretFormData>({
        resolver: zodResolver(SecretFormSchema),
        values: secret ? secretToForm(secret) : emptySecretForm(),
    })
    const {
        control,
        formState: { errors, isSubmitting },
    } = form
    const trigger = useWatch({ control, name: 'trigger' })

    const onValid = async (data: SecretFormData) => {
        try {
            const input = toSaveEggInput(data)
            const saved = secret ? await apiUpdateSecret(secret.id, input) : await apiCreateSecret(courseId, input)
            toastSuccess(secret ? 'Secret saved.' : 'Secret hidden.')
            onSaved(saved, !secret)
        } catch (error) {
            toastError('Couldn’t save the secret.', error)
        }
    }

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            onRequestClose={isSubmitting ? undefined : onClose}
            closable={!isSubmitting}
            width={720}
        >
            <h4 className="mb-1 pr-6">{secret ? 'Edit secret' : 'Hide a new secret'}</h4>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Students see a silhouette in their Codex until they find it. No code changes needed.
            </p>
            <FormProvider {...form}>
                <Form
                    id={FORM_ID}
                    onSubmit={form.handleSubmit(onValid)}
                    noValidate
                    className="max-h-[60vh] overflow-y-auto pr-1"
                >
                    <FormItem
                        label="Name"
                        htmlFor="egg-title"
                        asterisk
                        invalid={!!errors.title}
                        errorMessage={errors.title?.message}
                    >
                        <Controller
                            name="title"
                            control={control}
                            render={({ field }) => (
                                <Input id="egg-title" placeholder="e.g. The Owl’s Feather" {...field} />
                            )}
                        />
                    </FormItem>

                    <div className="grid gap-x-3 sm:grid-cols-2">
                        <FormItem label="How it’s found" htmlFor="egg-trigger">
                            <Controller
                                name="trigger"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        inputId="egg-trigger"
                                        options={TRIGGER_OPTIONS}
                                        value={TRIGGER_OPTIONS.find((o) => o.value === field.value)}
                                        onChange={(option) => option && field.onChange(option.value)}
                                        isSearchable={false}
                                    />
                                )}
                            />
                        </FormItem>
                        <FormItem label="Rarity" htmlFor="egg-rarity">
                            <Controller
                                name="rarity"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        inputId="egg-rarity"
                                        options={RARITY_OPTIONS}
                                        value={RARITY_OPTIONS.find((o) => o.value === field.value)}
                                        onChange={(option) => option && field.onChange(option.value)}
                                        isSearchable={false}
                                    />
                                )}
                            />
                        </FormItem>
                    </div>
                    <p className="-mt-2 mb-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                        {eggTriggerHelp[trigger]}
                    </p>

                    <EggTriggerFields courseId={courseId} activities={activities} items={items} />

                    <FormItem
                        label="Clue"
                        htmlFor="egg-clue"
                        invalid={!!errors.clue}
                        errorMessage={errors.clue?.message}
                    >
                        <Controller
                            name="clue"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    id="egg-clue"
                                    textArea
                                    rows={2}
                                    placeholder="A hint, never the answer — e.g. “Owls see what others miss.”"
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>
                    <Controller
                        name="clueVisible"
                        control={control}
                        render={({ field }) => (
                            <label className="mb-4 flex items-start gap-3 text-sm">
                                <Switcher checked={field.value} onChange={field.onChange} />
                                <span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        Show the clue in the Codex
                                    </span>
                                    <span className="block text-xs text-gray-500">
                                        Off: students only see a “???” silhouette (Dungeon Sense can still reveal the
                                        clue).
                                    </span>
                                </span>
                            </label>
                        )}
                    />

                    <FormItem
                        label="Revealed on discovery"
                        htmlFor="egg-reveal"
                        invalid={!!errors.reveal}
                        errorMessage={errors.reveal?.message}
                    >
                        <Controller
                            name="reveal"
                            control={control}
                            render={({ field }) => (
                                <Input
                                    id="egg-reveal"
                                    textArea
                                    rows={4}
                                    placeholder="Lore, a fun fact or a congratulations. Markdown works."
                                    {...field}
                                />
                            )}
                        />
                    </FormItem>

                    <EggRewardsFields items={items} />

                    <Controller
                        name="active"
                        control={control}
                        render={({ field }) => (
                            <label className="mb-2 flex items-start gap-3 text-sm">
                                <Switcher checked={field.value} onChange={field.onChange} />
                                <span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">Active</span>
                                    <span className="block text-xs text-gray-500">
                                        Inactive secrets can’t be found and disappear from the Codex of students who
                                        haven’t found them yet.
                                    </span>
                                </span>
                            </label>
                        )}
                    />
                </Form>
            </FormProvider>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button onClick={onClose} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button variant="solid" type="submit" form={FORM_ID} loading={isSubmitting}>
                    {secret ? 'Save' : 'Hide secret'}
                </Button>
            </div>
        </Dialog>
    )
}
