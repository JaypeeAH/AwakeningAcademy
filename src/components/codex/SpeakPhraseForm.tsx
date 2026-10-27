'use client'

import { useState, type FormEvent } from 'react'
import { useSWRConfig } from 'swr'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { toastError } from '@/components/ui/toast/toast'
import SystemPanel from '@/components/game/SystemPanel'
import DiscoveryDialog from '@/components/game/DiscoveryDialog'
import { SparkleIcon } from '@/configs/icons.config'
import { apiSpeakPhrase, inventoryUrl, skillBookUrl } from '@/services/game'
import { playerStatusUrl } from '@/services/progression'
import { useCodexStore } from '@/stores/GameStores'
import type { Discovery } from '@/@types/game/Secrets'

/**
 * Some secrets open with a phrase heard in class or hidden in a lesson. Case, spacing and punctuation
 * don't matter; the server compares a fingerprint, so a phrase is never revealed by guessing wrong.
 */
export default function SpeakPhraseForm() {
    const { mutate } = useSWRConfig()
    const refreshCodex = useCodexStore((s) => s.refresh)
    const [phrase, setPhrase] = useState('')
    const [speaking, setSpeaking] = useState(false)
    const [silence, setSilence] = useState(false)
    const [discoveries, setDiscoveries] = useState<Discovery[]>([])

    const speak = async (event: FormEvent) => {
        event.preventDefault()
        if (!phrase.trim()) return
        setSpeaking(true)
        setSilence(false)
        try {
            const found = await apiSpeakPhrase(phrase)
            if (found.length) {
                setDiscoveries(found)
                setPhrase('')
                await Promise.all([refreshCodex(), mutate(inventoryUrl), mutate(skillBookUrl), mutate(playerStatusUrl)])
            } else {
                setSilence(true)
            }
        } catch (error) {
            toastError('The Codex couldn’t listen just now. Try again.', error)
        } finally {
            setSpeaking(false)
        }
    }

    return (
        <SystemPanel eyebrow="Incantation" title="Speak a secret phrase" tone="gold">
            <form onSubmit={speak} className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex-1">
                    <label htmlFor="secret-phrase" className="sr-only">
                        Secret phrase
                    </label>
                    <Input
                        id="secret-phrase"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={100}
                        placeholder="Heard a phrase in class? Type it here…"
                        value={phrase}
                        onChange={(e) => {
                            setPhrase(e.target.value)
                            setSilence(false)
                        }}
                    />
                </div>
                <Button
                    type="submit"
                    variant="solid"
                    icon={<SparkleIcon />}
                    loading={speaking}
                    disabled={!phrase.trim()}
                >
                    Speak
                </Button>
            </form>
            <p aria-live="polite" className="mt-2 min-h-5 text-sm text-gray-500 dark:text-gray-400">
                {silence && 'Nothing stirs… try another phrase.'}
            </p>
            <DiscoveryDialog discoveries={discoveries} onClose={() => setDiscoveries([])} />
        </SystemPanel>
    )
}
