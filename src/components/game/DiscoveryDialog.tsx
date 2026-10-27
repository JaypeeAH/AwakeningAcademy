'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import LinkButton from '@/components/ui/LinkButton'
import Tag from '@/components/ui/Tag'
import MarkdownContent from '@/components/shared/MarkdownContent'
import { XpReward } from './GameTags'
import navigationIcon, { ItemIcon, LevelIcon, SparkleIcon } from '@/configs/icons.config'
import { codexPath } from '@/configs/app.config'
import { rarityLabel, rarityTagClass } from '@/@types/game/Inventory'
import type { Discovery } from '@/@types/game/Secrets'

interface DiscoveryDialogProps {
    /** Shown one after another; nothing renders while empty */
    discoveries: Discovery[]
    onClose: () => void
}

/**
 * "Secret discovered!" — what was found, its lore, and what it gave (XP via the progression engine,
 * items into the inventory). Several discoveries are shown one at a time.
 */
export default function DiscoveryDialog({ discoveries, onClose }: DiscoveryDialogProps) {
    const reduceMotion = useReducedMotion()
    const [index, setIndex] = useState(0)
    const discovery = discoveries[index]
    if (!discovery) return null
    const last = index >= discoveries.length - 1
    const next = () => {
        if (last) {
            setIndex(0)
            onClose()
        } else setIndex(index + 1)
    }
    const reward = discovery.reward

    return (
        <Dialog isOpen onClose={next} onRequestClose={next} width={480} contentClassName="overflow-hidden">
            <div className="reward-dialog flex flex-col items-center text-center" key={discovery.eggId}>
                <div className="system-eyebrow">
                    <SparkleIcon className="mr-1 inline" aria-hidden />
                    Secret discovered{discoveries.length > 1 ? ` · ${index + 1} of ${discoveries.length}` : ''}
                </div>
                <motion.div
                    className="mt-3 text-5xl text-gold"
                    aria-hidden
                    {...(reduceMotion
                        ? {}
                        : {
                              initial: { opacity: 0, scale: 0.5, rotate: -12 },
                              animate: { opacity: 1, scale: 1, rotate: 0 },
                              transition: { duration: 0.5, ease: 'easeOut' as const },
                          })}
                >
                    {navigationIcon.easter}
                </motion.div>
                <h3 className="font-display mt-2 text-2xl">{discovery.title}</h3>
                <Tag className={`mt-2 ${rarityTagClass[discovery.rarity]}`}>{rarityLabel[discovery.rarity]}</Tag>

                {discovery.reveal && (
                    <div className="mt-4 max-h-60 w-full overflow-y-auto rounded-xl bg-gray-50 p-4 text-left text-sm dark:bg-gray-900">
                        <MarkdownContent>{discovery.reveal}</MarkdownContent>
                    </div>
                )}

                {(reward?.xpGained ?? 0) > 0 && (
                    <div className="mt-4 text-2xl">
                        <XpReward amount={reward!.xpGained} />
                    </div>
                )}
                {discovery.items.length > 0 && (
                    <ul className="mt-3 w-full space-y-1 text-sm">
                        {discovery.items.map((item) => (
                            <li
                                key={item.name}
                                className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-1.5 dark:bg-gray-900"
                            >
                                <span className="flex items-center gap-1.5">
                                    <ItemIcon aria-hidden className="text-primary" /> {item.name}
                                </span>
                                <strong>+{item.charges}</strong>
                            </li>
                        ))}
                    </ul>
                )}
                {reward?.leveledUp && (
                    <p className="mt-4 flex items-center gap-1.5 font-semibold text-primary">
                        <LevelIcon aria-hidden /> Level {reward.before.level} → {reward.after.level}
                    </p>
                )}

                <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
                    <LinkButton href={codexPath} onClick={onClose}>
                        Open the Codex
                    </LinkButton>
                    <Button variant="solid" onClick={next} autoFocus>
                        {last ? 'Continue' : 'Next secret'}
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}
