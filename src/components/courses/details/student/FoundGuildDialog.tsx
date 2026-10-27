'use client'

import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Input from '@/components/ui/Input'
import { Form, FormItem } from '@/components/ui/Form'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import { guildEmblemIcon } from '@/configs/icons.config'
import { apiFoundGuild } from '@/services/social'
import { useCourseGuildsStore } from '@/stores/GameStores'
import classNames from '@/utils/classNames'
import { GUILD_EMBLEMS } from '@/@types/game/Guilds'

const FORM_ID = 'found-guild-form'

const FoundGuildFormSchema = z.object({
    name: z.string().trim().min(2, 'Give the guild a name').max(40, 'Keep it under 40 characters'),
    motto: z.string().trim().max(120, 'Keep it under 120 characters'),
    emblem: z.enum(GUILD_EMBLEMS),
})
type FoundGuildFormData = z.infer<typeof FoundGuildFormSchema>

interface FoundGuildDialogProps {
    courseId: string
    isOpen: boolean
    onClose: () => void
}

/** A Guild Leader founds a guild. It waits for the teacher's approval; the founder leads it. */
export default function FoundGuildDialog({ courseId, isOpen, onClose }: FoundGuildDialogProps) {
    const setData = useCourseGuildsStore(courseId, (s) => s.setData)
    const form = useForm<FoundGuildFormData>({
        resolver: zodResolver(FoundGuildFormSchema),
        defaultValues: { name: '', motto: '', emblem: 'shield' },
    })
    const {
        register,
        control,
        formState: { errors, isSubmitting },
    } = form

    const close = () => {
        form.reset()
        onClose()
    }

    const onValid = async (input: FoundGuildFormData) => {
        try {
            setData(await apiFoundGuild(courseId, { ...input, open: true, maxMembers: 6 }))
            toastSuccess('Guild founded! Your teacher will approve it soon.')
            close()
        } catch (error) {
            toastError('Couldn’t found the guild.', error)
        }
    }

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={close}
            title="Found a guild"
            confirmText="Found guild"
            confirmForm={FORM_ID}
            loading={isSubmitting}
            width={520}
        >
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                As a Guild Leader you can start a guild in this course. Your teacher approves it before classmates can
                join, and you’ll lead it.
            </p>
            <Form id={FORM_ID} onSubmit={form.handleSubmit(onValid)} noValidate>
                <FormItem
                    label="Guild name"
                    htmlFor="guild-name"
                    invalid={!!errors.name}
                    errorMessage={errors.name?.message}
                >
                    <Input id="guild-name" autoComplete="off" maxLength={40} {...register('name')} />
                </FormItem>
                <FormItem
                    label="Motto (optional)"
                    htmlFor="guild-motto"
                    invalid={!!errors.motto}
                    errorMessage={errors.motto?.message}
                >
                    <Input id="guild-motto" autoComplete="off" maxLength={120} {...register('motto')} />
                </FormItem>
                <FormItem label="Emblem">
                    <Controller
                        name="emblem"
                        control={control}
                        render={({ field }) => (
                            <div role="radiogroup" aria-label="Emblem" className="flex flex-wrap gap-2">
                                {GUILD_EMBLEMS.map((emblem) => (
                                    <button
                                        key={emblem}
                                        type="button"
                                        role="radio"
                                        aria-checked={field.value === emblem}
                                        aria-label={emblem}
                                        onClick={() => field.onChange(emblem)}
                                        className={classNames(
                                            'flex h-11 w-11 items-center justify-center rounded-xl border-2 text-xl',
                                            field.value === emblem
                                                ? 'border-primary bg-primary-subtle text-primary'
                                                : 'border-gray-200 text-gray-500 dark:border-gray-700',
                                        )}
                                    >
                                        {guildEmblemIcon[emblem]}
                                    </button>
                                ))}
                            </div>
                        )}
                    />
                </FormItem>
            </Form>
        </ConfirmDialog>
    )
}
