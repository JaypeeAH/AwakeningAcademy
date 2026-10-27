/**
 * Visual identity of each rank (original emblems — see components/game/RankEmblem). Ranks are data
 * (admins can rename them), so unknown codes fall back to the F-Rank look.
 */
export type RankTone = 'iron' | 'jade' | 'tide' | 'azure' | 'violet' | 'crimson' | 'gold' | 'radiant' | 'prismatic'

export const rankTone: Record<string, RankTone> = {
    F: 'iron',
    E: 'jade',
    D: 'tide',
    C: 'azure',
    B: 'violet',
    A: 'crimson',
    S: 'gold',
    SS: 'radiant',
    SSS: 'prismatic',
}

export const getRankTone = (code: string | null | undefined): RankTone => (code && rankTone[code]) || 'iron'

/** Tag classes for a rank label (CSS for `rank-tone-*` lives in assets/styles/game/_ranks.css) */
export const rankTagClass = (code: string | null | undefined) => `rank-tag rank-tone-${getRankTone(code)}`
