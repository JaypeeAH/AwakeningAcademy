import type { Rarity } from '@/@types/game/Inventory'

/** Outline colour per rarity, for item cards and Codex silhouettes (gold is kept for the rarest) */
export const rarityBorderClass: Record<Rarity, string> = {
    common: 'border-gray-200 dark:border-gray-600',
    uncommon: 'border-success',
    rare: 'border-primary',
    epic: 'border-error',
    legendary: 'border-gold',
}
