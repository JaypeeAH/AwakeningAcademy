'use client'

import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Form, FormItem } from '@/components/ui/Form'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import NumberInput from '@/components/activities/editor/NumberInput'
import { apiCreateItem, apiUpdateItem } from '@/services/game'
import { useItemDefinitionsStore } from '@/stores/GameStores'
import {
    ItemDefinitionSchema,
    RARITIES,
    rarityLabel,
    type ItemDefinition,
    type ItemDefinitionInput,
} from '@/@types/game/Inventory'

const FORM_ID = 'item-form'

const KIND_OPTIONS = [
    { value: 'collectible' as const, label: 'Collectible (kept, can complete item sets)' },
    { value: 'consumable' as const, label: 'Consumable (used up)' },
]
const RARITY_OPTIONS = RARITIES.map((value) => ({ value, label: rarityLabel[value] }))

interface ItemDialogProps {
    /** Edit this item; null creates one */
    item: ItemDefinition | null
    isOpen: boolean
    onClose: () => void
}

/** Create or edit an item. The code is fixed once created; items with an effect (the Easter Bunny) keep their kind. */
export default function ItemDialog({ item, isOpen, onClose }: ItemDialogProps) {
    const form = useForm<ItemDefinitionInput>({
        resolver: zodResolver(ItemDefinitionSchema),
        values: {
            code: item?.code ?? '',
            name: item?.name ?? '',
            description: item?.description ?? '',
            kind: item?.kind ?? 'collectible',
            rarity: item?.rarity ?? 'common',
            sortOrder: item?.sortOrder ?? 100,
        },
    })
    const {
        control,
        formState: { errors, isSubmitting },
    } = form
    const kindLocked = !!item?.effect

    const onValid = async (input: ItemDefinitionInput) => {
        try {
            if (item) await apiUpdateItem(item.id, input)
            else await apiCreateItem(input)
            await useItemDefinitionsStore.getState().refresh()
            toastSuccess(item ? 'Item saved.' : 'Item created.')
            onClose()
        } catch (error) {
            toastError('Couldn’t save the item.', error)
        }
    }

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={onClose}
            title={item ? `Edit ${item.name}` : 'New item'}
            confirmText={item ? 'Save' : 'Create item'}
            confirmForm={FORM_ID}
            loading={isSubmitting}
        >
            <FormProvider {...form}>
                <Form id={FORM_ID} onSubmit={form.handleSubmit(onValid)} noValidate>
                    <FormItem
                        label="Name"
                        htmlFor="item-name"
                        asterisk
                        invalid={!!errors.name}
                        errorMessage={errors.name?.message}
                    >
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <Input id="item-name" placeholder="e.g. Moonstone Shard" {...field} />
                            )}
                        />
                    </FormItem>
                    <FormItem
                        label="Code"
                        htmlFor="item-code"
                        asterisk={!item}
                        invalid={!!errors.code}
                        errorMessage={errors.code?.message}
                    >
                        <Controller
                            name="code"
                            control={control}
                            render={({ field }) => (
                                <Input id="item-code" placeholder="moonstone_shard" disabled={!!item} {...field} />
                            )}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            {item ? 'Codes can’t change once created.' : 'Lowercase letters, numbers and underscores.'}
                        </p>
                    </FormItem>
                    <FormItem label="Description" htmlFor="item-description">
                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => <Input id="item-description" textArea rows={2} {...field} />}
                        />
                    </FormItem>
                    <div className="grid gap-x-3 sm:grid-cols-2">
                        <FormItem label="Kind" htmlFor="item-kind">
                            <Controller
                                name="kind"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        inputId="item-kind"
                                        options={KIND_OPTIONS}
                                        value={KIND_OPTIONS.find((o) => o.value === field.value)}
                                        onChange={(option) => option && field.onChange(option.value)}
                                        isDisabled={kindLocked}
                                        isSearchable={false}
                                    />
                                )}
                            />
                            {kindLocked && (
                                <p className="mt-1 text-xs text-gray-500">This item has a built-in effect.</p>
                            )}
                        </FormItem>
                        <FormItem label="Rarity" htmlFor="item-rarity">
                            <Controller
                                name="rarity"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        inputId="item-rarity"
                                        options={RARITY_OPTIONS}
                                        value={RARITY_OPTIONS.find((o) => o.value === field.value)}
                                        onChange={(option) => option && field.onChange(option.value)}
                                        isSearchable={false}
                                    />
                                )}
                            />
                        </FormItem>
                    </div>
                    <FormItem
                        label="Sort order"
                        htmlFor="item-sort"
                        invalid={!!errors.sortOrder}
                        errorMessage={errors.sortOrder?.message}
                    >
                        <Controller
                            name="sortOrder"
                            control={control}
                            render={({ field }) => (
                                <NumberInput
                                    id="item-sort"
                                    min={0}
                                    max={1000}
                                    value={field.value}
                                    onChange={(v) => field.onChange(v ?? 0)}
                                />
                            )}
                        />
                    </FormItem>
                </Form>
            </FormProvider>
        </ConfirmDialog>
    )
}
