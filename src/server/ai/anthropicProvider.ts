import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod/v4'
import { DRAFTABLE_KINDS, draftableKindLabel } from '@/@types/ai/QuestionDrafts'
import type { DraftRequest, DraftResponse, QuestionDraftProvider } from './QuestionDraftProvider'

/*
 * Claude as a question-drafting provider. Structured outputs (zod) guarantee the response shape; the
 * server-side refusal fallback keeps a request going if the model declines. ANTHROPIC_API_KEY enables
 * it; AI_DRAFT_MODEL overrides the model.
 */

const DEFAULT_MODEL = 'claude-opus-5-5'

/** The response shape (zod 4, which the SDK's structured-output helper uses); mirrors AiDraftedQuestionSchema */
const OutputSchema = z.object({
    questions: z.array(
        z.object({
            kind: z.enum(DRAFTABLE_KINDS),
            prompt: z.string(),
            points: z.number().int(),
            options: z.array(z.string()),
            correctOptionIndexes: z.array(z.number().int()),
            acceptedAnswers: z.array(z.string()),
            explanation: z.string(),
            rubric: z.string(),
            objective: z.string(),
        }),
    ),
})

const SYSTEM = `You write assessment questions for teachers at a school. Students may be children, so keep content age-appropriate, clear and kind.

Draft questions only from the source material provided: every correct answer must be supported by it. Do not invent facts.

Rules for each question:
- prompt: one clear question in plain language (Markdown allowed for small formatting).
- single_choice: 3–5 options, exactly one correct. multiple_choice: 4–6 options, two or more correct. Distractors should be plausible but clearly wrong given the source.
- true_false: options exactly ["True", "False"], one correct.
- short_answer: no options; list every reasonable accepted answer (e.g. "photosynthesis", "Photosynthesis process").
- essay: no options or accepted answers; a rubric listing what a full-marks answer includes.
- correctOptionIndexes are 0-based positions in options; empty for short_answer and essay.
- explanation: 1–3 sentences on why the answer is right, shown to students after they answer.
- points: 1 for quick questions, 2–3 for harder ones, 4–10 for essays.
- objective: copy exactly one of the given learning objectives the question checks, or "" if none fit.

Vary which option is correct and avoid "all of the above" / "none of the above".`

export class AnthropicDraftProvider implements QuestionDraftProvider {
    readonly name = 'anthropic'
    readonly model: string
    private readonly client: Anthropic

    constructor(apiKey: string, model = DEFAULT_MODEL) {
        this.client = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 2 })
        this.model = model
    }

    async draft(request: DraftRequest): Promise<DraftResponse> {
        const kinds = request.kinds.map((k) => `${k} (${draftableKindLabel[k]})`).join(', ')
        const objectives = request.objectives.length
            ? request.objectives.map((o) => `- ${o}`).join('\n')
            : '(none given — use "")'

        const response = await this.client.beta.messages.parse({
            model: this.model,
            max_tokens: 16000,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            output_config: { effort: 'medium', format: betaZodOutputFormat(OutputSchema) },
            system: SYSTEM,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `<source title="${escapeAttr(request.activityTitle)}" subject="${escapeAttr(request.subjectName)}">\n${request.sourceText}\n</source>`,
                        },
                        {
                            type: 'text',
                            text: `Draft exactly ${request.count} question(s).\nAllowed types (mix them): ${kinds}.\nDifficulty: ${request.difficulty} on a 1 (easy recall) to 5 (challenging reasoning) scale.\nLearning objectives:\n${objectives}`,
                        },
                    ],
                },
            ],
        })

        const usage = {
            inputTokens: response.usage.input_tokens ?? null,
            outputTokens: response.usage.output_tokens ?? null,
        }
        if (response.stop_reason === 'refusal') return { questions: [], usage, refused: true }
        return { questions: response.parsed_output?.questions ?? [], usage }
    }
}

const escapeAttr = (value: string) => value.replace(/["<>]/g, '')
