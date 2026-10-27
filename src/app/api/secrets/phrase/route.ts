import { apiAuthHandler, readJsonBody } from '@/server/routes/api'
import { enforceRateLimit } from '@/server/security/rateLimit'
import { getJsonResponse } from '@/server/utils/response'
import { speakPhrase } from '@/server/actions/secrets'
import { SpeakPhraseSchema } from '@/@types/game/Secrets'

/** A phrase typed in the Codex */
export const POST = apiAuthHandler('play', async (req, _ctx, user) => {
    const { phrase } = SpeakPhraseSchema.parse(await readJsonBody(req))
    // Phrases can't be brute-forced: a few guesses a minute
    await enforceRateLimit('phrasePerUser', user.id)
    return getJsonResponse({ discoveries: await speakPhrase(user, phrase) })
})
