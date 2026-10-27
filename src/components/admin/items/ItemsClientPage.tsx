'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag'
import PageHeader from '@/components/shared/PageHeader'
import Loading from '@/components/shared/Loading'
import ErrorState from '@/components/shared/ErrorState'
import ItemDialog from './ItemDialog'
import SkillDialog from './SkillDialog'
import { AddIcon, EditIcon } from '@/configs/icons.config'
import { homePath } from '@/configs/app.config'
import { useSWRProgressionConfig } from '@/services/progression'
import { useItemDefinitionsStore, useSkillDefinitionsStore } from '@/stores/GameStores'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import { activityKindLabel } from '@/@types/activities/ActivityKindOptions'
import { rarityLabel, rarityTagClass, type ItemDefinition, type SkillDefinition } from '@/@types/game/Inventory'

const { THead, TBody, Tr, Th, Td } = Table

/** Administrators manage the item catalogue (rewards for secrets) and tune every skill. */
export default function ItemsClientPage() {
    usePageBreadcrumbs([{ label: 'Dashboard', href: homePath }, { label: 'Items & skills' }])

    return (
        <>
            <PageHeader
                eyebrow="Administration"
                title="Items & skills"
                description="Items are what secrets give students (the Easter Bunny lets them skip a practice question). Skills unlock as students level up; tune when they unlock and how often they recharge."
            />
            <div className="space-y-6">
                <ItemsSection />
                <SkillsSection />
            </div>
        </>
    )
}

function ItemsSection() {
    const items = useItemDefinitionsStore((s) => s.data)
    const error = useItemDefinitionsStore((s) => s.error)
    const refresh = useItemDefinitionsStore((s) => s.refresh)
    const [dialog, setDialog] = useState<{ open: boolean; item: ItemDefinition | null }>({ open: false, item: null })

    return (
        <Card
            header={{
                content: <h4>Items</h4>,
                extra: (
                    <Button size="sm" icon={<AddIcon />} onClick={() => setDialog({ open: true, item: null })}>
                        New item
                    </Button>
                ),
            }}
            bodyClass="p-0"
        >
            {items ? (
                <div className="overflow-x-auto">
                    <Table>
                        <THead>
                            <Tr>
                                <Th>Item</Th>
                                <Th>Kind</Th>
                                <Th>Rarity</Th>
                                <Th>
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {items.map((item) => (
                                <Tr key={item.id}>
                                    <Td>
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                                            {item.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            <code>{item.code}</code>
                                            {item.description ? ` · ${item.description}` : ''}
                                        </div>
                                    </Td>
                                    <Td>
                                        {item.kind === 'consumable' ? 'Consumable' : 'Collectible'}
                                        {item.effect === 'bunny_skip' && (
                                            <div className="text-xs text-gray-500">Skips one practice question</div>
                                        )}
                                    </Td>
                                    <Td>
                                        <Tag className={rarityTagClass[item.rarity]}>{rarityLabel[item.rarity]}</Tag>
                                    </Td>
                                    <Td className="text-right">
                                        <Button
                                            size="xs"
                                            variant="plain"
                                            icon={<EditIcon />}
                                            aria-label={`Edit ${item.name}`}
                                            onClick={() => setDialog({ open: true, item })}
                                        />
                                    </Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                </div>
            ) : error ? (
                <ErrorState message={error} onRetry={() => void refresh()} />
            ) : (
                <Loading loading message="Loading items…" />
            )}
            <ItemDialog
                item={dialog.item}
                isOpen={dialog.open}
                onClose={() => setDialog({ open: false, item: null })}
            />
        </Card>
    )
}

function SkillsSection() {
    const skills = useSkillDefinitionsStore((s) => s.data)
    const error = useSkillDefinitionsStore((s) => s.error)
    const refresh = useSkillDefinitionsStore((s) => s.refresh)
    const progression = useSWRProgressionConfig({ revalidateOnFocus: false })
    const ranks = progression.data?.ranks ?? []
    const [editing, setEditing] = useState<SkillDefinition | null>(null)
    const rankCode = (order: number) => ranks.find((r) => r.sortOrder === order)?.code ?? `#${order}`

    const unlockText = (skill: SkillDefinition) =>
        [
            `Level ${skill.minLevel}`,
            skill.minRankOrder > 1 ? `${rankCode(skill.minRankOrder)}-Rank` : null,
            skill.minDiscoveries > 0
                ? `${skill.minDiscoveries} ${skill.minDiscoveries === 1 ? 'secret' : 'secrets'}`
                : null,
        ]
            .filter(Boolean)
            .join(' · ')

    return (
        <Card header={{ content: <h4>Skills</h4> }} bodyClass="p-0">
            <p className="p-5 pb-4 text-sm text-gray-500 md:p-6 md:pb-4 dark:text-gray-400">
                Skills never work on exams, homework or boss battles, and only on activities whose teacher allows
                skills. The server checks every use.
            </p>
            {skills ? (
                <div className="overflow-x-auto">
                    <Table>
                        <THead>
                            <Tr>
                                <Th>Skill</Th>
                                <Th>Unlocks at</Th>
                                <Th>Charges</Th>
                                <Th>Works on</Th>
                                <Th>
                                    <span className="sr-only">Actions</span>
                                </Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {skills.map((skill) => (
                                <Tr key={skill.id}>
                                    <Td>
                                        <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                                            {skill.name}
                                            <Tag className={rarityTagClass[skill.rarity]}>
                                                {rarityLabel[skill.rarity]}
                                            </Tag>
                                            {!skill.enabled && <Tag>Disabled</Tag>}
                                        </div>
                                        <div className="max-w-md text-xs text-gray-500">{skill.description}</div>
                                    </Td>
                                    <Td className="whitespace-nowrap">{unlockText(skill)}</Td>
                                    <Td className="whitespace-nowrap">
                                        {skill.passive ? 'Passive' : `${skill.charges} per ${skill.rechargeHours} h`}
                                    </Td>
                                    <Td className="text-xs">
                                        {skill.passive
                                            ? 'Always on'
                                            : skill.eligibleKinds.length
                                              ? skill.eligibleKinds.map((k) => activityKindLabel[k]).join(', ')
                                              : 'Anywhere (not in an activity)'}
                                    </Td>
                                    <Td className="text-right">
                                        <Button
                                            size="xs"
                                            variant="plain"
                                            icon={<EditIcon />}
                                            aria-label={`Edit ${skill.name}`}
                                            onClick={() => setEditing(skill)}
                                        />
                                    </Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                </div>
            ) : error ? (
                <ErrorState message={error} onRetry={() => void refresh()} />
            ) : (
                <Loading loading message="Loading skills…" />
            )}
            <SkillDialog skill={editing} ranks={ranks} onClose={() => setEditing(null)} />
        </Card>
    )
}
