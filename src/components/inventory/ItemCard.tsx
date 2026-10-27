import Tag from '@/components/ui/Tag'
import classNames from '@/utils/classNames'
import navigationIcon, { ItemIcon } from '@/configs/icons.config'
import { rarityLabel, rarityTagClass, type InventoryEntry } from '@/@types/game/Inventory'
import { rarityBorderClass } from './rarity'

const BUNNY_HELP =
    'Spend one during a practice quiz to skip a question. Skipped questions don’t count for or against you. Never usable on exams.'

/** One item the student holds, with how many charges are left */
export default function ItemCard({ entry }: { entry: InventoryEntry }) {
    const { item, charges } = entry
    const bunny = item.effect === 'bunny_skip'
    return (
        <article
            className={classNames(
                'flex h-full flex-col gap-3 rounded-2xl border-2 bg-white p-4 dark:bg-gray-800',
                rarityBorderClass[item.rarity],
            )}
        >
            <div className="flex items-start gap-3">
                <span
                    className={classNames(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl',
                        rarityTagClass[item.rarity],
                    )}
                    aria-hidden
                >
                    {bunny ? navigationIcon.easter : <ItemIcon />}
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    <Tag className={classNames('mt-1', rarityTagClass[item.rarity])}>{rarityLabel[item.rarity]}</Tag>
                </div>
                <div className="text-right">
                    <div className="font-display text-2xl tabular-nums">×{charges}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.kind === 'consumable' ? (charges === 1 ? 'charge' : 'charges') : 'held'}
                    </div>
                </div>
            </div>
            {item.description && <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p>}
            {bunny && (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                    {BUNNY_HELP}
                </p>
            )}
        </article>
    )
}
