'use client'

import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import { Form, FormItem } from '@/components/ui/Form'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import NumberInput from '@/components/activities/editor/NumberInput'
import { guildEmblemIcon } from '@/configs/icons.config'
import { apiCreateGuild, apiUpdateGuild } from '@/services/social'
import { useCourseGuildsStore } from '@/stores/GameStores'
import classNames from '@/utils/classNames'
import { GUILD_EMBLEMS, SaveGuildSchema, type Guild, type SaveGuildInput } from '@/@types/game/Guilds'

const FORM_ID = 'guild-form'

interface GuildDialogProps {
    courseId: string
    /** Edit this guild; null creates one */
    guild: Guild | null
    isOpen: boolean
    onClose: () => void
}

/** Create or edit a guild: name, motto, emblem, size, and whether students may ask to join */
export default function GuildDialog({ courseId, guild, isOpen, onClose }: GuildDialogProps) {
    const setData = useCourseGuildsStore(courseId, (s) => s.setData)
    const form = useForm<SaveGuildInput>({
        resolver: zodResolver(SaveGuildSchema),
        values: {
            name: guild?.name ?? '',
            motto: guild?.motto ?? '',
            emblem: guild?.emblem ?? 'shield',
            open: guild?.open ?? true,
            maxMembers: guild?.maxMembers ?? 6,
        },
    })
    const {
        control,
        formState: { errors, isSubmitting },
    } = form

    const onValid = async (input: SaveGuildInput) => {
        try {
            setData(guild ? await apiUpdateGuild(guild.id, input) : await apiCreateGuild(courseId, input))
            toastSuccess(guild ? 'Guild saved.' : 'Guild created.')
            onClose()
        } catch (error) {
            toastError('Couldn’t save the guild.', error)
        }
    }

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={onClose}
            title={guild ? `Edit ${guild.name}` : 'New guild'}
            confirmText={guild ? 'Save' : 'Create guild'}
            confirmForm={FORM_ID}
            loading={isSubmitting}
        >
            <FormProvider {...form}>
                <Form id={FORM_ID} onSubmit={form.handleSubmit(onValid)} noValidate>
                    <FormItem
                        label="Name"
                        htmlFor="guild-name"
                        asterisk
                        invalid={!!errors.name}
                        errorMessage={errors.name?.message}
                    >
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <Input id="guild-name" placeholder="e.g. The Night Owls" maxLength={40} {...field} />
                            )}
                        />
                    </FormItem>
                    <FormItem label="Motto (optional)" htmlFor="guild-motto">
                        <Controller
                            name="motto"
                            control={control}
                            render={({ field }) => (
                                <Input id="guild-motto" placeholder="Wisdom in the dark" maxLength={120} {...field} />
                            )}
                        />
                    </FormItem>
                    <Controller
                        name="emblem"
                        control={control}
                        render={({ field }) => (
                            <fieldset className="mb-4">
                                <legend className="form-label mb-2">Emblem</legend>
                                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Emblem">
                                    {GUILD_EMBLEMS.map((emblem) => (
                                        <button
                                            key={emblem}
                                            type="button"
                                            role="radio"
                                            aria-checked={field.value === emblem}
                                            aria-label={emblem}
                                            title={emblem}
                                            onClick={() => field.onChange(emblem)}
                                            className={classNames(
                                                'flex h-11 w-11 items-center justify-center rounded-xl border text-xl transition-colors',
                                                field.value === emblem
                                                    ? 'border-primary bg-primary-subtle text-primary'
                                                    : 'border-gray-200 text-gray-500 hover:border-primary dark:border-gray-700',
                                            )}
                                        >
                                            {guildEmblemIcon[emblem]}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                        )}
                    />
                    <FormItem
                        label="Maximum members"
                        htmlFor="guild-max"
                        invalid={!!errors.maxMembers}
                        errorMessage={errors.maxMembers?.message}
                    >
                        <Controller
                            name="maxMembers"
                            control={control}
                            render={({ field }) => (
                                <NumberInput
                                    id="guild-max"
                                    min={2}
                                    max={30}
                                    value={field.value}
                                    onChange={(v) => field.onChange(v ?? 2)}
                                />
                            )}
                        />
                    </FormItem>
                    <Controller
                        name="open"
                        control={control}
                        render={({ field }) => (
                            <label className="flex items-start gap-3 text-sm">
                                <Switcher checked={field.value} onChange={field.onChange} />
                                <span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        Students can ask to join
                                    </span>
                                    <span className="block text-xs text-gray-500">
                                        You approve each request. Off: only you add members.
                                    </span>
                                </span>
                            </label>
                        )}
                    />
                </Form>
            </FormProvider>
        </ConfirmDialog>
    )
}
