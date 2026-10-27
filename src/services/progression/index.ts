import useSWR, { type SWRConfiguration } from 'swr'
import api, { type ApiOptions } from '@/services/api'
import { ensureQuest } from '@/services/activities'
import { tryParseDate } from '@/utils/parse'
import type { Collection } from '@/@types/common'
import type { PlayerStatus } from '@/@types/progression/PlayerStatus'
import type {
    ProgressionSettings,
    Rank,
    RankHistoryEntry,
    RewardSummary,
    XpLedgerEntry,
    XpRule,
} from '@/@types/progression/Progression'
import type { SaveProgressionConfigInput, XpAdjustmentInput } from '@/@types/progression/ProgressionSchema'

export const playerStatusUrl = '/me/status'
export const getXpHistoryUrl = (page: number) => `/me/xp-history?page=${page}`
export const rankHistoryUrl = '/me/rank-history'
export const progressionConfigUrl = '/admin/progression'

export interface ProgressionConfig {
    settings: ProgressionSettings
    ranks: Rank[]
    xpRules: XpRule[]
}

export const ensureLedgerEntry = (entry: XpLedgerEntry): XpLedgerEntry => ({
    ...entry,
    createdAt: tryParseDate(entry.createdAt) as Date,
})

export const ensurePlayerStatus = (status: PlayerStatus): PlayerStatus => ({
    ...status,
    recentRewards: status.recentRewards.map(ensureLedgerEntry),
    recommended: status.recommended ? ensureQuest(status.recommended) : null,
})

export const apiGetPlayerStatus = async (apiOptions?: ApiOptions) =>
    ensurePlayerStatus(await api.fetchJson<PlayerStatus>({ ...apiOptions, method: 'get', url: playerStatusUrl }))

export const useSWRPlayerStatus = (enabled: boolean, config?: SWRConfiguration<PlayerStatus>) =>
    useSWR(enabled ? playerStatusUrl : null, () => apiGetPlayerStatus(), config)

export const apiGetXpHistory = async (page: number) => {
    const result = await api.fetchJson<Collection<XpLedgerEntry>>({ method: 'get', url: getXpHistoryUrl(page) })
    return { ...result, records: result.records.map(ensureLedgerEntry) }
}

export const useSWRXpHistory = (page: number, config?: SWRConfiguration<Collection<XpLedgerEntry>>) =>
    useSWR(getXpHistoryUrl(page), () => apiGetXpHistory(page), { keepPreviousData: true, ...config })

export const apiGetRankHistory = async () =>
    (await api.fetchJson<RankHistoryEntry[]>({ method: 'get', url: rankHistoryUrl })).map((e) => ({
        ...e,
        createdAt: tryParseDate(e.createdAt) as Date,
    }))

export const useSWRRankHistory = (config?: SWRConfiguration<RankHistoryEntry[]>) =>
    useSWR(rankHistoryUrl, apiGetRankHistory, config)

// ── Administration ──

export const apiGetProgressionConfig = () =>
    api.fetchJson<ProgressionConfig>({ method: 'get', url: progressionConfigUrl })

export const useSWRProgressionConfig = (config?: SWRConfiguration<ProgressionConfig>) =>
    useSWR(progressionConfigUrl, apiGetProgressionConfig, config)

export const apiSaveProgressionConfig = (input: SaveProgressionConfigInput) =>
    api.fetchJson<ProgressionConfig & { recalculated: number }>({
        method: 'put',
        url: progressionConfigUrl,
        data: input,
    })

/** `requestId` is created when the dialog opens so a retry applies the adjustment once */
export const apiAdjustXp = (input: XpAdjustmentInput & { requestId: string }) =>
    api.fetchJson<RewardSummary>({ method: 'post', url: '/admin/xp-adjustments', data: input })
